import { spawn, execSync } from 'child_process'
import { mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { AsyncLocalStorage } from 'async_hooks'

function resolveClaude(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  try {
    return execSync('which claude', { encoding: 'utf8' }).trim()
  } catch {
    return 'claude'
  }
}

const CLAUDE_BIN = resolveClaude()
const DEFAULT_TIMEOUT = 5 * 60 * 1000

/**
 * Directory neutra usata come cwd del subprocess.
 *
 * Claude Code risale l'albero delle directory a partire dalla cwd per caricare
 * CLAUDE.md / AGENTS.md. Se lanciassimo il subprocess dentro il progetto, ogni
 * singola chiamata si porterebbe dietro CLAUDE.md + AGENTS.md + memoria utente.
 */
const SANDBOX_CWD = join(tmpdir(), 'content-hub-claude-sandbox')
try {
  mkdirSync(SANDBOX_CWD, { recursive: true })
} catch {
  /* la directory esiste già */
}

// ─── Modelli ─────────────────────────────────────────────────────────────────

/**
 * `fast`     → task meccanici e brevi (alt text, query immagini, normalizzazioni)
 * `standard` → scrittura e analisi: il cavallo da lavoro della pipeline
 * `deep`     → template lunghi e strutturati dove la qualità ripaga il costo
 */
export type ModelTier = 'fast' | 'standard' | 'deep'

const MODEL_BY_TIER: Record<ModelTier, string> = {
  fast: process.env.CLAUDE_MODEL_FAST ?? 'haiku',
  standard: process.env.CLAUDE_MODEL_STANDARD ?? 'sonnet',
  deep: process.env.CLAUDE_MODEL_DEEP ?? 'opus',
}

/**
 * Fascia usata per la scrittura long-form (articoli, recensioni, biografie).
 * Alzala a `deep` con `CLAUDE_TIER_LONGFORM=deep` se la qualità vale il costo.
 */
export function tierLongform(): ModelTier {
  const t = process.env.CLAUDE_TIER_LONGFORM
  return t === 'deep' || t === 'fast' ? t : 'standard'
}

/**
 * Budget di ragionamento per la scrittura long-form. Zero di default.
 *
 * Misurato sullo stesso prompt di generazione: con 4000 token di thinking
 * l'articolo costa 3,7 volte tanto e impiega 3,5 volte il tempo, ottenendo lo
 * stesso punteggio SEO/GEO (100/100). I prompt qui sono già prescrittivi sulla
 * struttura, quindi il ragionamento esteso non ha nulla da decidere.
 * Alzalo con `CLAUDE_THINKING_LONGFORM=4000` per argomenti che richiedono
 * ragionamento non banale.
 */
export function thinkingLongform(): number {
  const n = Number(process.env.CLAUDE_THINKING_LONGFORM ?? 0)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const SYSTEM_PROMPT_DEFAULT =
  'Sei un assistente editoriale specializzato in contenuti SEO in italiano. ' +
  'Esegui esattamente il compito richiesto e rispondi solo nel formato indicato, ' +
  'senza preamboli, commenti, scuse o testo extra.'

// ─── Contabilità token ───────────────────────────────────────────────────────

export interface ClaudeUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
  costUsd: number
  durationMs: number
  model: string
  label: string
}

export interface UsageLedger {
  chiamate: ClaudeUsage[]
  totale: () => {
    chiamate: number
    inputTokens: number
    outputTokens: number
    costUsd: number
  }
}

const ledgerStore = new AsyncLocalStorage<UsageLedger>()

function creaLedger(): UsageLedger {
  const chiamate: ClaudeUsage[] = []
  return {
    chiamate,
    totale: () => ({
      chiamate: chiamate.length,
      inputTokens: chiamate.reduce((s, c) => s + c.inputTokens + c.cacheCreationTokens + c.cacheReadTokens, 0),
      outputTokens: chiamate.reduce((s, c) => s + c.outputTokens, 0),
      costUsd: chiamate.reduce((s, c) => s + c.costUsd, 0),
    }),
  }
}

/**
 * Esegue `fn` con un registro dei consumi isolato: due job concorrenti nello
 * stesso worker non si mescolano i conteggi (AsyncLocalStorage segue la catena
 * di await, non il modulo).
 */
export function withUsageLedger<T>(fn: (ledger: UsageLedger) => Promise<T>): Promise<T> {
  const ledger = creaLedger()
  return ledgerStore.run(ledger, () => fn(ledger))
}

function registraUsage(usage: ClaudeUsage) {
  ledgerStore.getStore()?.chiamate.push(usage)
  if (process.env.CLAUDE_LOG_USAGE !== '0') {
    console.log(
      `[claude:${usage.label}] ${usage.model} · in ${usage.inputTokens + usage.cacheCreationTokens + usage.cacheReadTokens} tok · ` +
      `out ${usage.outputTokens} tok · $${usage.costUsd.toFixed(4)} · ${(usage.durationMs / 1000).toFixed(1)}s`
    )
  }
}

// ─── Invocazione ─────────────────────────────────────────────────────────────

export interface CallOptions {
  timeout?: number
  /** Fascia di modello. Default: `standard`. */
  tier?: ModelTier
  /** System prompt personalizzato. Sostituisce quello di default. */
  system?: string
  /** Etichetta per i log e la contabilità. */
  label?: string
  /** Tentativi totali in caso di errore del CLI. Default: 2. */
  retries?: number
  /**
   * Budget di ragionamento esteso, in token.
   *
   * I token di thinking vengono fatturati come output: su un task meccanico
   * (un alt text, un'estrazione strutturata) il modello ne spende migliaia per
   * produrre venti token utili. `0` lo disattiva ed è il default per `fast` e
   * `standard`; la scrittura long-form lo tiene acceso.
   */
  thinkingTokens?: number
}

const THINKING_DEFAULT: Record<ModelTier, number | undefined> = {
  fast: 0,
  standard: 0,
  deep: undefined,
}

/** Errore del CLI che non ha senso ritentare (quota, auth, permessi). */
export class ClaudeCliError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly ritentabile = true
  ) {
    super(message)
    this.name = 'ClaudeCliError'
  }
}

