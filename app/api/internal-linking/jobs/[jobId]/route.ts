import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startInternalLinkingWorker, enqueueInternalLinkingJob } from '@/lib/job-queue'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params

  const job = await prisma.linkAnalysisJob.findUnique({
    where: { id: jobId },
    include: {
      sito: { select: { id: true, nome: true, dominio: true } },
      suggestions: {
        orderBy: [{ fonteTitolo: 'asc' }, { creatoIl: 'asc' }],
      },
    },
  })

  if (!job) return NextResponse.json({ errore: 'Job non trovato' }, { status: 404 })

  // Se il job è in attesa o in corso, assicura che il worker stia girando
  if (job.stato === 'in_coda' || job.stato === 'in_corso') {
    startInternalLinkingWorker().catch((e) => console.error('[link-worker] avvio fallito:', e))
  }

  return NextResponse.json({
    id: job.id,
    stato: job.stato,
    fase: job.fase,
    progresso: job.progresso,
    totalePost: job.totalePost,
    postProcessati: job.postProcessati,
    errore: job.errore,
    creatoIl: job.creatoIl,
    aggiornatoIl: job.aggiornatoIl,
    sito: job.sito,
    suggestions: job.suggestions,
  })
}

// POST /api/internal-linking/jobs/[jobId] — rimette in coda un job bloccato o in errore
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    const job = await prisma.linkAnalysisJob.findUnique({
      where: { id: jobId },
      include: { sito: { select: { id: true } } },
    })

    if (!job) return NextResponse.json({ errore: 'Job non trovato' }, { status: 404 })

    await prisma.linkAnalysisJob.update({
      where: { id: jobId },
      data: { stato: 'in_coda', fase: 'in_coda', progresso: 0, errore: null, postProcessati: 0 },
    })

    await startInternalLinkingWorker()
    await enqueueInternalLinkingJob({ jobId, sitoId: job.sito.id })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/internal-linking/jobs/[jobId]]', err)
    return NextResponse.json({ errore: msg }, { status: 500 })
  }
}
