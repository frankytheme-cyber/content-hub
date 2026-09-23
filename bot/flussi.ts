import { Telegram, esc, type InlineKeyboard } from './telegram'
import { Hub, type Sito, type WpPost, type LinkInterno, type CreaArticoloBody } from './hub'
import { Monitor, rendiProgresso } from './monitor'

/**
 * Flussi conversazionali del bot.
 *
 * Lo stato di una conversazione vive in memoria: è effimero per natura (dura
 * i secondi della compilazione) e un riavvio del bot lo azzera senza
 * conseguenze. Lo stato che conta — i job in corso — sta invece in Postgres e
 * nel registro Redis del Monitor, quindi sopravvive.
 */

type TipoArticolo = 'standard' | 'recensione' | 'sistema' | 'biografia'

const ETICHETTE_TIPO: Record<TipoArticolo, string> = {
  standard: 'Articolo standard',
  recensione: 'Recensione prodotto',
  sistema: 'Guida impianto',
  biografia: 'Biografia artista',
}

interface BozzaArticolo {
  sito?: Sito
  tipo?: TipoArticolo
  categoria?: string
  argomento?: string
  linkAmazon?: string
  sistemaCategorie?: string[]
  fonti: string[]
  linkInterni: LinkInterno[]
}

interface BozzaAggiornamento {
  sito?: Sito
  post?: WpPost
  focus?: string
  tipoArticolo: 'standard' | 'biografia'
}

export type Stato =
  | { flusso: 'articolo'; passo: 'sito' | 'tipo' | 'categoria' | 'argomento' | 'amazon' | 'componenti' | 'fonti' | 'link' | 'conferma'; dati: BozzaArticolo }
  | { flusso: 'aggiorna'; passo: 'sito' | 'cerca' | 'scelta' | 'focus' | 'conferma'; dati: BozzaAggiornamento; risultati?: WpPost[] }
  | { flusso: 'link'; passo: 'sito' | 'conferma'; sito?: Sito }

const CACHE_POST_MS = 10 * 60 * 1000

export class Flussi {
  private stati = new Map<number, Stato>()
  private cachePost = new Map<string, { quando: number; posts: WpPost[] }>()
  private cacheSiti: { quando: number; siti: Sito[] } | null = null

  constructor(
    private readonly tg: Telegram,
    private readonly hub: Hub,
    private readonly monitor: Monitor
  ) {}

  stato(chatId: number): Stato | undefined {
    return this.stati.get(chatId)
  }

  annulla(chatId: number): boolean {
    return this.stati.delete(chatId)
  }

  private async siti(): Promise<Sito[]> {
    if (this.cacheSiti && Date.now() - this.cacheSiti.quando < CACHE_POST_MS) return this.cacheSiti.siti
    const siti = await this.hub.siti()
    this.cacheSiti = { quando: Date.now(), siti }
    return siti
  }

  private tastieraSiti(siti: Sito[], prefisso: string): InlineKeyboard {
    return siti.map((s) => [{ text: s.nome, callback_data: `${prefisso}:${s.id}` }])
  }

  // ─── /articolo ─────────────────────────────────────────────────────────────

  async avviaArticolo(chatId: number): Promise<void> {
    const siti = await this.siti()
    if (siti.length === 0) {
      await this.tg.sendMessage(chatId, 'Nessun sito configurato. Esegui il seed del database.')
      return
    }

    this.stati.set(chatId, { flusso: 'articolo', passo: 'sito', dati: { fonti: [], linkInterni: [] } })

    if (siti.length === 1) {
      await this.scegliSito(chatId, siti[0])
      return
    }

    await this.tg.sendMessage(chatId, '<b>Nuovo articolo</b>\nPer quale sito?', {
      keyboard: this.tastieraSiti(siti, 'art-sito'),
    })
  }

