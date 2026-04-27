import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { applyLinkSuggestions } from '@/agents/internal-linking'

const schema = z.object({ ids: z.array(z.string().min(1)).min(1) })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ids } = schema.parse(body)

    const result = await applyLinkSuggestions(ids)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errore: 'Dati non validi', dettagli: err.issues }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/internal-linking/suggestions/apply]', err)
    return NextResponse.json({ errore: msg }, { status: 500 })
  }
}
