import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  stato: z.enum(['pendente', 'approvato', 'rifiutato']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { stato } = schema.parse(body)

    const aggiornato = await prisma.linkSuggestion.update({
      where: { id },
      data: { stato },
    })

    return NextResponse.json(aggiornato)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errore: 'Dati non validi', dettagli: err.issues }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ errore: msg }, { status: 500 })
  }
}
