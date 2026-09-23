import Redis from 'ioredis'
import { Telegram, TelegramError, esc, type TgUpdate, type TgMessage, type TgCallbackQuery } from './telegram'
import { Hub, HubError } from './hub'
import { Monitor, rendiProgresso } from './monitor'
import { Flussi } from './flussi'
import { RevisioneLink } from './revisione-link'

/**
 * Bot Telegram di content-hub.
 *
 * Processo separato dall'app Next: parla alle stesse rotte HTTP della web UI
 * su localhost e ascolta gli eventi della pipeline su Redis. Può essere
 * riavviato senza toccare i job in corso.
 *
 * Usa long polling, non webhook: niente dominio, niente TLS, nessuna porta
 * esposta a internet.
 */

// ─── Configurazione ──────────────────────────────────────────────────────────

function richiesto(nome: string): string {
  const valore = process.env[nome]
  if (!valore) {
    console.error(`Variabile d'ambiente mancante: ${nome}`)
    process.exit(1)
  }
  return valore
}

const TOKEN = richiesto('TELEGRAM_BOT_TOKEN')
const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6379'
const HUB_URL = process.env.HUB_URL ?? 'http://127.0.0.1:3000'

/**
 * Whitelist di chi può usare il bot. Il token da solo non basta: chiunque
 * scopra il nome del bot può scrivergli, e questo bot pubblica su WordPress.
 */
const AMMESSI = new Set(
  richiesto('TELEGRAM_ALLOWED_USER_IDS')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n))
)

if (AMMESSI.size === 0) {
  console.error('TELEGRAM_ALLOWED_USER_IDS non contiene nessun ID valido.')
  process.exit(1)
}

const CHIAVE_OFFSET = 'bot:offset'
const TIMEOUT_POLL = 25

// ─── Composizione ────────────────────────────────────────────────────────────

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null })
const tg = new Telegram(TOKEN)
const hub = new Hub(HUB_URL)
const monitor = new Monitor(redis, REDIS_URL, tg, hub)
const flussi = new Flussi(tg, hub, monitor)
const revisioneLink = new RevisioneLink(tg, hub)

const AIUTO = [
  '<b>content-hub</b>',
  '',
  '/articolo — genera un nuovo articolo',
  '/aggiorna — aggiorna un articolo già pubblicato',
  '/link — analizza i link interni del sito',
  '/stato — job in corso',
  '/annulla — interrompe la compilazione in corso',
  '',
  'Durante la compilazione, <code>/salta</code> lascia vuoto un campo opzionale.',
].join('\n')

// ─── Router ──────────────────────────────────────────────────────────────────

async function gestisciMessaggio(msg: TgMessage): Promise<void> {
  const chatId = msg.chat.id
  const testo = msg.text?.trim()
  if (!testo) return

  const comando = testo.split(/\s+/)[0].toLowerCase().replace(/@.*$/, '')

  switch (comando) {
    case '/start':
    case '/help':
      await tg.sendMessage(chatId, AIUTO)
      return

    case '/annulla':
      await tg.sendMessage(chatId, flussi.annulla(chatId) ? 'Annullato.' : 'Non c\'era niente da annullare.')
      return

    case '/articolo':
      flussi.annulla(chatId)
      await flussi.avviaArticolo(chatId)
      return

    case '/aggiorna':
      flussi.annulla(chatId)
      await flussi.avviaAggiornamento(chatId)
      return

    case '/link':
      flussi.annulla(chatId)
      await flussi.avviaLink(chatId)
      return

    case '/stato':
      await mostraStato(chatId)
      return
  }

  // Non è un comando: può essere la risposta a un passo del flusso attivo.
  const consumato = await flussi.testo(chatId, testo)
  if (!consumato) {
    await tg.sendMessage(chatId, 'Non ho un\'operazione in corso. Usa /articolo, /aggiorna o /link.')
  }
}

