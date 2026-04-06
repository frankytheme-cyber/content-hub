import { callClaudeJson } from '@/lib/claude-cli'
import { buildSeoPrompt } from './prompts'
import type { SeoInput, SeoResult } from '@/types/agents'

export async function runSeoAgent(input: SeoInput): Promise<SeoResult> {
  const prompt = buildSeoPrompt(input)
  return callClaudeJson<SeoResult>(prompt, { timeout: 4 * 60 * 1000 })
}
