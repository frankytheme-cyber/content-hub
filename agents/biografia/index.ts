import { callClaudeJson, tierLongform, thinkingLongform } from '@/lib/claude-cli'
import { buildBiografiaPrompt } from './template'
import type { ResearchResult, ArticoloBozza, LinkInternoInput } from '@/types/agents'

export interface BiografiaInput {
  ricerca: ResearchResult
  argomento: string
  categoria: string
  linkRecensioni: LinkInternoInput[]
  sitoIstruzioni?: string
}

interface BiografiaRaw {
  titolo: string
  corpo: string
  estratto: string
  tag: string[]
  schemaJsonLd: object
}

export interface BiografiaResult {
  versione: ArticoloBozza & { schemaJsonLd: object; tag: string[] }
}

export async function runBiografiaAgent(input: BiografiaInput): Promise<BiografiaResult> {
  const prompt = buildBiografiaPrompt(input)

  const raw = await callClaudeJson<BiografiaRaw>(prompt, {
    tier: tierLongform(),
    label: 'biografia',
    timeout: 15 * 60 * 1000,
    thinkingTokens: thinkingLongform(),
  })

  return {
    versione: {
      titolo: raw.titolo,
      corpo: raw.corpo,
      estratto: raw.estratto,
      tono: 'biografia musicale',
      schemaJsonLd: raw.schemaJsonLd ?? {},
      tag: raw.tag ?? [],
    },
  }
}