async function mostraStato(chatId: number): Promise<void> {
  const chiavi: string[] = []
  let cursore = '0'
  do {
    const [prossimo, trovate] = await redis.scan(cursore, 'MATCH', 'bot:watch:*', 'COUNT', 100)
    cursore = prossimo
    chiavi.push(...trovate)
  } while (cursore !== '0')

  const righe: string[] = []
  for (const chiave of chiavi) {
    const raw = await redis.get(chiave)
    if (!raw) continue
    const osservato = JSON.parse(raw) as { chatId: number; etichetta: string }
    if (osservato.chatId !== chatId) continue

    const jobId = chiave.slice('bot:watch:'.length)
    try {
      const job = await hub.statoJob(jobId)
      righe.push(`· ${esc(osservato.etichetta)} — ${job.fase ?? job.stato} (${job.progresso}%)`)
    } catch {
      righe.push(`· ${esc(osservato.etichetta)} — stato non recuperabile`)
    }
  }

  await tg.sendMessage(chatId, righe.length ? `<b>Job in corso</b>\n${righe.join('\n')}` : 'Nessun job in corso.')
}

async function gestisciCallback(cb: TgCallbackQuery): Promise<void> {
  const chatId = cb.message?.chat.id
  const messageId = cb.message?.message_id
  const dati = cb.data
  if (!chatId || !messageId || !dati) return

  const [prefisso, ...resto] = dati.split(':')

  switch (prefisso) {
    case 'annulla':
      flussi.annulla(chatId)
      await tg.editMessageText(chatId, messageId, 'Annullato.')
      return

    case 'art-sito': {
      const sito = (await hub.siti()).find((s) => s.id === resto[0])
      if (sito) await flussi.scegliSito(chatId, sito)
      return
    }

    case 'art-tipo':
      await flussi.scegliTipo(chatId, resto[0] as 'standard' | 'recensione' | 'sistema' | 'biografia')
      return

    case 'art-cat':
      await flussi.scegliCategoria(chatId, Number(resto[0]))
      return

    case 'art-go':
      await tg.editMessageText(chatId, messageId, 'Avvio la pipeline...')
      await flussi.avviaJobArticolo(chatId)
      return

    case 'agg-sito': {
      const sito = (await hub.siti()).find((s) => s.id === resto[0])
      if (sito) await flussi.scegliSitoAggiornamento(chatId, sito)
      return
    }

    case 'agg-post':
      await flussi.scegliPost(chatId, Number(resto[0]))
      return

    case 'agg-go':
      await tg.editMessageText(chatId, messageId, 'Avvio l\'aggiornamento...')
      await flussi.avviaJobAggiornamento(chatId)
      return

    case 'lnk-sito': {
      const sito = (await hub.siti()).find((s) => s.id === resto[0])
      if (sito) await flussi.confermaLink(chatId, sito)
      return
    }

    case 'lnk-go': {
      await tg.editMessageText(chatId, messageId, 'Avvio l\'analisi...')
      const jobId = await flussi.avviaJobLink(chatId)
      // Il polling dura minuti: non deve bloccare il ciclo degli update.
      if (jobId) {
        revisioneLink.segui(chatId, jobId).catch((err) =>
          console.error('[link] revisione fallita:', err instanceof Error ? err.message : err)
        )
      }
      return
    }

    case 'lr':
      await revisioneLink.decidi(chatId, messageId, resto[0], Number(resto[1]), resto[2] as 'ok' | 'no' | 'vai')
      return

    case 'la':
      await revisioneLink.applica(chatId, messageId, resto[0])
      return

    case 'a':
      await eseguiAzione(chatId, messageId, resto[0])
      return
  }
}

async function eseguiAzione(chatId: number, messageId: number, token: string): Promise<void> {
  const azione = await monitor.leggiAzione(token)
  if (!azione) {
    await tg.sendMessage(chatId, 'Questa azione è scaduta. Rilancia il comando.')
    return
  }

  if (azione.tipo === 'riprendi') {
    await tg.editMessageText(chatId, messageId, 'Rimetto il job in coda dal checkpoint...')
    try {
      await hub.riprendiJob(azione.jobId)
      const msg = await tg.sendMessage(chatId, rendiProgresso(azione.etichetta, 'ricerca', 0, 'Ripreso dal checkpoint...'))
      await monitor.osserva(azione.jobId, {
        chatId, messageId: msg.message_id, tipo: 'articolo', etichetta: azione.etichetta,
      })
    } catch (err) {
      await tg.sendMessage(chatId, `Ripresa fallita: ${esc(err instanceof Error ? err.message : String(err))}`)
    }
    return
  }

  if (azione.tipo === 'applica-aggiornamento') {
    await tg.editMessageText(chatId, messageId, 'Applico l\'aggiornamento su WordPress...')
    try {
      const { wpPostUrl } = await hub.applicaAggiornamento(azione.articoloId, azione.versioneId)
      await tg.editMessageText(chatId, messageId, `✅ Aggiornato.\n<a href="${esc(wpPostUrl)}">${esc(wpPostUrl)}</a>`)
    } catch (err) {
      await tg.editMessageText(chatId, messageId, `❌ ${esc(err instanceof Error ? err.message : String(err))}`)
    }
    return
  }

  const etichetta = azione.stato === 'publish' ? 'Pubblico' : 'Salvo la bozza'
  await tg.editMessageText(chatId, messageId, `${etichetta} su WordPress...`)
  try {
    const { wpPostUrl } = await hub.pubblica(azione.articoloId, {
      versioneId: azione.versioneId,
      wpSiteUrl: azione.wpSiteUrl,
      stato: azione.stato,
    })
    await tg.editMessageText(
      chatId, messageId,
      `✅ ${azione.stato === 'publish' ? 'Pubblicato' : 'Bozza salvata'}.\n<a href="${esc(wpPostUrl)}">${esc(wpPostUrl)}</a>`
    )
  } catch (err) {
    await tg.editMessageText(chatId, messageId, `❌ ${esc(err instanceof Error ? err.message : String(err))}`)
  }
}

