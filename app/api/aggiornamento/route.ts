import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { enqueueJob, startWorker } from '@/lib/job-queue'

const aggiornamentoSchema = z.object({
  sitoId: z.string().min(1, 'sitoId obbligatorio'),
  wpPostId: z.number().int().positive(),
  wpPostUrl: z.string().url(),
  wpPostTitle: z.string().min(1),
  wpPostType: z.string().default('posts'),
  focus: z.string().optional(),
  tipoArticolo: z.enum(['standard', 'biografia']).default('standard'),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = aggiornamentoSchema.parse(body)

    const sito = await prisma.sito.findUnique({ where: { id: input.sitoId } })
    if (!sito) {
      return NextResponse.json({ errore: 'Sito non trovato' }, { status: 404 })
    }

    const session = await prisma.session.create({
      data: {
        sitoId: sito.id,
        tipo: 'AGGIORNAMENTO',
        categoria: sito.categorie[0] ?? 'generale',
        argomento: input.wpPostTitle,
        fonti: [],
        wpPostId: input.wpPostId,
        wpPostUrl: input.wpPostUrl,
        wpPostType: input.wpPostType,
        focusAggiornamento: input.focus ?? null,
      },
    })

    const job = await prisma.job.create({
      data: { sessionId: session.id },
    })

    await startWorker()
    await enqueueJob({
      sessionId: session.id,
      jobId: job.id,
      tipo: 'AGGIORNAMENTO',
      input: {
        sitoId: sito.id,
        sitoIstruzioni: sito.istruzioni || undefined,
        tipoArticolo: input.tipoArticolo,
        categoria: session.categoria,
        argomento: session.argomento,
        fonti: [],
        linkInterni: [],
      },
    })

    return NextResponse.json({ jobId: job.id, sessionId: session.id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errore: 'Dati non validi', dettagli: err.issues }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/aggiornamento]', err)
    return NextResponse.json({ errore: 'Errore interno', dettaglio: msg }, { status: 500 })
  }
}