function analizzaErrore(envelope: CliEnvelope | null, grezzo: string): ClaudeCliError {
  const messaggio = (envelope?.result ?? grezzo).trim()
  const status = envelope?.api_error_status

  if (status === 429 || /spend limit|usage limit|rate limit|quota/i.test(messaggio)) {
    return new ClaudeCliError(
      `Limite di spesa o di frequenza raggiunto sull'account Claude: ${messaggio.slice(0, 200)}`,
      status,
      false
    )
  }

  if (status === 401 || status === 403 || /unauthorized|forbidden|not logged in|authentication/i.test(messaggio)) {
    return new ClaudeCliError(
      `Autenticazione Claude CLI non valida: esegui "claude login". ${messaggio.slice(0, 200)}`,
      status,
      false
    )
  }

  return new ClaudeCliError(messaggio.slice(0, 500) || 'errore sconosciuto dal CLI', status)
}

interface CliEnvelope {
  type?: string
  subtype?: string
  is_error?: boolean
  api_error_status?: number
  result?: string
  total_cost_usd?: number
  duration_ms?: number
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
  modelUsage?: Record<string, unknown>
}

function buildArgs(opts: CallOptions): string[] {
  const modello = MODEL_BY_TIER[opts.tier ?? 'standard']

  return [
    '--print',
    '--output-format', 'json',
    '--model', modello,

    // Sostituisce l'intero system prompt di Claude Code (harness, istruzioni
    // sugli strumenti, convenzioni di output...): per un task di scrittura è
    // tutto contesto inutile che pagheremmo a ogni chiamata.
    '--system-prompt', opts.system ?? SYSTEM_PROMPT_DEFAULT,

    // Nessuno strumento: qui serve solo testo. Elimina gli schemi dei tool dal
    // prompt e rende impossibile un loop agentico a più turni.
    '--tools', '',

    // Niente skill, niente MCP, niente settings di progetto/utente: sono le tre
    // sorgenti che gonfiano il contesto senza servire alla pipeline.
    '--disable-slash-commands',
    '--strict-mcp-config',
    '--setting-sources', '',

    '--dangerously-skip-permissions',
  ]
}

