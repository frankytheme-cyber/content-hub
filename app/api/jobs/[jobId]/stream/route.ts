import { NextRequest } from 'next/server'
import { createSubscriber } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

function getChannelName(jobId: string) {
  return `job:${jobId}`
}

const PROGRESSO_PER_FASE: Record<string, number> = {
  ricerca: 20,
  generazione: 50,
  revisione: 68,
  seo: 83,
  immagini: 93,
  salvataggio: 95,
  recupero: 10,
  aggiornamento: 65,
  completato: 100,
  errore: 0,
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const encoder = new TextEncoder()
  let subscriber: Awaited<ReturnType<typeof createSubscriber>> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch { /* stream già chiuso */ }
      }

      // Invia subito lo stato attuale del job (catch-up)
      const job = await prisma.job.findUnique({ where: { id: jobId } })
      if (job) {
        const fase = job.fase ?? 'ricerca'
        const progresso = PROGRESSO_PER_FASE[fase] ?? 0

        if (job.stato === 'COMPLETATO') {
          enqueue({ jobId, fase: 'completato', progresso: 100, messaggio: 'Articolo pronto.' })
          controller.close()
          return
        }

        if (job.stato === 'FALLITO') {
          enqueue({ jobId, fase: 'errore', progresso: 0, messaggio: job.errore ?? 'Errore sconosciuto' })
          controller.close()
          return
        }

        if (job.stato === 'IN_ESECUZIONE' && fase) {
          enqueue({ jobId, fase, progresso, messaggio: `In esecuzione: ${fase}` })
        }
      }

      // Poi ascolta eventi futuri via Redis pub/sub
      subscriber = await createSubscriber()
      const channel = getChannelName(jobId)

      subscriber.on('message', (_ch: string, message: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`))
          const evento = JSON.parse(message)
          if (evento.fase === 'completato' || evento.fase === 'errore') {
            subscriber?.quit()
            subscriber = null
            controller.close()
          }
        } catch { /* ignora */ }
      })

      subscriber.on('error', () => {
        controller.close()
      })

      await subscriber.subscribe(channel)

      setTimeout(() => {
        subscriber?.quit()
        subscriber = null
        try { controller.close() } catch { /* già chiuso */ }
      }, 10 * 60 * 1000)
    },
    cancel() {
      subscriber?.quit()
      subscriber = null
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
