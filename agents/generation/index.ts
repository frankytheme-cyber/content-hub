import { callClaude } from '@/lib/claude-cli'
import { buildGenerationPrompt } from './prompts'
import type { GenerationInput, GenerationResult, ArticoloBozza } from '@/types/agents'

const TONI: [string, string] = ['autorevole e professionale', 'colloquiale e coinvolgente']

function parseRisposta(text: string, tono: string): ArticoloBozza {
  const articleMatch = text.match(/<ARTICLE>([\s\S]*?)<\/ARTICLE>/)
  const metaMatch = text.match(/<META>([\s\S]*?)<\/META>/)

  if (!articleMatch) {
    throw new Error('Risposta malformata: tag <ARTICLE> non trovato')
  }

  let titolo = ''
  let estratto = ''

  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1].trim())
      titolo = meta.titolo ?? ''
      estratto = meta.estratto ?? ''
    } catch {
      // meta non parsabile, titolo e estratto restano vuoti
    }
  }

  return {
    tono,
    titolo,
    corpo: articleMatch[1].trim(),
    estratto,
  }
}

async function generateSingleVersion(
  input: GenerationInput,
  tono: string
): Promise<ArticoloBozza> {
  const prompt = buildGenerationPrompt(input, tono)
  const text = await callClaude(prompt, { timeout: 4 * 60 * 1000 })
  return parseRisposta(text, tono)
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
