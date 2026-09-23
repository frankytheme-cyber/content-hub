import Redis from 'ioredis'
import { randomBytes } from 'crypto'
import { Telegram, esc } from './telegram'
import { Hub, type ArticoloDetail, type VersioneDetail } from './hub'

/**
 * Segue i job della pipeline e riporta il progresso su Telegram.
 *
 * La pipeline pubblica già gli eventi su Redis (`job:<id>`) per la rotta SSE
 * della web UI: qui ci si aggancia allo stesso canale invece di fare polling.
 * Una sola connessione in pattern-subscribe copre tutti i job insieme.
 *
 * Il registro di chi segue cosa vive in Redis, non in memoria: se il bot viene
 * riavviato mentre un articolo è in generazione, al riavvio ritrova il job e
 * consegna comunque il risultato.
 */

const PREFISSO_WATCH = 'bot:watch:'
const PREFISSO_AZIONE = 'bot:azione:'
const TTL_WATCH = 24 * 60 * 60
const TTL_AZIONE = 7 * 24 * 60 * 60

export interface Osservato {
  chatId: number
  messageId: number
  tipo: 'articolo' | 'aggiornamento'
  etichetta: string
}

export type Azione =
  | {
      tipo: 'pubblica'
      articoloId: string
      versioneId: string
      wpSiteUrl: string
      stato: 'draft' | 'publish'
    }
  | { tipo: 'applica-aggiornamento'; articoloId: string; versioneId: string }
  | { tipo: 'riprendi'; jobId: string; chatId: number; etichetta: string }

const FASI: Record<string, string> = {
  ricerca: 'Ricerca fonti',
  generazione: 'Generazione',
  revisione: 'Revisione',
  immagini: 'Immagine',
  seo: 'SEO e GEO',
  salvataggio: 'Salvataggio',
  recupero: 'Recupero da WordPress',
  aggiornamento: 'Riscrittura',
  completato: 'Completato',
  errore: 'Errore',
}

function barra(progresso: number): string {
  const totale = 16
  const pieni = Math.max(0, Math.min(totale, Math.round((progresso / 100) * totale)))
  return '▓'.repeat(pieni) + '░'.repeat(totale - pieni)
}

export function rendiProgresso(etichetta: string, fase: string, progresso: number, messaggio: string): string {
  return [
    `<b>${esc(etichetta)}</b>`,
    '',
    `<code>${barra(progresso)}</code> ${progresso}%`,
    `${esc(FASI[fase] ?? fase)} — ${esc(messaggio)}`,
  ].join('\n')
}

interface EventoJob {
  jobId: string
  fase: string
  progresso: number
  messaggio: string
}

export class Monitor {
  private sub: Redis | null = null

  constructor(
    private readonly redis: Redis,
    private readonly redisUrl: string,
    private readonly tg: Telegram,
    private readonly hub: Hub
  ) {}

  // ─── Registro ──────────────────────────────────────────────────────────────

  async osserva(jobId: string, dati: Osservato): Promise<void> {
    await this.redis.set(PREFISSO_WATCH + jobId, JSON.stringify(dati), 'EX', TTL_WATCH)
  }

  private async leggiOsservato(jobId: string): Promise<Osservato | null> {
    const raw = await this.redis.get(PREFISSO_WATCH + jobId)
    return raw ? (JSON.parse(raw) as Osservato) : null
  }

  /**
   * I callback_data di Telegram stanno in 64 byte: due cuid non ci entrano.
   * Si salva il payload e si manda in giro solo un token corto.
   */
  async registraAzione(azione: Azione): Promise<string> {
    const token = randomBytes(6).toString('hex')
    await this.redis.set(PREFISSO_AZIONE + token, JSON.stringify(azione), 'EX', TTL_AZIONE)
    return token
  }

  async leggiAzione(token: string): Promise<Azione | null> {
    const raw = await this.redis.get(PREFISSO_AZIONE + token)
    return raw ? (JSON.parse(raw) as Azione) : null
  }

  // ─── Avvio ─────────────────────────────────────────────────────────────────

