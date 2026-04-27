import Redis from 'ioredis'

const LOCAL_URL = 'redis://localhost:6379'

const globalForRedis = globalThis as unknown as {
  redis: Redis
  resolvedUrl: string
}

function makeClient(url: string) {
  const tls = url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls,
  })
  client.on('error', (err) => {
    console.error(`[Redis] Errore:`, err.message)
    // Se Upstash quota esaurita, invalida la cache così il prossimo getRedis() riproverà con locale
    if (err.message?.includes('max requests limit exceeded') && globalForRedis.resolvedUrl !== LOCAL_URL) {
      console.warn('[Redis] Quota Upstash esaurita, reset a locale al prossimo avvio.')
      delete (globalForRedis as any).resolvedUrl
      delete (globalForRedis as any).redis
    }
  })
  return client
}

/**
 * Testa la connessione remota con un PING.
 * Se fallisce (es. limite Upstash superato), ritorna la URL locale.
 */
async function resolveUrl(): Promise<string> {
  if (globalForRedis.resolvedUrl) return globalForRedis.resolvedUrl

  const remoteUrl = process.env.REDIS_URL
  if (remoteUrl && remoteUrl !== LOCAL_URL) {
    const probe = new Redis(remoteUrl, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      connectTimeout: 5000,
      tls: remoteUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    })
    try {
      await probe.ping()
      globalForRedis.resolvedUrl = remoteUrl
      probe.disconnect()
      return remoteUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[Redis] Remote non disponibile (${msg}), fallback a locale.`)
      probe.disconnect()
    }
  }

  globalForRedis.resolvedUrl = LOCAL_URL
  return LOCAL_URL
}

/**
 * Ritorna il client Redis singleton.
 * Al primo avvio testa il remote; se non disponibile usa localhost.
 */
export async function getRedis(): Promise<Redis> {
  if (globalForRedis.redis) return globalForRedis.redis

  const url = await resolveUrl()
  const client = makeClient(url)
  globalForRedis.redis = client
  return client
}

export async function createSubscriber(): Promise<Redis> {
  const url = await resolveUrl()
  const tls = url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  return new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls,
  })
}
