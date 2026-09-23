import { Telegram, esc } from './telegram'
import { Hub, type LinkSuggestion } from './hub'

/**
 * Analisi dei link interni e revisione dei suggerimenti.
 *
 * I job di internal-linking pubblicano su `link-job:*`, un canale diverso da
 * quello della pipeline: qui si fa polling sullo stato invece di aprire una
 * seconda sottoscrizione, perché l'analisi è un'operazione rara e manuale.
 *
 * I suggerimenti si rivedono uno alla volta dentro lo stesso messaggio: una
 * lista di venti proposte con due bottoni ciascuna sarebbe illeggibile sul
 * telefono.
 */

const INTERVALLO_POLL = 5_000
const MAX_ATTESA = 30 * 60 * 1000

const FASI_LINK: Record<string, string> = {
  in_coda: 'In coda',
  fetch: 'Lettura post da WordPress',
  analisi: 'Analisi contenuti',
  completato: 'Completata',
  errore: 'Errore',
}

function barra(progresso: number): string {
  const totale = 16
  const pieni = Math.max(0, Math.min(totale, Math.round((progresso / 100) * totale)))
  return '▓'.repeat(pieni) + '░'.repeat(totale - pieni)
}

const attendi = (ms: number) => new Promise((r) => setTimeout(r, ms))

export class RevisioneLink {
  /** Suggerimenti per job, così la revisione non rilegge l'API a ogni bottone. */
  private cache = new Map<string, LinkSuggestion[]>()
  private decisioni = new Map<string, Map<string, 'approvato' | 'rifiutato'>>()

  constructor(
    private readonly tg: Telegram,
    private readonly hub: Hub
  ) {}

  /** Segue l'analisi fino alla fine, poi apre la revisione. Non blocca il chiamante. */
  async segui(chatId: number, jobId: string): Promise<void> {
    const msg = await this.tg.sendMessage(
      chatId,
      `<b>Analisi link interni</b>\n\n<code>${barra(0)}</code> 0%\nIn coda...`
    )

    const scadenza = Date.now() + MAX_ATTESA

    while (Date.now() < scadenza) {
      await attendi(INTERVALLO_POLL)

      let job
      try {
        job = await this.hub.statoLink(jobId)
      } catch (err) {
        console.warn('[link] polling fallito:', err instanceof Error ? err.message : err)
        continue
      }

      if (job.stato === 'errore') {
        await this.tg.editMessageText(
          chatId, msg.message_id,
          `❌ <b>Analisi link interni</b>\n\n${esc(job.errore ?? 'Errore sconosciuto')}`
        )
        return
      }

      if (job.stato === 'completato') {
        this.cache.set(jobId, job.suggestions)
        this.decisioni.set(jobId, new Map())

        if (job.suggestions.length === 0) {
          await this.tg.editMessageText(
            chatId, msg.message_id,
            '<b>Analisi link interni</b>\n\nCompletata: nessun suggerimento da proporre.'
          )
          return
        }

        await this.tg.editMessageText(
          chatId, msg.message_id,
          `✅ <b>Analisi completata</b>\n${job.totalePost} post analizzati · <b>${job.suggestions.length}</b> suggerimenti.`
        )
        const revisione = await this.tg.sendMessage(chatId, 'Apro la revisione...')
        await this.mostra(chatId, revisione.message_id, jobId, 0)
        return
      }

      const etichetta = FASI_LINK[job.fase] ?? job.fase
      const dettaglio = job.totalePost > 0 ? ` (${job.postProcessati}/${job.totalePost})` : ''
      await this.tg.editMessageText(
        chatId, msg.message_id,
        `<b>Analisi link interni</b>\n\n<code>${barra(job.progresso)}</code> ${job.progresso}%\n${esc(etichetta)}${dettaglio}`
      )
    }

    await this.tg.editMessageText(
      chatId, msg.message_id,
      '⏱ <b>Analisi link interni</b>\n\nTimeout dopo 30 minuti. Controlla i log del server.'
    )
  }

  private async suggerimenti(jobId: string): Promise<LinkSuggestion[]> {
    const cache = this.cache.get(jobId)
    if (cache) return cache
    const job = await this.hub.statoLink(jobId)
    this.cache.set(jobId, job.suggestions)
    if (!this.decisioni.has(jobId)) this.decisioni.set(jobId, new Map())
    return job.suggestions
  }