function eseguiUnaVolta(
  prompt: string,
  opts: CallOptions
): Promise<string> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT
  const label = opts.label ?? 'anonimo'
  const tier = opts.tier ?? 'standard'
  const avvio = Date.now()

  return new Promise((resolve, reject) => {
    // ANTHROPIC_API_KEY nell'env fa usare al CLI l'auth diretta via API invece
    // della sessione OAuth, rompendo --print.
    const { ANTHROPIC_API_KEY: _drop, ...safeEnv } = process.env

    const thinking = opts.thinkingTokens ?? THINKING_DEFAULT[tier]

    const child = spawn(CLAUDE_BIN, buildArgs(opts), {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: SANDBOX_CWD,
      env: {
        ...safeEnv,
        PATH: safeEnv.PATH ?? '/usr/local/bin:/usr/bin:/bin',
        // Sopprime le chiamate accessorie (titolazione sessione, telemetria):
        // sono token pagati per qualcosa che non usiamo mai.
        DISABLE_NON_ESSENTIAL_MODEL_CALLS: '1',
        DISABLE_TELEMETRY: '1',
        DISABLE_AUTOUPDATER: '1',
        DISABLE_ERROR_REPORTING: '1',
        ...(thinking !== undefined ? { MAX_THINKING_TOKENS: String(thinking) } : {}),
      },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`callClaude[${label}] timeout dopo ${timeout / 1000}s`))
    }, timeout)

    child.on('close', (code) => {
      clearTimeout(timer)

      // Il CLI restituisce comunque l'involucro JSON quando fallisce: leggerlo
      // permette di riportare il messaggio vero ("limite di spesa raggiunto")
      // invece di un blob di 800 caratteri.
      let envelope: CliEnvelope | null = null
      try {
        envelope = JSON.parse(stdout.trim()) as CliEnvelope
      } catch {
        envelope = null
      }

      if (code !== 0 || envelope?.is_error) {
        const errore = analizzaErrore(envelope, stderr + stdout)
        console.error(`[callClaude:${label}] ${errore.message}`)
        reject(errore)
        return
      }

      if (!envelope) {
        // Formato inatteso ma uscita pulita: trattiamo stdout come testo grezzo.
        resolve(stdout.trim())
        return
      }

      registraUsage({
        inputTokens: envelope.usage?.input_tokens ?? 0,
        outputTokens: envelope.usage?.output_tokens ?? 0,
        cacheReadTokens: envelope.usage?.cache_read_input_tokens ?? 0,
        cacheCreationTokens: envelope.usage?.cache_creation_input_tokens ?? 0,
        costUsd: envelope.total_cost_usd ?? 0,
        durationMs: envelope.duration_ms ?? Date.now() - avvio,
        model: MODEL_BY_TIER[tier],
        label,
      })

      resolve((envelope.result ?? '').trim())
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`Impossibile avviare claude CLI (bin=${CLAUDE_BIN}): ${err.message}`))
    })

    child.stdin.on('error', () => { /* EPIPE se claude chiude prima di stdin */ })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

