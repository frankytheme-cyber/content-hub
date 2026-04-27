import { getRedis } from './redis'
import type { JobEvent, LinkAnalysisEvent } from '@/types/agents'

const CHANNEL_PREFIX = 'job:'
const LINK_CHANNEL_PREFIX = 'link-job:'

export function channelName(jobId: string) {
  return `${CHANNEL_PREFIX}${jobId}`
}

export function linkChannelName(jobId: string) {
  return `${LINK_CHANNEL_PREFIX}${jobId}`
}

export async function emitJobEvent(evento: JobEvent) {
  const redis = await getRedis()
  await redis.publish(channelName(evento.jobId), JSON.stringify(evento))
}

export async function emitLinkAnalysisEvent(evento: LinkAnalysisEvent) {
  const redis = await getRedis()
  await redis.publish(linkChannelName(evento.jobId), JSON.stringify(evento))
}
