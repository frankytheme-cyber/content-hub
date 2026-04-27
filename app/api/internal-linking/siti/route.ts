import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startInternalLinkingWorker } from '@/lib/job-queue'

export async function GET() {
  // Avvia il worker se non è già attivo (idempotente — sicuro chiamarlo ad ogni request)
  startInternalLinkingWorker().catch((e) => console.error('[link-worker] avvio fallito:', e))

  try {
    const siti = await prisma.sito.findMany({
    select: {
      id: true,
      nome: true,
      dominio: true,
      wpSiteUrl: true,
      wpUsername: true,
      wpAppPassword: true,
      linkAnalysisJobs: {
        orderBy: { creatoIl: 'desc' },
        take: 1,
        select: {
          id: true,
          stato: true,
          fase: true,
          progresso: true,
          totalePost: true,
          creatoIl: true,
          aggiornatoIl: true,
        },
      },
    },
    orderBy: { nome: 'asc' },
  })

    return NextResponse.json({
      siti: siti.map((s) => ({
        id: s.id,
        nome: s.nome,
        dominio: s.dominio,
        wpSiteUrl: s.wpSiteUrl,
        credenzialiConfigurate: Boolean(s.wpSiteUrl && s.wpUsername && s.wpAppPassword),
        ultimoJob: s.linkAnalysisJobs[0] ?? null,
      })),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[GET /api/internal-linking/siti]', err)
    return NextResponse.json({ errore: msg }, { status: 500 })
  }
}
