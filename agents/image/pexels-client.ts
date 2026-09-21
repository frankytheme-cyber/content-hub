export interface PexelsPhoto {
  id: number
  width: number
  height: number
  url: string
  photographer: string
  photographer_url: string
  src: {
    original: string
    large2x: string
    large: string
    medium: string
    small: string
    portrait: string
    landscape: string
    tiny: string
  }
  alt: string
}

export interface PexelsSearchResponse {
  total_results: number
  page: number
  per_page: number
  photos: PexelsPhoto[]
}

export interface PexelsSearchOptions {
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'square'
  /** Pexels indicizza in inglese: forzare il locale migliora il matching. */
  locale?: string
}

function getApiKey(): string | null {
  return process.env.PEXELS_API_KEY ?? null
}

export function pexelsConfigurato(): boolean {
  return Boolean(getApiKey())
}

export async function pexelsSearch(
  query: string,
  optionsOrPerPage: PexelsSearchOptions | number = {}
): Promise<PexelsSearchResponse> {
  const options: PexelsSearchOptions =
    typeof optionsOrPerPage === 'number' ? { perPage: optionsOrPerPage } : optionsOrPerPage

  const key = getApiKey()
  if (!key) throw new Error('PEXELS_API_KEY non configurata')

  const params = new URLSearchParams({
    query,
    per_page: String(options.perPage ?? 15),
    locale: options.locale ?? 'en-US',
  })
  // `size` non viene più forzato: restringeva il bacino di risultati senza
  // migliorare la pertinenza, e large2x è comunque sufficiente per il web.
  if (options.orientation) params.set('orientation', options.orientation)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20_000)

  try {
    const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
      headers: { Authorization: key },
      signal: controller.signal,
    })

    if (!res.ok) {
      throw new Error(`Pexels search fallita: ${res.status}`)
    }

    return res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** Esegue più query in parallelo, ignorando quelle che falliscono. */
export async function pexelsSearchMulti(
  queries: string[],
  options: PexelsSearchOptions = {}
): Promise<Array<{ query: string; rank: number; photos: PexelsPhoto[] }>> {
  const esiti = await Promise.allSettled(
    queries.map((q) => pexelsSearch(q, options))
  )

  return esiti.map((esito, rank) => ({
    query: queries[rank],
    rank,
    photos: esito.status === 'fulfilled' ? esito.value.photos : [],
  }))
}
