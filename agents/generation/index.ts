import { callClaudeJson } from '@/lib/claude-cli'
import { buildGenerationPrompt } from './prompts'
import type { GenerationInput, GenerationResult, ArticoloBozza } from '@/types/agents'

const TONI: [string, string] = ['autorevole e professionale', 'colloquiale e coinvolgente']

async function generateSingleVersion(
  input: GenerationInput,
  tono: string
): Promise<ArticoloBozza> {
  const prompt = buildGenerationPrompt(input, tono)

  const parsed = await callClaudeJson<{ titolo: string; corpo: string; estratto: string }>(
    prompt,
    { timeout: 4 * 60 * 1000 }
  )

  return {
    tono,
    titolo: parsed.titolo,
    corpo: parsed.corpo,
    estratto: parsed.estratto,
  }
}

export async function runGenerationAgent(input: GenerationInput): Promise<GenerationResult> {
  const toni = input.toni ?? TONI

  const [versione1, versione2] = await Promise.all([
    generateSingleVersion(input, toni[0]),
    generateSingleVersion(input, toni[1]),
  ])

  return {
    versioni: [versione1, versione2],
  }
}
