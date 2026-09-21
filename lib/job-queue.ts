import { Queue, Worker } from 'bullmq'
import { getRedis } from './redis'
import type { WizardInput } from '@/types/agents'

const QUEUE_NAME = 'pipeline'
const LINK_QUEUE_NAME = 'internal-linking'

export interface PipelineJobData {
  sessionId: string
  jobId: string
  input: WizardInput
  tipo?: 'CREAZIONE' | 'AGGIORNAMENTO'
}

export interface LinkAnalysisJobData {
  jobId: string
  sitoId: string
}

let queue: Queue | null = null

async function getQueue(): Promise<Queue> {
  if (queue) return queue
  const connection = await getRedis()
  queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  })
  return queue
}

export async function enqueueJob(data: PipelineJobData) {
  const q = await getQueue()
  await q.add('run', data, {
    jobId: data.jobId,
  })
}

// Usato per retry: non imposta jobId BullMQ per evitare conflitti con job falliti
export async function reEnqueueJob(data: PipelineJobData) {
  const q = await getQueue()
  await q.add('run', data)
}

let worker: Worker | null = null

export async function startWorker() {
  if (worker) return worker

  // Recovery: i job rimasti IN_ESECUZIONE/IN_CODA da una sessione precedente sono orfani
  const { prisma } = await import('./prisma')
  const { count } = await prisma.job.updateMany({
    where: { stato: { in: ['IN_ESECUZIONE', 'IN_CODA'] } },
    data: { stato: 'FALLITO', errore: 'Job interrotto al riavvio del server.' },
  })
  if (count > 0) {
    await prisma.session.updateMany({
      where: { stato: { in: ['IN_CORSO', 'IN_ATTESA'] } },
      data: { stato: 'FALLITA' },
    })
    console.log(`[Worker] Recuperati ${count} job orfani`)
  }

  const connection = await getRedis()
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const data = job.data as PipelineJobData
      if (data.tipo === 'AGGIORNAMENTO') {
        const { runAggiornamentoPipeline } = await import('@/agents')
        await runAggiornamentoPipeline(data)
      } else {
        const { runPipeline } = await import('@/agents')
        await runPipeline(data)
      }
    },
    {
      connection,
      concurrency: 2,
      lockDuration: 20 * 60 * 1000,
      maxStalledCount: 1,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} fallito:`, err.message)
  })

  return worker
}

let linkQueue: Queue | null = null

async function getLinkQueue(): Promise<Queue> {
  if (linkQueue) return linkQueue
  const connection = await getRedis()
  linkQueue = new Queue(LINK_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  })
  return linkQueue
}

export async function enqueueInternalLinkingJob(data: LinkAnalysisJobData) {
  const q = await getLinkQueue()
  // Non riusiamo data.jobId come BullMQ job ID per evitare conflitti al retry
  await q.add('analyze', data)
}

let linkWorker: Worker | null = null

export async function startInternalLinkingWorker() {
  if (linkWorker) return linkWorker

  // Recovery: i job rimasti in_corso/in_coda da una sessione precedente sono orfani
  // (il worker BullMQ è morto al riavvio del dev server). Li marchiamo come errore.
  const { prisma } = await import('./prisma')
  const { count } = await prisma.linkAnalysisJob.updateMany({
    where: { stato: { in: ['in_corso', 'in_coda'] } },
    data: {
      stato: 'errore',
      fase: 'errore',
      errore: 'Job interrotto al riavvio del server. Avvia una nuova analisi.',
    },
  })
  if (count > 0) console.log(`[LinkWorker] Recuperati ${count} job orfani`)

  const connection = await getRedis()
  linkWorker = new Worker(
    LINK_QUEUE_NAME,
    async (job) => {
      const { runInternalLinkingJob } = await import('@/agents/internal-linking')
      await runInternalLinkingJob(job.data as LinkAnalysisJobData)
    },
    {
      connection,
      concurrency: 1,
      lockDuration: 20 * 60 * 1000,   // 20 min: sufficiente per analisi grandi
      maxStalledCount: 1,
    }
  )

  linkWorker.on('failed', (job, err) => {
    console.error(`[LinkWorker] Job ${job?.id} fallito:`, err.message)
  })

  return linkWorker
}
