import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { enqueueJob, startWorker } from '@/lib/job-queue'
import type { WizardResponse } from '@/types/api'

const linkSchema = z.object({
  testo: z.string().min(1),
  url: z.string().url(),
})

const wizardSchema = z.object({
  sitoId: z.string().optional(),
  tipoArticolo: z.enum(['standard', 'recensione']).default('standard'),
  linkAmazon: z.string().optional(),
  categoria: z.string().min(1, 'Categoria obbligatoria'),
  argomento: z.string().min(3, 'Argomento troppo breve'),
  fonti: z.array(z.string()).default([]),
  linkInterni: z.array(linkSchema).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = wizardSchema.parse(body)

    // Carica istruzioni del sito se presente e verifica che esista in DB
    let resolvedSitoId: string | null = null
    let sitoIstruzioni: string | undefined
    if (input.sitoId) {
      const sito = await prisma.sito.findUnique({ where: { id: input.sitoId } })
      if (sito) {
        resolvedSitoId = sito.id
        sitoIstruzioni = sito.istruzioni || undefined
      }
    }

    // Crea sessione nel DB
    const session = await prisma.session.create({
      data: {
        sitoId: resolvedSitoId,
        categoria: input.categoria,
        argomento: input.argomento,
        fonti: input.fonti,
        linkInterni: {
          create: input.linkInterni,
        },
      },
    })

    // Crea job
    const job = await prisma.job.create({
      data: { sessionId: session.id },
    })

    // Avvia worker (idempotente) ed accoda il job
    await startWorker()
    await enqueueJob({
      sessionId: session.id,
      jobId: job.id,
      input: { ...input, sitoId: resolvedSitoId ?? undefined, sitoIstruzioni },
    })

    const response: WizardResponse = {
      jobId: job.id,
      sessionId: session.id,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { errore: 'Dati non validi', dettagli: err.issues },
        { status: 400 }
      )
    }
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/wizard]', err)
    return NextResponse.json(
      { errore: 'Errore interno', dettaglio: msg },
      { status: 500 }
    )
  }
}
