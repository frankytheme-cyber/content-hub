import { NextRequest } from 'next/server'
import { createSubscriber } from '@/lib/redis'
import { prisma } from '@/lib/prisma'

function getChannelName(jobId: string) {
  return `link-job:${jobId}`
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

      const job = await prisma.linkAnalysisJob.findUnique({ where: { id: jobId } })
      if (job) {
        enqueue({
          jobId,
          fase: job.fase,
          progresso: job.progresso,
          totalePost: job.totalePost,
          postProcessati: job.postProcessati,
          messaggio: job.stato === 'errore' ? job.errore ?? 'Errore' : `Stato: ${job.stato}`,
        })
        if (job.stato === 'completato' || job.stato === 'errore') {
          controller.close()
          return
        }
      }

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

      subscriber.on('error', () => controller.close())

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
