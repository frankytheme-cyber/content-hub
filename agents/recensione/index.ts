import { callClaudeJson } from '@/lib/claude-cli'
import { buildRecensionePrompt } from './template'
import type { ResearchResult, ArticoloBozza } from '@/types/agents'

export interface RecensioneInput {
  ricerca: ResearchResult
  argomento: string
  categoria: string
  linkAmazon: string
  sitoIstruzioni?: string
}

interface RecensioneRaw {
  titolo: string
  corpo: string
  estratto: string
  tag: string[]
  schemaJsonLd: object
}

export interface RecensioneResult {
  versione: ArticoloBozza & { schemaJsonLd: object; tag: string[] }
}

export async function runRecensioneAgent(input: RecensioneInput): Promise<RecensioneResult> {
  const prompt = buildRecensionePrompt(input)

  const raw = await callClaudeJson<RecensioneRaw>(prompt, { timeout: 15 * 60 * 1000 })

  return {
    versione: {
      titolo: raw.titolo,
      corpo: raw.corpo,
      estratto: raw.estratto,
      tono: 'recensione hi-fi',
      schemaJsonLd: raw.schemaJsonLd ?? {},
      tag: raw.tag ?? [],
    },
  }
}