  async scegliSito(chatId: number, sito: Sito): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'articolo') return

    stato.dati.sito = sito
    stato.passo = 'tipo'

    await this.tg.sendMessage(chatId, `Sito: <b>${esc(sito.nome)}</b>\nChe tipo di articolo?`, {
      keyboard: [
        [{ text: 'Standard', callback_data: 'art-tipo:standard' }],
        [{ text: 'Recensione prodotto', callback_data: 'art-tipo:recensione' }],
        [{ text: 'Guida impianto', callback_data: 'art-tipo:sistema' }],
        [{ text: 'Biografia artista', callback_data: 'art-tipo:biografia' }],
      ],
    })
  }

  async scegliTipo(chatId: number, tipo: TipoArticolo): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'articolo') return

    stato.dati.tipo = tipo
    stato.passo = 'categoria'

    const categorie = stato.dati.sito?.categorie ?? []
    if (categorie.length === 0) {
      stato.dati.categoria = 'generale'
      stato.passo = 'argomento'
      await this.chiediArgomento(chatId, tipo)
      return
    }

    await this.tg.sendMessage(chatId, `Tipo: <b>${esc(ETICHETTE_TIPO[tipo])}</b>\nCategoria?`, {
      keyboard: categorie.map((c, i) => [{ text: c, callback_data: `art-cat:${i}` }]),
    })
  }

  async scegliCategoria(chatId: number, indice: number): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'articolo') return

    const categoria = stato.dati.sito?.categorie[indice]
    if (!categoria) return

    stato.dati.categoria = categoria
    stato.passo = 'argomento'
    await this.chiediArgomento(chatId, stato.dati.tipo!)
  }

  private async chiediArgomento(chatId: number, tipo: TipoArticolo): Promise<void> {
    const richiesta: Record<TipoArticolo, string> = {
      standard: 'Qual è l\'argomento dell\'articolo?',
      recensione: 'Quale prodotto? Scrivi marca e modello.',
      sistema: 'Che impianto? Es. "impianto vinile entry level sotto i 1500 euro".',
      biografia: 'Quale artista?',
    }
    await this.tg.sendMessage(chatId, richiesta[tipo])
  }

  /** Ritorna true se il testo è stato consumato da un flusso attivo. */
  async testo(chatId: number, testo: string): Promise<boolean> {
    const stato = this.stati.get(chatId)
    if (!stato) return false

    const salta = testo.trim().toLowerCase() === '/salta'

    if (stato.flusso === 'articolo') return this.testoArticolo(chatId, stato, testo, salta)
    if (stato.flusso === 'aggiorna') return this.testoAggiornamento(chatId, stato, testo, salta)
    return false
  }

  private async testoArticolo(
    chatId: number,
    stato: Extract<Stato, { flusso: 'articolo' }>,
    testo: string,
    salta: boolean
  ): Promise<boolean> {
    const d = stato.dati

    switch (stato.passo) {
      case 'argomento': {
        if (testo.trim().length < 3) {
          await this.tg.sendMessage(chatId, 'Troppo corto: servono almeno 3 caratteri.')
          return true
        }
        d.argomento = testo.trim()

        if (d.tipo === 'recensione') {
          stato.passo = 'amazon'
          await this.tg.sendMessage(chatId, 'Link Amazon del prodotto?')
          return true
        }
        if (d.tipo === 'sistema') {
          stato.passo = 'componenti'
          await this.tg.sendMessage(
            chatId,
            'Quali componenti deve includere?\nSeparali con virgola: <i>giradischi, testina, phono stage, amplificatore, diffusori</i>'
          )
          return true
        }
        stato.passo = 'fonti'
        await this.chiediFonti(chatId)
        return true
      }

      case 'amazon': {
        const url = testo.trim()
        if (!/^https?:\/\//i.test(url)) {
          await this.tg.sendMessage(chatId, 'Serve un URL che inizi per http. Riprova.')
          return true
        }
        d.linkAmazon = url
        stato.passo = 'fonti'
        await this.chiediFonti(chatId)
        return true
      }

      case 'componenti': {
        const componenti = testo.split(',').map((c) => c.trim()).filter(Boolean)
        if (componenti.length === 0) {
          await this.tg.sendMessage(chatId, 'Serve almeno un componente.')
          return true
        }
        d.sistemaCategorie = componenti
        stato.passo = 'fonti'
        await this.chiediFonti(chatId)
        return true
      }

      case 'fonti': {
        if (!salta) {
          d.fonti = testo.split('\n').map((r) => r.trim()).filter(Boolean)
        }
        stato.passo = 'link'
        await this.tg.sendMessage(
          chatId,
          'Link interni da inserire nel testo?\nUno per riga: <code>testo anchor -&gt; https://...</code>\n/salta per nessuno.'
        )
        return true
      }

      case 'link': {
        if (!salta) {
          const { link, errori } = parseLinkInterni(testo)
          if (errori.length > 0) {
            await this.tg.sendMessage(
              chatId,
              `Righe non interpretabili:\n${errori.map((e) => `· ${esc(e)}`).join('\n')}\n\nFormato: <code>testo -&gt; url</code>`
            )
            return true
          }
          d.linkInterni = link
        }
        stato.passo = 'conferma'
        await this.mostraRiepilogo(chatId, d)
        return true
      }

      default:
        return false
    }
  }

  private async chiediFonti(chatId: number): Promise<void> {
    await this.tg.sendMessage(
      chatId,
      'Fonti da usare? URL e/o note, uno per riga.\n/salta per usare solo la ricerca automatica.'
    )
  }

  private async mostraRiepilogo(chatId: number, d: BozzaArticolo): Promise<void> {
    const righe = [
      '<b>Riepilogo</b>',
      `Sito: ${esc(d.sito?.nome ?? '—')}`,
      `Tipo: ${esc(ETICHETTE_TIPO[d.tipo!])}`,
      `Categoria: ${esc(d.categoria ?? '—')}`,
      `Argomento: ${esc(d.argomento ?? '—')}`,
    ]
    if (d.linkAmazon) righe.push(`Amazon: ${esc(d.linkAmazon)}`)
    if (d.sistemaCategorie?.length) righe.push(`Componenti: ${esc(d.sistemaCategorie.join(', '))}`)
    righe.push(`Fonti: ${d.fonti.length || 'nessuna'}`)
    righe.push(`Link interni: ${d.linkInterni.length || 'nessuno'}`)

    await this.tg.sendMessage(chatId, righe.join('\n'), {
      keyboard: [[
        { text: '▶ Avvia', callback_data: 'art-go' },
        { text: '✕ Annulla', callback_data: 'annulla' },
      ]],
    })
  }

  async avviaJobArticolo(chatId: number): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'articolo') return
    const d = stato.dati
    this.stati.delete(chatId)

    const body: CreaArticoloBody = {
      sitoId: d.sito?.id,
      tipoArticolo: d.tipo!,
      categoria: d.categoria!,
      argomento: d.argomento!,
      fonti: d.fonti,
      linkInterni: d.linkInterni,
      ...(d.linkAmazon ? { linkAmazon: d.linkAmazon } : {}),
      ...(d.sistemaCategorie ? { sistemaCategorie: d.sistemaCategorie } : {}),
    }

    const etichetta = `${ETICHETTE_TIPO[d.tipo!]}: ${d.argomento}`
    const { jobId } = await this.hub.creaArticolo(body)

    const msg = await this.tg.sendMessage(chatId, rendiProgresso(etichetta, 'ricerca', 0, 'In coda...'))
    await this.monitor.osserva(jobId, { chatId, messageId: msg.message_id, tipo: 'articolo', etichetta })
  }

  // ─── /aggiorna ─────────────────────────────────────────────────────────────

  async avviaAggiornamento(chatId: number): Promise<void> {
    const siti = (await this.siti()).filter((s) => s.wpSiteUrl)
    if (siti.length === 0) {
      await this.tg.sendMessage(chatId, 'Nessun sito con WordPress configurato.')
      return
    }

    this.stati.set(chatId, { flusso: 'aggiorna', passo: 'sito', dati: { tipoArticolo: 'standard' } })

    if (siti.length === 1) {
      await this.scegliSitoAggiornamento(chatId, siti[0])
      return
    }

    await this.tg.sendMessage(chatId, '<b>Aggiorna un articolo</b>\nPer quale sito?', {
      keyboard: this.tastieraSiti(siti, 'agg-sito'),
    })
  }

  async scegliSitoAggiornamento(chatId: number, sito: Sito): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'aggiorna') return

    stato.dati.sito = sito
    stato.passo = 'cerca'

    await this.tg.sendMessage(chatId, `Sito: <b>${esc(sito.nome)}</b>\nScrivi una parola del titolo da cercare.`)
  }

  private async postDelSito(sitoId: string): Promise<WpPost[]> {
    const cache = this.cachePost.get(sitoId)
    if (cache && Date.now() - cache.quando < CACHE_POST_MS) return cache.posts
    const posts = await this.hub.postWordPress(sitoId)
    this.cachePost.set(sitoId, { quando: Date.now(), posts })
    return posts
  }

  private async testoAggiornamento(
    chatId: number,
    stato: Extract<Stato, { flusso: 'aggiorna' }>,
    testo: string,
    salta: boolean
  ): Promise<boolean> {
    if (stato.passo === 'cerca') {
      const query = testo.trim().toLowerCase()
      await this.tg.sendChatAction(chatId)

      let posts: WpPost[]
      try {
        posts = await this.postDelSito(stato.dati.sito!.id)
      } catch (err) {
        await this.tg.sendMessage(chatId, `Impossibile leggere i post: ${esc(err instanceof Error ? err.message : String(err))}`)
        return true
      }

      const trovati = posts.filter((p) => p.title.toLowerCase().includes(query)).slice(0, 10)
      if (trovati.length === 0) {
        await this.tg.sendMessage(chatId, `Nessun titolo contiene "${esc(query)}". Riprova con un'altra parola.`)
        return true
      }

      stato.risultati = trovati
      stato.passo = 'scelta'
      await this.tg.sendMessage(chatId, `${trovati.length} risultati:`, {
        keyboard: trovati.map((p, i) => [{ text: p.title.slice(0, 60), callback_data: `agg-post:${i}` }]),
      })
      return true
    }

    if (stato.passo === 'focus') {
      if (!salta) stato.dati.focus = testo.trim()
      stato.passo = 'conferma'
      await this.riepilogoAggiornamento(chatId, stato)
      return true
    }

    return false
  }

  async scegliPost(chatId: number, indice: number): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'aggiorna' || !stato.risultati) return

    const post = stato.risultati[indice]
    if (!post) return

    stato.dati.post = post
    stato.passo = 'focus'

    await this.tg.sendMessage(
      chatId,
      `Post: <b>${esc(post.title)}</b>\n\nSu cosa deve concentrarsi l'aggiornamento?\n/salta per un refresh generale.`
    )
  }

  private async riepilogoAggiornamento(
    chatId: number,
    stato: Extract<Stato, { flusso: 'aggiorna' }>
  ): Promise<void> {
    const d = stato.dati
    await this.tg.sendMessage(
      chatId,
      [
        '<b>Riepilogo aggiornamento</b>',
        `Sito: ${esc(d.sito!.nome)}`,
        `Post: ${esc(d.post!.title)}`,
        `Focus: ${esc(d.focus ?? 'refresh generale')}`,
      ].join('\n'),
      {
        keyboard: [[
          { text: '▶ Avvia', callback_data: 'agg-go' },
          { text: '✕ Annulla', callback_data: 'annulla' },
        ]],
      }
    )
  }

  async avviaJobAggiornamento(chatId: number): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'aggiorna') return
    const d = stato.dati
    this.stati.delete(chatId)

    const { jobId } = await this.hub.aggiornaArticolo({
      sitoId: d.sito!.id,
      wpPostId: d.post!.id,
      wpPostUrl: d.post!.link,
      wpPostTitle: d.post!.title,
      wpPostType: d.post!.postType,
      ...(d.focus ? { focus: d.focus } : {}),
      tipoArticolo: d.tipoArticolo,
    })

    const etichetta = `Aggiornamento: ${d.post!.title}`
    const msg = await this.tg.sendMessage(chatId, rendiProgresso(etichetta, 'recupero', 0, 'In coda...'))
    await this.monitor.osserva(jobId, { chatId, messageId: msg.message_id, tipo: 'aggiornamento', etichetta })
  }

  // ─── /link ─────────────────────────────────────────────────────────────────

  async avviaLink(chatId: number): Promise<void> {
    const siti = (await this.siti()).filter((s) => s.wpSiteUrl)
    if (siti.length === 0) {
      await this.tg.sendMessage(chatId, 'Nessun sito con WordPress configurato.')
      return
    }

    this.stati.set(chatId, { flusso: 'link', passo: 'sito' })

    if (siti.length === 1) {
      await this.confermaLink(chatId, siti[0])
      return
    }

    await this.tg.sendMessage(chatId, '<b>Analisi link interni</b>\nPer quale sito?', {
      keyboard: this.tastieraSiti(siti, 'lnk-sito'),
    })
  }

  async confermaLink(chatId: number, sito: Sito): Promise<void> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'link') return

    stato.sito = sito
    stato.passo = 'conferma'

    await this.tg.sendMessage(
      chatId,
      `Analizzo tutti i post di <b>${esc(sito.nome)}</b> e propongo link interni.\nSu cataloghi grandi può richiedere diversi minuti.`,
      {
        keyboard: [[
          { text: '▶ Avvia analisi', callback_data: 'lnk-go' },
          { text: '✕ Annulla', callback_data: 'annulla' },
        ]],
      }
    )
  }

  async avviaJobLink(chatId: number): Promise<string | null> {
    const stato = this.stati.get(chatId)
    if (stato?.flusso !== 'link' || !stato.sito) return null
    this.stati.delete(chatId)

    const { jobId } = await this.hub.analizzaLink(stato.sito.id)
    return jobId
  }
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export function parseLinkInterni(testo: string): { link: LinkInterno[]; errori: string[] } {
  const link: LinkInterno[] = []
  const errori: string[] = []

  for (const riga of testo.split('\n')) {
    const pulita = riga.trim()
    if (!pulita) continue

    // Accetta sia "->" che "→", con o senza virgolette attorno all'anchor.
    const match = pulita.match(/^["“]?(.+?)["”]?\s*(?:->|→|\|)\s*(https?:\/\/\S+)$/)
    if (!match) {
      errori.push(pulita.slice(0, 60))
      continue
    }
    link.push({ testo: match[1].trim(), url: match[2].trim() })
  }

  return { link, errori }
}
