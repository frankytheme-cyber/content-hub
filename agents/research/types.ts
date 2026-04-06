export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  published_date?: string
}

export interface TavilySearchResponse {
  query: string
  results: TavilySearchResult[]
  answer?: string
}

export interface TavilyExtractResponse {
  results: Array<{
    url: string
    raw_content: string
    title?: string
  }>
}
