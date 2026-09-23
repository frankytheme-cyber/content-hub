/**
 * Client minimale per la Bot API di Telegram.
 *
 * Nessuna dipendenza esterna: servono sei endpoint e il long polling di
 * getUpdates. Una libreria qui porterebbe un albero di dipendenze per fare
 * quello che `fetch` fa in trenta righe.
 */

const API_BASE = 'https://api.telegram.org'

/** Limite duro di Telegram per il testo di un messaggio. */
export const LIMITE_MESSAGGIO = 4096

// ─── Tipi (solo i campi che usiamo) ──────────────────────────────────────────

export interface TgUser {
  id: number
  is_bot: boolean
  first_name: string
  username?: string
}

export interface TgChat {
  id: number
  type: string
}

export interface TgMessage {
  message_id: number
  from?: TgUser
  chat: TgChat
  date: number
  text?: string
  document?: { file_id: string; file_name?: string }
}

export interface TgCallbackQuery {
  id: string
  from: TgUser
  message?: TgMessage
  data?: string
}

export interface TgUpdate {
  update_id: number
  message?: TgMessage
  edited_message?: TgMessage
  callback_query?: TgCallbackQuery
}

export interface InlineButton {
  text: string
  callback_data?: string
  url?: string
}

export type InlineKeyboard = InlineButton[][]

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly codice?: number,
    readonly retryAfter?: number
  ) {
    super(message)
    this.name = 'TelegramError'
  }
}

// ─── Trasporto ───────────────────────────────────────────────────────────────

export class Telegram {
  constructor(private readonly token: string) {}

  private url(metodo: string): string {
    return `${API_BASE}/bot${this.token}/${metodo}`
  }

  /**
   * `timeoutMs` deve superare il `timeout` del long polling, altrimenti
   * abortiamo noi stessi la richiesta che sta legittimamente aspettando.
   */
  private async chiama<T>(metodo: string, body: unknown, timeoutMs = 30_000): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let res: Response
    try {
      res = await fetch(this.url(metodo), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const payload = (await res.json()) as {
      ok: boolean
      result?: T
      description?: string
      error_code?: number
      parameters?: { retry_after?: number }
    }

    if (!payload.ok) {
      throw new TelegramError(
        `${metodo}: ${payload.description ?? 'errore sconosciuto'}`,
        payload.error_code,
        payload.parameters?.retry_after
      )
    }

    return payload.result as T
  }

  getUpdates(offset: number, timeoutSec: number): Promise<TgUpdate[]> {
    return this.chiama<TgUpdate[]>(
      'getUpdates',
      { offset, timeout: timeoutSec, allowed_updates: ['message', 'callback_query'] },
      (timeoutSec + 15) * 1000
    )
  }

  sendMessage(
    chatId: number,
    testo: string,
    opts: { keyboard?: InlineKeyboard; anteprima?: boolean } = {}
  ): Promise<TgMessage> {
    return this.chiama<TgMessage>('sendMessage', {
      chat_id: chatId,
      text: testo,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: opts.anteprima !== true },
      ...(opts.keyboard ? { reply_markup: { inline_keyboard: opts.keyboard } } : {}),
    })
  }

  /**
   * Telegram rifiuta una modifica che non cambia nulla ("message is not
   * modified"): per un indicatore di progresso che ripete la stessa fase è un
   * caso normale, non un errore, quindi lo assorbiamo.
   */
  async editMessageText(
    chatId: number,
    messageId: number,
    testo: string,
    opts: { keyboard?: InlineKeyboard } = {}
  ): Promise<void> {
    try {
      await this.chiama('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text: testo,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...(opts.keyboard ? { reply_markup: { inline_keyboard: opts.keyboard } } : {}),
      })
    } catch (err) {
      if (err instanceof TelegramError && /not modified/i.test(err.message)) return
      throw err
    }
  }

  answerCallbackQuery(id: string, testo?: string): Promise<boolean> {
    return this.chiama<boolean>('answerCallbackQuery', {
      callback_query_id: id,
      ...(testo ? { text: testo } : {}),
    })
  }

  sendChatAction(chatId: number, azione = 'typing'): Promise<boolean> {
    return this.chiama<boolean>('sendChatAction', { chat_id: chatId, action: azione })
  }

  /**
   * Invia un file. Un articolo da 8.000 caratteri diventerebbe tre messaggi
   * spezzati a metà frase; come allegato .md resta un blocco solo, copiabile
   * e apribile sul telefono.
   */
  async sendDocument(
    chatId: number,
    nomeFile: string,
    contenuto: string,
    didascalia?: string
  ): Promise<TgMessage> {
    const form = new FormData()
    form.append('chat_id', String(chatId))
    form.append('document', new Blob([contenuto], { type: 'text/markdown' }), nomeFile)
    if (didascalia) {
      form.append('caption', didascalia.slice(0, 1024))
      form.append('parse_mode', 'HTML')
    }

    const res = await fetch(this.url('sendDocument'), { method: 'POST', body: form })
    const payload = (await res.json()) as { ok: boolean; result?: TgMessage; description?: string }
    if (!payload.ok) throw new TelegramError(`sendDocument: ${payload.description}`)
    return payload.result as TgMessage
  }
}

// ─── Utilità ─────────────────────────────────────────────────────────────────

/** Escape dei tre caratteri che rompono il parse_mode HTML di Telegram. */
export function esc(testo: string): string {
  return testo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Spezza un testo lungo su confini di riga, mai a metà parola.
 * Usato per i messaggi di testo; per gli articoli si preferisce sendDocument.
 */
export function spezza(testo: string, limite = LIMITE_MESSAGGIO - 100): string[] {
  if (testo.length <= limite) return [testo]

  const pezzi: string[] = []
  let corrente = ''

  for (const riga of testo.split('\n')) {
    if (corrente.length + riga.length + 1 > limite) {
      if (corrente) pezzi.push(corrente)
      // Una riga singola più lunga del limite va tagliata comunque.
      if (riga.length > limite) {
        for (let i = 0; i < riga.length; i += limite) pezzi.push(riga.slice(i, i + limite))
        corrente = ''
        continue
      }
      corrente = riga
    } else {
      corrente = corrente ? `${corrente}\n${riga}` : riga
    }
  }

  if (corrente) pezzi.push(corrente)
  return pezzi
}