// ─── Ciclo principale ────────────────────────────────────────────────────────

async function gestisciUpdate(update: TgUpdate): Promise<void> {
  const utente = update.message?.from ?? update.callback_query?.from
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id

  if (!utente || !chatId) return

  if (!AMMESSI.has(utente.id)) {
    console.warn(`[bot] accesso negato a ${utente.id} (@${utente.username ?? '?'})`)
    if (update.message) {
      await tg.sendMessage(chatId, `Non sei autorizzato. Il tuo ID Telegram è <code>${utente.id}</code>.`)
    }
    return
  }

  if (update.callback_query) {
    // Va risposto entro pochi secondi, altrimenti il bottone resta "in caricamento".
    await tg.answerCallbackQuery(update.callback_query.id).catch(() => {})
    await gestisciCallback(update.callback_query)
    return
  }

  if (update.message) await gestisciMessaggio(update.message)
}

let inEsecuzione = true

async function ciclo(): Promise<void> {
  let offset = Number((await redis.get(CHIAVE_OFFSET)) ?? 0)
  let attesaErrore = 1000

  while (inEsecuzione) {
    try {
      const updates = await tg.getUpdates(offset, TIMEOUT_POLL)
      attesaErrore = 1000

      for (const update of updates) {
        offset = update.update_id + 1
        // L'offset si salva prima di gestire l'update: un messaggio che fa
        // esplodere l'handler non deve essere riprocessato all'infinito.
        await redis.set(CHIAVE_OFFSET, String(offset))

        try {
          await gestisciUpdate(update)
        } catch (err) {
          const messaggio = err instanceof HubError || err instanceof TelegramError
            ? err.message
            : err instanceof Error ? err.message : String(err)
          console.error('[bot] update fallito:', messaggio)

          const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id
          if (chatId) {
            await tg.sendMessage(chatId, `⚠️ ${esc(messaggio.slice(0, 500))}`).catch(() => {})
          }
        }
      }
    } catch (err) {
      if (err instanceof TelegramError && err.retryAfter) {
        console.warn(`[bot] rate limit, attendo ${err.retryAfter}s`)
        await new Promise((r) => setTimeout(r, err.retryAfter! * 1000))
        continue
      }
      console.error('[bot] polling:', err instanceof Error ? err.message : err)
      await new Promise((r) => setTimeout(r, attesaErrore))
      attesaErrore = Math.min(attesaErrore * 2, 60_000)
    }
  }
}

async function spegni(segnale: string): Promise<void> {
  console.log(`[bot] ${segnale}: spengo...`)
  inEsecuzione = false
  await monitor.ferma().catch(() => {})
  await redis.quit().catch(() => {})
  process.exit(0)
}

process.on('SIGTERM', () => void spegni('SIGTERM'))
process.on('SIGINT', () => void spegni('SIGINT'))

async function main(): Promise<void> {
  console.log(`[bot] content-hub → ${HUB_URL}`)
  console.log(`[bot] utenti autorizzati: ${[...AMMESSI].join(', ')}`)

  await monitor.avvia()
  await ciclo()
}

main().catch((err) => {
  console.error('[bot] avvio fallito:', err)
  process.exit(1)
})
