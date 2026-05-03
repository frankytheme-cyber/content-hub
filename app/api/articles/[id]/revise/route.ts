import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runRevisioneAgent } from '@/agents/revisione'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const { versioneId, richiesta } = await req.json()
    if (!versioneId || !richiesta?.trim()) {
      return NextResponse.json({ errore: 'versioneId e richiesta sono obbligatori' }, { status: 400 })
    }

    const articolo = await prisma.articolo.findUnique({
      where: { id },
      include: {
        versioni: { orderBy: { indice: 'asc' } },
        session: { include: { sito: true } },
      },
    })
    if (!articolo) return NextResponse.json({ errore: 'Articolo non trovato' }, { status: 404 })

    const versione = articolo.versioni.find((v) => v.id === versioneId)
    if (!versione) return NextResponse.json({ errore: 'Versione non trovata' }, { status: 404 })

    const istruzioniSito = articolo.session.sito?.istruzioni ?? undefined

    const result = await runRevisioneAgent({
      titolo: articolo.titolo,
      corpo: versione.corpo,
      richiesta: richiesta.trim(),
      istruzioniSito,
    })

    const maxIndice = Math.max(...articolo.versioni.map((v) => v.indice), 0)

    const nuovaVersione = await prisma.versione.create({
      data: {
        articoloId: id,
        tono: versione.tono,
        indice: maxIndice + 1,
        corpo: result.corpo,
        noteRevisione: result.nota ?? `Revisione: ${richiesta.slice(0, 200)}`,
        seoJson: versione.seoJson ?? {},
        punteggio: null,
        immagineUrl: versione.immagineUrl,
        immagineCreditUrl: versione.immagineCreditUrl,
      },
    })

    return NextResponse.json({ versioneId: nuovaVersione.id })
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : 'Errore interno'
    console.error(`[POST /api/articles/${id}/revise]`, err)
    return NextResponse.json({ errore: messaggio }, { status: 500 })
  }
}
