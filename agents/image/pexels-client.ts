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

function getApiKey() {
  const key = process.env.PEXELS_API_KEY
  if (!key) throw new Error('PEXELS_API_KEY non configurata')
  return key
}

export async function pexelsSearch(
  query: string,
  perPage = 10
): Promise<PexelsSearchResponse> {
  const params = new URLSearchParams({
    query,
    per_page: String(perPage),
    orientation: 'landscape',
    size: 'large',
  })

  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: getApiKey() },
  })

  if (!res.ok) {
    throw new Error(`Pexels search fallita: ${res.status}`)
  }

  return res.json()
}
