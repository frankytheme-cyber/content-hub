import type {
  TavilySearchResponse,
  TavilyExtractResponse,
} from './types'

const BASE_URL = 'https://api.tavily.com'

function getApiKey() {
  const key = process.env.TAVILY_API_KEY
  if (!key) throw new Error('TAVILY_API_KEY non configurata')
  return key
}

export async function tavilySearch(
  query: string,
  maxResults = 8
): Promise<TavilySearchResponse> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: getApiKey(),
      query,
      search_depth: 'advanced',
      max_results: maxResults,
      include_answer: true,
    }),
  })
  if (!res.ok) {
    throw new Error(`Tavily search fallita: ${res.status} ${await res.text()}`)
  }
  return res.json()
}

export async function tavilyExtract(urls: string[]): Promise<TavilyExtractResponse> {
  const res = await fetch(`${BASE_URL}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: getApiKey(),
      urls,
    }),
  })
  if (!res.ok) {
    throw new Error(`Tavily extract fallita: ${res.status} ${await res.text()}`)
  }
  return res.json()
}