export async function callClaude(prompt: string, options: CallOptions = {}): Promise<string> {
  const tentativi = Math.max(1, options.retries ?? 2)
  let ultimoErrore: unknown

  for (let i = 0; i < tentativi; i++) {
    try {
      const testo = await eseguiUnaVolta(prompt, options)
      if (testo.length > 0) return testo
      ultimoErrore = new Error('risposta vuota dal CLI')
    } catch (err) {
      ultimoErrore = err
      // Un timeout non si risolve ripetendo la stessa chiamata più lenta.
      if (err instanceof Error && err.message.includes('timeout')) throw err
      // Quota esaurita o credenziali scadute: ritentare brucia solo tempo e
      // nasconde la causa vera in fondo ai log.
      if (err instanceof ClaudeCliError && !err.ritentabile) throw err
    }

    if (i < tentativi - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
      console.warn(`[callClaude:${options.label ?? 'anonimo'}] tentativo ${i + 2}/${tentativi}`)
    }
  }

  throw ultimoErrore instanceof Error
    ? ultimoErrore
    : new Error(`callClaude[${options.label ?? 'anonimo'}] fallito`)
}

// ─── Parsing JSON ────────────────────────────────────────────────────────────

/**
 * Sanitizza JSON con newline/tab letterali dentro le stringhe.
 * Scansiona carattere per carattere tenendo traccia di essere dentro una stringa.
 */
function sanitizeJson(text: string): string {
  let result = ''
  let inString = false
  let escape = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (escape) {
      result += ch
      escape = false
      continue
    }

    if (ch === '\\' && inString) {
      result += ch
      escape = true
      continue
    }

    if (ch === '"') {
      inString = !inString
      result += ch
      continue
    }

    if (inString) {
      // Escape caratteri di controllo che invalidano il JSON
      if (ch === '\n') { result += '\\n'; continue }
      if (ch === '\r') { result += '\\r'; continue }
      if (ch === '\t') { result += '\\t'; continue }
      if (ch.charCodeAt(0) < 0x20) {
        result += `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`
        continue
      }
    }

    result += ch
  }

  return result
}

/**
 * Trova il primo oggetto/array JSON valido nel testo.
 */
function extractJson(text: string): string | null {
  // Prima cerca blocchi ```json ... ```
  const fenced = text.match(/```json\s*([\s\S]*?)```/)
  if (fenced) {
    try { JSON.parse(fenced[1].trim()); return fenced[1].trim() } catch {
      try { return sanitizeJson(fenced[1].trim()) } catch { /* continua */ }
    }
  }

  // Scansiona per trovare il primo JSON bilanciato
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch !== '{' && ch !== '[') continue

    const close = ch === '{' ? '}' : ']'
    let depth = 0
    let inStr = false
    let esc = false

    for (let j = i; j < text.length; j++) {
      const c = text[j]
      if (esc) { esc = false; continue }
      if (c === '\\' && inStr) { esc = true; continue }
      if (c === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (c === ch) depth++
      else if (c === close) {
        depth--
        if (depth === 0) {
          const candidate = text.slice(i, j + 1)
          try { JSON.parse(candidate); return candidate } catch {
            // Prova a sanitizzare
            try {
              const sanitized = sanitizeJson(candidate)
              JSON.parse(sanitized)
              return sanitized
            } catch { break }
          }
        }
      }
    }
  }
  return null
}

export async function callClaudeJson<T>(prompt: string, options: CallOptions = {}): Promise<T> {
  const text = await callClaude(prompt, options)

  // Tenta parse diretto
  try { return JSON.parse(text) as T } catch { /* continua */ }

  // Tenta sanitizzazione diretta
  try { return JSON.parse(sanitizeJson(text)) as T } catch { /* continua */ }

  // Estrai il primo JSON valido nel testo
  const extracted = extractJson(text)
  if (!extracted) {
    throw new Error(
      `callClaudeJson[${options.label ?? 'anonimo'}]: risposta non è JSON valido.\nRisposta: ${text.slice(0, 500)}`
    )
  }
  return JSON.parse(extracted) as T
}