  async mostra(chatId: number, messageId: number, jobId: string, indice: number): Promise<void> {
    const lista = await this.suggerimenti(jobId)
    const decisi = this.decisioni.get(jobId) ?? new Map()

    if (indice >= lista.length) {
      await this.riepilogo(chatId, messageId, jobId)
      return
    }

    const s = lista[indice]
    const stato = decisi.get(s.id)

    const testo = [
      `<b>Suggerimento ${indice + 1} di ${lista.length}</b>${stato ? ` — ${stato === 'approvato' ? '✓ approvato' : '✗ rifiutato'}` : ''}`,
      '',
      `<b>Da:</b> ${esc(s.fonteTitolo)}`,
      `<b>A:</b> ${esc(s.targetTitolo)}`,
      '',
      `<b>Anchor:</b> <code>${esc(s.anchorText)}</code>`,
      `<b>Contesto:</b> <i>${esc(s.contesto.slice(0, 300))}</i>`,
      '',
      esc(s.motivazione.slice(0, 300)),
    ].join('\n')

    await this.tg.editMessageText(chatId, messageId, testo, {
      keyboard: [
        [
          { text: '✓ Approva', callback_data: `lr:${jobId}:${indice}:ok` },
          { text: '✗ Rifiuta', callback_data: `lr:${jobId}:${indice}:no` },
        ],
        [
          ...(indice > 0 ? [{ text: '‹ Indietro', callback_data: `lr:${jobId}:${indice - 1}:vai` }] : []),
          { text: 'Salta ›', callback_data: `lr:${jobId}:${indice + 1}:vai` },
        ],
        [{ text: '⏹ Chiudi e riepiloga', callback_data: `lr:${jobId}:${lista.length}:vai` }],
      ],
    })
  }

  async decidi(
    chatId: number,
    messageId: number,
    jobId: string,
    indice: number,
    azione: 'ok' | 'no' | 'vai'
  ): Promise<void> {
    if (azione === 'vai') {
      await this.mostra(chatId, messageId, jobId, indice)
      return
    }

    const lista = await this.suggerimenti(jobId)
    const s = lista[indice]
    if (!s) return

    const stato = azione === 'ok' ? 'approvato' : 'rifiutato'
    this.decisioni.get(jobId)?.set(s.id, stato)

    // Lo stato viene persistito anche lato server: se il bot si riavvia a metà
    // revisione, le scelte già fatte non si perdono.
    try {
      await this.hub.segnaSuggerimento(s.id, stato)
    } catch (err) {
      console.warn('[link] patch suggerimento fallita:', err instanceof Error ? err.message : err)
    }

    await this.mostra(chatId, messageId, jobId, indice + 1)
  }

  private async riepilogo(chatId: number, messageId: number, jobId: string): Promise<void> {
    const decisi = this.decisioni.get(jobId) ?? new Map()
    const approvati = [...decisi.entries()].filter(([, v]) => v === 'approvato')
    const rifiutati = [...decisi.entries()].filter(([, v]) => v === 'rifiutato')

    const testo = [
      '<b>Revisione conclusa</b>',
      '',
      `Approvati: <b>${approvati.length}</b>`,
      `Rifiutati: ${rifiutati.length}`,
      '',
      approvati.length > 0
        ? 'Applicare i link approvati su WordPress?'
        : 'Nessun link approvato: non c\'è niente da applicare.',
    ].join('\n')

    await this.tg.editMessageText(chatId, messageId, testo, {
      keyboard: approvati.length > 0
        ? [[{ text: `↑ Applica ${approvati.length} link`, callback_data: `la:${jobId}` }]]
        : undefined,
    })
  }

  async applica(chatId: number, messageId: number, jobId: string): Promise<void> {
    const decisi = this.decisioni.get(jobId) ?? new Map()
    const ids = [...decisi.entries()].filter(([, v]) => v === 'approvato').map(([k]) => k)

    if (ids.length === 0) {
      await this.tg.editMessageText(chatId, messageId, 'Nessun link approvato da applicare.')
      return
    }

    await this.tg.editMessageText(chatId, messageId, `Applico ${ids.length} link su WordPress...`)

    try {
      const esito = await this.hub.applicaSuggerimenti(ids)
      await this.tg.editMessageText(
        chatId, messageId,
        `✅ <b>Link applicati</b>\n\nApplicati: ${esito.applicati ?? ids.length}\nFalliti: ${esito.falliti ?? 0}`
      )
      this.cache.delete(jobId)
      this.decisioni.delete(jobId)
    } catch (err) {
      await this.tg.editMessageText(
        chatId, messageId,
        `❌ Applicazione fallita: ${esc(err instanceof Error ? err.message : String(err))}`
      )
    }
  }
}
