import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runPublisherAgent } from '@/agents/publisher'

const publishSchema = z.object({
  versioneId: z.string().min(1),
  wpSiteUrl: z.string().url(),
  stato: z.enum(['draft', 'publish']).default('draft'),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await req.json()
    const input = publishSchema.parse(body)

    const result = await runPublisherAgent({
      versioneId: input.versioneId,
      wpSiteUrl: input.wpSiteUrl,
      stato: input.stato,
    })

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errore: 'Dati non validi', dettagli: err.issues }, { status: 400 })
    }
    const messaggio = err instanceof Error ? err.message : 'Errore interno'
    console.error(`[POST /api/articles/${id}/publish]`, err)
    return NextResponse.json({ errore: messaggio }, { status: 500 })
  }
}
