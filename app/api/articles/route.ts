import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { ArticlesResponse } from '@/types/api'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const stato = searchParams.get('stato') ?? undefined
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
  const skip = (page - 1) * limit

  const where = stato ? { stato: stato as any } : {}

  const [articoli, totale] = await Promise.all([
    prisma.articolo.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        session: { select: { categoria: true, argomento: true } },
        versioni: {
          select: {
            id: true,
            tono: true,
            indice: true,
            punteggio: true,
            immagineUrl: true,
          },
        },
      },
    }),
    prisma.articolo.count({ where }),
  ])

  const response: ArticlesResponse = {
    articoli: articoli.map((a: typeof articoli[0]) => ({
      id: a.id,
      titolo: a.titolo,
      slug: a.slug,
      stato: a.stato,
      categoria: a.session.categoria,
      createdAt: a.createdAt.toISOString(),
      versioneScelta: a.versioneScelta,
      versioni: a.versioni,
    })),
    totale,
    pagina: page,
    perPagina: limit,
  }

  return NextResponse.json(response)
}