  async avvia(): Promise<void> {
    this.sub = new Redis(this.redisUrl, { maxRetriesPerRequest: null })

    this.sub.on('pmessage', (_pattern: string, canale: string, payload: string) => {
      const jobId = canale.slice('job:'.length)
      this.gestisciEvento(jobId, payload).catch((err) => {
        console.error(`[monitor] evento ${jobId}:`, err instanceof Error ? err.message : err)
      })
    })

    this.sub.on('error', (err: Error) => console.error('[monitor] redis:', err.message))

    await this.sub.psubscribe('job:*')
    console.log('[monitor] in ascolto su job:*')

    await this.recuperaOrfani()
  }

  /**
   * Job che hanno cambiato stato mentre il bot era spento: l'evento Redis è
   * andato perso, quindi lo stato va richiesto all'API una volta sola.
   */
  private async recuperaOrfani(): Promise<void> {
    const chiavi: string[] = []
    let cursore = '0'
    do {
      const [prossimo, trovate] = await this.redis.scan(cursore, 'MATCH', `${PREFISSO_WATCH}*`, 'COUNT', 100)
      cursore = prossimo
      chiavi.push(...trovate)
    } while (cursore !== '0')

    if (chiavi.length === 0) return
    console.log(`[monitor] ${chiavi.length} job da ricontrollare dopo il riavvio`)

    for (const chiave of chiavi) {
      const jobId = chiave.slice(PREFISSO_WATCH.length)
      try {
        const job = await this.hub.statoJob(jobId)
        if (job.stato === 'COMPLETATO') {
          await this.gestisciEvento(jobId, JSON.stringify({
            jobId, fase: 'completato', progresso: 100, messaggio: 'Completato mentre il bot era offline.',
          }))
        } else if (job.stato === 'FALLITO') {
          await this.gestisciEvento(jobId, JSON.stringify({
            jobId, fase: 'errore', progresso: 0, messaggio: job.errore ?? 'Job fallito.',
          }))
        }
      } catch (err) {
        console.warn(`[monitor] recupero ${jobId} fallito:`, err instanceof Error ? err.message : err)
      }
    }
  }

  async ferma(): Promise<void> {
    if (this.sub) {
      await this.sub.quit()
      this.sub = null
    }
  }

  // ─── Eventi ────────────────────────────────────────────────────────────────

  private async gestisciEvento(jobId: string, payload: string): Promise<void> {
    const osservato = await this.leggiOsservato(jobId)
    if (!osservato) return // job avviato dalla web UI: non ci riguarda

    const evento = JSON.parse(payload) as EventoJob

    if (evento.fase === 'completato') {
      await this.redis.del(PREFISSO_WATCH + jobId)
      await this.consegna(jobId, osservato, evento)
      return
    }

    if (evento.fase === 'errore') {
      await this.redis.del(PREFISSO_WATCH + jobId)
      const token = await this.registraAzione({
        tipo: 'riprendi', jobId, chatId: osservato.chatId, etichetta: osservato.etichetta,
      })
      await this.tg.editMessageText(
        osservato.chatId,
        osservato.messageId,
        `❌ <b>${esc(osservato.etichetta)}</b>\n\n${esc(evento.messaggio)}`,
        { keyboard: [[{ text: '↻ Riprendi dal checkpoint', callback_data: `a:${token}` }]] }
      )
      return
    }

    await this.tg.editMessageText(
      osservato.chatId,
      osservato.messageId,
      rendiProgresso(osservato.etichetta, evento.fase, evento.progresso, evento.messaggio)
    )
  }

  // ─── Consegna ──────────────────────────────────────────────────────────────

