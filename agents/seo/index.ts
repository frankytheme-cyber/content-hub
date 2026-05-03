import { callClaude } from '@/lib/claude-cli'
import { buildSeoPrompt } from './prompts'
import type { SeoInput, SeoResult, SeoMetadata } from '@/types/agents'

function parseRisposta(text: string): SeoResult {
  const articleMatch = text.match(/<ARTICLE>([\s\S]*?)<\/ARTICLE>/)
  const metaMatch = text.match(/<META>([\s\S]*?)<\/META>/)

  const corpoOttimizzato = articleMatch?.[1].trim() ?? ''

  let metadata: SeoMetadata = {
    metaTitolo: '',
    metaDescrizione: '',
    keywordPrincipale: '',
    keywordSecondarie: [],
    slug: '',
    schemaMarkup: {},
    geoHints: [],
    ogTitolo: '',
    ogDescrizione: '',
  }

  if (metaMatch) {
    try {
      metadata = { ...metadata, ...JSON.parse(metaMatch[1].trim()) }
    } catch {
      // meta non parsabile, usiamo i default
    }
  }

  return { metadata, corpoOttimizzato }
}

export async function runSeoAgent(input: SeoInput): Promise<SeoResult> {
  const prompt = buildSeoPrompt(input)
  const text = await callClaude(prompt, { timeout: 4 * 60 * 1000 })
  return parseRisposta(text)
}
