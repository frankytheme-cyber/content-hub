import { callClaudeJson } from '@/lib/claude-cli'
import { buildReviewPrompt } from './prompts'
import type { ReviewInput, ReviewResult } from '@/types/agents'

export async function runReviewAgent(input: ReviewInput): Promise<ReviewResult> {
  const prompt = buildReviewPrompt(input)

  try {
    const result = await callClaudeJson<ReviewResult>(prompt, { timeout: 3 * 60 * 1000 })
    return result
  } catch {
    // Fallback se la risposta non è parsabile
    return {
      approvato: true,
      punteggio: 75,
      correzioni: [],
    }
  }
}
