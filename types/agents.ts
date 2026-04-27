// ─── Wizard Input ───────────────────────────────────────────────────────────

export interface WizardInput {
  sitoId?: string
  sitoIstruzioni?: string  // iniettato dalla pipeline, non dal client
  tipoArticolo?: 'standard' | 'recensione' | 'sistema'
  linkAmazon?: string
  sistemaCategorie?: string[]
  categoria: string
  argomento: string
  fonti: string[]
  linkInterni: LinkInternoInput[]
}

export interface LinkInternoInput {
  testo: string
  url: string
}

// ─── Research Agent ──────────────────────────────────────────────────────────

export interface ResearchInput {
  argomento: string
  fonti: string[]
  categoria: string
}

export interface ResearchResult {
  sommario: string
  puntiFondamentali: string[]
  keywordsCorrelate: string[]
  fonti: ResearchSource[]
}

export interface ResearchSource {
  url: string
  titolo: string
  estratto: string
  dataPubblicazione?: string
}

// ─── Generation Agent ────────────────────────────────────────────────────────

export interface GenerationInput {
  ricerca: ResearchResult
  linkInterni: LinkInternoInput[]
  categoria: string
  argomento: string
  toni: [string, string]
  sitoIstruzioni?: string
}

export interface ArticoloBozza {
  tono: string
  titolo: string
  corpo: string
  estratto: string
  tag?: string[]
}

export interface GenerationResult {
  versioni: [ArticoloBozza, ArticoloBozza]
}

// ─── Review Agent ────────────────────────────────────────────────────────────

export interface ReviewInput {
  bozza: ArticoloBozza
  fonti: ResearchSource[]
}

export interface ReviewResult {
  approvato: boolean
  punteggio: number
  correzioni: ReviewCorrezione[]
  corpoRevisionato?: string
}

export interface ReviewCorrezione {
  tipo: 'fattuale' | 'grammatica' | 'stile'
  originale: string
  corretto: string
  spiegazione: string
}

// ─── SEO Agent ───────────────────────────────────────────────────────────────

export interface SeoInput {
  bozza: ArticoloBozza
  argomento: string
  categoria: string
  keywordsCorrelate: string[]
}

export interface SeoMetadata {
  metaTitolo: string
  metaDescrizione: string
  keywordPrincipale: string
  keywordSecondarie: string[]
  slug: string
  schemaMarkup: object
  geoHints: string[]
  ogTitolo: string
  ogDescrizione: string
}

export interface SeoResult {
  metadata: SeoMetadata
  corpoOttimizzato: string
}

// ─── Image Agent ─────────────────────────────────────────────────────────────

export interface ImageInput {
  argomento: string
  categoria: string
  keywords: string[]
}

export interface ImageResult {
  url: string
  previewUrl: string
  fotografo: string
  creditUrl: string
  altText: string
}

// ─── Publisher Agent ─────────────────────────────────────────────────────────

export interface PublishInput {
  versioneId: string
  wpSiteUrl: string
  stato: 'draft' | 'publish'
}

export interface PublishResult {
  wpPostId: number
  wpPostUrl: string
  pubblicatoIl: string
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export type PipelineFase =
  | 'ricerca'
  | 'generazione'
  | 'revisione'
  | 'seo'
  | 'immagini'
  | 'salvataggio'
  | 'completato'
  | 'errore'

export interface JobEvent {
  jobId: string
  fase: PipelineFase
  progresso: number
  messaggio: string
  dati?: unknown
}

// ─── Internal Linking ────────────────────────────────────────────────────────

export interface WpPostSummary {
  id: number
  slug: string
  link: string
  titolo: string
  estratto: string
  contenuto: string
}

export interface LinkSuggestionDraft {
  fontePostId: number
  targetPostId: number
  anchorText: string
  contesto: string
  motivazione: string
}

export type LinkAnalysisFase =
  | 'in_coda'
  | 'fetch'
  | 'analisi'
  | 'completato'
  | 'errore'

export interface LinkAnalysisEvent {
  jobId: string
  fase: LinkAnalysisFase
  progresso: number
  messaggio: string
  totalePost?: number
  postProcessati?: number
}
