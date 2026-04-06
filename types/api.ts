import type { WizardInput, PublishInput, PublishResult, JobEvent } from './agents'

// POST /api/wizard
export interface WizardRequestBody extends WizardInput {}
export interface WizardResponse {
  jobId: string
  sessionId: string
}

// GET /api/jobs/[jobId]
export interface JobStatusResponse {
  id: string
  stato: string
  fase: string | null
  progresso: number
  sessionId: string
  errore: string | null
}

// GET /api/articles
export interface ArticlesQuery {
  stato?: string
  page?: number
  limit?: number
}

export interface ArticlesResponse {
  articoli: ArticoloSummary[]
  totale: number
  pagina: number
  perPagina: number
}

export interface ArticoloSummary {
  id: string
  titolo: string
  slug: string
  stato: string
  categoria: string
  createdAt: string
  versioneScelta: string | null
  versioni: VersioneSummary[]
}

export interface VersioneSummary {
  id: string
  tono: string
  indice: number
  punteggio: number | null
  immagineUrl: string | null
}

// GET /api/articles/[id]
export interface ArticoloDetailResponse {
  id: string
  titolo: string
  slug: string
  stato: string
  createdAt: string
  pubblicatoIl: string | null
  wpPostId: number | null
  versioneScelta: string | null
  session: {
    categoria: string
    argomento: string
    sito?: { wpSiteUrl: string | null } | null
  }
  versioni: VersioneDetail[]
}

export interface VersioneDetail {
  id: string
  tono: string
  indice: number
  corpo: string
  noteRevisione: string | null
  seoJson: Record<string, unknown>
  immagineUrl: string | null
  immagineCreditUrl: string | null
  punteggio: number | null
}

// PATCH /api/articles/[id]
export interface ArticoloPatchBody {
  versioneScelta?: string
  stato?: string
}

// POST /api/articles/[id]/publish
export interface PublishRequestBody extends PublishInput {}
export interface PublishResponse extends PublishResult {}

// GET /api/images/search
export interface ImageSearchResponse {
  immagini: ImageSearchResult[]
}

export interface ImageSearchResult {
  id: number
  url: string
  previewUrl: string
  fotografo: string
  creditUrl: string
}
