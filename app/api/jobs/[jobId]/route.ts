import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enqueueJob, startWorker } from '@/lib/job-queue'
import type { WizardInput } from '@/types/agents'

const PROGRESSO_PER_FASE: Record<string, number> = {
  ricerca: 20,
  generazione: 50,
  revisione: 68,
  seo: 83,
  immagini: 93,
  salvataggio: 95,
  completato: 100,
  errore: 0,
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) {
    return NextResponse.json({ errore: 'Job non trovato' }, { status: 404 })
  }

  return NextResponse.json({
    id: job.id,
    stato: job.stato,
    fase: job.fase,
    progresso: PROGRESSO_PER_FASE[job.fase ?? ''] ?? 0,
    sessionId: job.sessionId,
    errore: job.errore,
  })
}

// POST /api/jobs/[jobId]/retry — riprende un job fallito dal checkpoint
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { session: { include: { linkInterni: true } } },
  })

  if (!job) return NextResponse.json({ errore: 'Job non trovato' }, { status: 404 })
  if (job.stato !== 'FALLITO') return NextResponse.json({ errore: 'Il job non è in stato FALLITO' }, { status: 400 })

  // Reset job a IN_CODA mantenendo la fase come checkpoint
  await Promise.all([
    prisma.job.update({
      where: { id: jobId },
      data: { stato: 'IN_CODA', errore: null },
    }),
    prisma.session.update({
      where: { id: job.sessionId },
      data: { stato: 'IN_ATTESA' },
    }),
  ])

  const input: WizardInput = {
    categoria: job.session.categoria,
    argomento: job.session.argomento,
    fonti: job.session.fonti,
    linkInterni: job.session.linkInterni.map((l) => ({ testo: l.testo, url: l.url })),
  }

  await startWorker()
  await enqueueJob({ sessionId: job.sessionId, jobId, input })

  return NextResponse.json({ ok: true })
}
