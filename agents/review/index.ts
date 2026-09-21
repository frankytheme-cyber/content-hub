import { callClaudeJson } from '@/lib/claude-cli'
import { buildReviewPrompt } from './prompts'
import type { ReviewInput, ReviewResult, ReviewCorrezione } from '@/types/agents'

const TIPI_VALIDI = new Set(['fattuale', 'grammatica', 'stile'])

function normalizzaCorrezioni(correzioni: unknown): ReviewCorrezione[] {
  if (!Array.isArray(correzioni)) return []

  return correzioni
    .filter((c): c is ReviewCorrezione =>
      Boolean(c) &&
      typeof c === 'object' &&
      typeof (c as ReviewCorrezione).originale === 'string' &&
      typeof (c as ReviewCorrezione).corretto === 'string' &&
      (c as ReviewCorrezione).originale.trim().length > 0
    )
    // Una "correzione" identica all'originale è rumore: applicarla non cambia nulla.
    .filter((c) => c.originale !== c.corretto)
    .map((c) => ({
      tipo: TIPI_VALIDI.has(c.tipo) ? c.tipo : 'stile',
      originale: c.originale,
      corretto: c.corretto,
      spiegazione: c.spiegazione ?? '',
    }))
    .slice(0, 12)
}

export async function runReviewAgent(input: ReviewInput): Promise<ReviewResult> {
  const prompt = buildReviewPrompt(input)

  try {
    const result = await callClaudeJson<ReviewResult>(prompt, {
      tier: 'standard',
      label: 'review',
      timeout: 3 * 60 * 1000,
    })

    const punteggio = Number(result.punteggio)

    return {
      approvato: result.approvato ?? punteggio >= 75,
      punteggio: Number.isFinite(punteggio) ? Math.max(0, Math.min(100, punteggio)) : 75,
      correzioni: normalizzaCorrezioni(result.correzioni),
    }
  } catch (err) {
    console.warn('[review] risposta non parsabile, articolo passato senza correzioni:', err instanceof Error ? err.message : err)
    return { approvato: true, punteggio: 75, correzioni: [] }
  }
}
