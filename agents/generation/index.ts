import { callClaude, tierLongform, thinkingLongform } from '@/lib/claude-cli'
import { troncaTesto, estraiPrimoParagrafo, MAX_META_DESCRIZIONE } from '@/lib/seo-utils'
import { buildGenerationPrompt } from './prompts'
import type { GenerationInput, GenerationResult, ArticoloBozza } from '@/types/agents'

export const TONI_DEFAULT = ['autorevole e professionale', 'colloquiale e coinvolgente']

/**
 * Numero di versioni generate per articolo.
 *
 * Ogni versione in più costa una generazione + una revisione + un passaggio SEO.
 * Imposta `ARTICLE_VERSIONI=1` per dimezzare il costo per articolo rinunciando
 * alla scelta fra due toni.
 */
export function numeroVersioni(): number {
  const n = Number(process.env.ARTICLE_VERSIONI ?? 2)
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), TONI_DEFAULT.length) : 2
}

function parseRisposta(text: string, tono: string, argomento: string): ArticoloBozza {
  const articleMatch = text.match(/<ARTICLE>([\s\S]*?)<\/ARTICLE>/)
  const metaMatch = text.match(/<META>([\s\S]*?)<\/META>/)

  if (!articleMatch) {
    throw new Error('Risposta malformata: tag <ARTICLE> non trovato')
  }

  const corpo = articleMatch[1].trim()

  let titolo = ''
  let estratto = ''

  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1].trim())
      titolo = String(meta.titolo ?? '').trim()
      estratto = String(meta.estratto ?? '').trim()
    } catch {
      // meta non parsabile: ricostruiamo i campi dal corpo qui sotto
    }
  }

  // Un titolo vuoto produrrebbe uno slug vuoto e un articolo senza nome in dashboard.
  if (!titolo) {
    titolo = corpo.match(/^#\s+(.+)$/m)?.[1]?.trim() || argomento
  }
  if (!estratto) {
    estratto = troncaTesto(estraiPrimoParagrafo(corpo), MAX_META_DESCRIZIONE)
  }

  return { tono, titolo, corpo, estratto }
}

async function generateSingleVersion(
  input: GenerationInput,
  tono: string
): Promise<ArticoloBozza> {
  const prompt = buildGenerationPrompt(input, tono)
  const text = await callClaude(prompt, {
    tier: tierLongform(),
    label: `generation:${tono.split(' ')[0]}`,
    timeout: 8 * 60 * 1000,
    thinkingTokens: thinkingLongform(),
  })
  return parseRisposta(text, tono, input.argomento)
}

export async function runGenerationAgent(input: GenerationInput): Promise<GenerationResult> {
  const toni = (input.toni?.length ? input.toni : TONI_DEFAULT).slice(0, numeroVersioni())

  const versioni = await Promise.all(toni.map((tono) => generateSingleVersion(input, tono)))

  return { versioni }
}
