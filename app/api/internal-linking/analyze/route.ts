import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { enqueueInternalLinkingJob, startInternalLinkingWorker } from '@/lib/job-queue'

const schema = z.object({ sitoId: z.string().min(1) })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sitoId } = schema.parse(body)

    const sito = await prisma.sito.findUnique({ where: { id: sitoId } })
    if (!sito) return NextResponse.json({ errore: 'Sito non trovato' }, { status: 404 })
    if (!sito.wpSiteUrl || !sito.wpUsername || !sito.wpAppPassword) {
      return NextResponse.json({ errore: 'Credenziali WordPress non configurate' }, { status: 400 })
    }

    const job = await prisma.linkAnalysisJob.create({
      data: { sitoId },
    })

    await startInternalLinkingWorker()
    await enqueueInternalLinkingJob({ jobId: job.id, sitoId })

    return NextResponse.json({ jobId: job.id }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errore: 'Dati non validi', dettagli: err.issues }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/internal-linking/analyze]', err)
    return NextResponse.json({ errore: 'Errore interno', dettaglio: msg }, { status: 500 })
  }
}
