import { spawn } from 'child_process'

const CLAUDE_BIN = process.env.CLAUDE_BIN ?? 'claude'
const DEFAULT_TIMEOUT = 5 * 60 * 1000

export function callClaude(
  prompt: string,
  options: { timeout?: number } = {}
): Promise<string> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT

  return new Promise((resolve, reject) => {
    const child = spawn(CLAUDE_BIN, ['--print', '--output-format', 'text', '--dangerously-skip-permissions'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

    const timer = setTimeout(() => {
      child.kill()
      reject(new Error(`callClaude timeout dopo ${timeout / 1000}s`))
    }, timeout)

    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) {
        reject(new Error(`claude CLI uscito con codice ${code}: ${stderr.slice(0, 500)}`))
      } else {
        resolve(stdout.trim())
      }
    })

    child.on('error', (err) => {
      clearTimeout(timer)
      reject(new Error(`Impossibile avviare claude CLI: ${err.message}`))
    })

    child.stdin.write(prompt)
    child.stdin.end()
  })
}

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

export async function callClaudeJson<T>(
  prompt: string,
  options: { timeout?: number } = {}
): Promise<T> {
  const text = await callClaude(prompt, options)

  // Tenta parse diretto
  try { return JSON.parse(text) as T } catch { /* continua */ }

  // Tenta sanitizzazione diretta
  try { return JSON.parse(sanitizeJson(text)) as T } catch { /* continua */ }

  // Estrai il primo JSON valido nel testo
  const extracted = extractJson(text)
  if (!extracted) {
    throw new Error(
      `callClaudeJson: risposta non è JSON valido.\nRisposta: ${text.slice(0, 500)}`
    )
  }
  return JSON.parse(extracted) as T
}
