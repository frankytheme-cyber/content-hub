import { Queue, Worker } from 'bullmq'
import { getRedis } from './redis'
import type { WizardInput } from '@/types/agents'

const QUEUE_NAME = 'pipeline'

export interface PipelineJobData {
  sessionId: string
  jobId: string
  input: WizardInput
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

let worker: Worker | null = null

export async function startWorker() {
  if (worker) return worker

  const connection = await getRedis()
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { runPipeline } = await import('@/agents')
      await runPipeline(job.data as PipelineJobData)
    },
    {
      connection,
      concurrency: 2,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job ${job?.id} fallito:`, err.message)
  })

  return worker
}
