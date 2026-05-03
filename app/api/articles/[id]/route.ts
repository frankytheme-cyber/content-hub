import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const patchSchema = z.object({
  versioneScelta: z.string().optional(),
  stato: z.enum(['BOZZA', 'REVISIONE', 'APPROVATO', 'PUBBLICATO']).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const articolo = await prisma.articolo.findUnique({
    where: { id },
    include: {
      session: {
        select: {
          categoria: true,
          argomento: true,
          tipo: true,
          contenutoOriginale: true,
          wpPostId: true,
          wpPostUrl: true,
          wpPostType: true,
          focusAggiornamento: true,
          sito: { select: { wpSiteUrl: true, wpUsername: true, wpAppPassword: true } },
        },
      },
      versioni: true,
    },
  })

  if (!articolo) {
    return NextResponse.json({ errore: 'Articolo non trovato' }, { status: 404 })
  }

  return NextResponse.json({
    ...articolo,
    createdAt: articolo.createdAt.toISOString(),
    pubblicatoIl: articolo.pubblicatoIl?.toISOString() ?? null,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await req.json()
    const data = patchSchema.parse(body)

    const aggiornato = await prisma.articolo.update({
      where: { id },
      data,
    })

    return NextResponse.json(aggiornato)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errore: 'Dati non validi' }, { status: 400 })
    }
    return NextResponse.json({ errore: 'Errore interno' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  await prisma.articolo.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