  private async consegna(jobId: string, osservato: Osservato, evento: EventoJob): Promise<void> {
    const { chatId, messageId } = osservato

    await this.tg.editMessageText(
      chatId,
      messageId,
      `✅ <b>${esc(osservato.etichetta)}</b>\n\n<code>${barra(100)}</code> 100%\n${esc(evento.messaggio)}`
    )

    let articolo: ArticoloDetail
    try {
      const job = await this.hub.statoJob(jobId)
      const articoli = await this.hub.articoliPerSessione(job.sessionId)
      if (articoli.length === 0) {
        await this.tg.sendMessage(chatId, '⚠️ Job completato ma nessun articolo trovato in archivio.')
        return
      }
      articolo = await this.hub.articolo(articoli[0].id)
    } catch (err) {
      await this.tg.sendMessage(
        chatId,
        `⚠️ Articolo generato ma non recuperabile: ${esc(err instanceof Error ? err.message : String(err))}`
      )
      return
    }

    const wpSiteUrl = articolo.session.sito?.wpSiteUrl ?? undefined

    for (const versione of articolo.versioni) {
      await this.inviaVersione(chatId, articolo, versione, osservato.tipo, wpSiteUrl)
    }
  }

  private async inviaVersione(
    chatId: number,
    articolo: ArticoloDetail,
    versione: VersioneDetail,
    tipo: Osservato['tipo'],
    wpSiteUrl: string | undefined
  ): Promise<void> {
    const seo = versione.seoJson ?? {}
    const geo = (seo.diagnosiGeo ?? {}) as { punteggio?: number; parole?: number; mancanti?: string[] }

    const nomeFile = `${articolo.slug || 'articolo'}${articolo.versioni.length > 1 ? `-${versione.indice + 1}` : ''}.md`
    const corpo = `# ${articolo.titolo}\n\n${versione.corpo}\n`

    await this.tg.sendDocument(
      chatId,
      nomeFile,
      corpo,
      `<b>${esc(articolo.titolo)}</b>\nTono: ${esc(versione.tono)} · Punteggio ${versione.punteggio ?? '—'}/100`
    )

    const righe = [
      `<b>Metadati SEO</b>`,
      `Title: ${esc(String(seo.metaTitolo ?? '—'))} <i>(${String(seo.metaTitolo ?? '').length}/60)</i>`,
      `Description: ${esc(String(seo.metaDescrizione ?? '—'))} <i>(${String(seo.metaDescrizione ?? '').length}/160)</i>`,
      `Slug: <code>${esc(String(seo.slug ?? '—'))}</code>`,
      `Keyword: ${esc(String(seo.keywordPrincipale ?? '—'))}`,
      `Secondarie: ${esc((Array.isArray(seo.keywordSecondarie) ? seo.keywordSecondarie : []).join(', ') || '—')}`,
      '',
      `<b>GEO</b> ${geo.punteggio ?? '—'}/100 · ${geo.parole ?? '—'} parole`,
    ]

    if (geo.mancanti?.length) {
      righe.push('Controlli non superati:')
      righe.push(...geo.mancanti.slice(0, 6).map((m) => `· ${esc(m)}`))
    }

    if (versione.immagineUrl) righe.push('', `<a href="${esc(versione.immagineUrl)}">Immagine di copertina</a>`)

    const tastiera: { text: string; callback_data: string }[][] = []

    if (tipo === 'aggiornamento' && articolo.session.wpPostId) {
      const token = await this.registraAzione({
        tipo: 'applica-aggiornamento',
        articoloId: articolo.id,
        versioneId: versione.id,
      })
      tastiera.push([{ text: '↑ Applica su WordPress', callback_data: `a:${token}` }])
    } else if (wpSiteUrl) {
      const bozza = await this.registraAzione({
        tipo: 'pubblica', articoloId: articolo.id, versioneId: versione.id, wpSiteUrl, stato: 'draft',
      })
      const pubblica = await this.registraAzione({
        tipo: 'pubblica', articoloId: articolo.id, versioneId: versione.id, wpSiteUrl, stato: 'publish',
      })
      tastiera.push([
        { text: '📄 Salva come bozza', callback_data: `a:${bozza}` },
        { text: '🌐 Pubblica', callback_data: `a:${pubblica}` },
      ])
    } else {
      righe.push('', '<i>Nessun sito WordPress collegato: pubblicazione non disponibile.</i>')
    }

    await this.tg.sendMessage(chatId, righe.join('\n'), {
      keyboard: tastiera.length ? tastiera : undefined,
    })
  }
}
