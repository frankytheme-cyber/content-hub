import { getRedis } from './redis'
import type { JobEvent } from '@/types/agents'

const CHANNEL_PREFIX = 'job:'

export function channelName(jobId: string) {
  return `${CHANNEL_PREFIX}${jobId}`
}

export async function emitJobEvent(evento: JobEvent) {
  const redis = await getRedis()
  await redis.publish(channelName(evento.jobId), JSON.stringify(evento))
}
