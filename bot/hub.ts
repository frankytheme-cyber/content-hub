/**
 * Client HTTP verso le rotte di content-hub.
 *
 * Il bot non importa né Prisma né la pipeline: parla alla stessa API che usa
 * la web UI. Così resta un processo separato, riavviabile senza toccare i job
 * in corso, e la logica di business ha una sola implementazione.
 */

export interface Sito {
  id: string
  nome: string
  dominio: string
  categorie: string[]
  wpSiteUrl: string | null
}

export interface LinkInterno {
  testo: string
  url: string
}

export interface CreaArticoloBody {
  sitoId?: string
  tipoArticolo: 'standard' | 'recensione' | 'sistema' | 'biografia'
  categoria: string
  argomento: string
  fonti?: string[]
  linkInterni?: LinkInterno[]
  linkAmazon?: string
  sistemaCategorie?: string[]
}

export interface JobStatus {
  id: string
  stato: 'IN_CODA' | 'IN_ESECUZIONE' | 'COMPLETATO' | 'FALLITO'
  fase: string | null
  progresso: number
  sessionId: string
  errore: string | null
}

export interface VersioneDetail {
  id: string
  tono: string
  indice: number
  corpo: string
  noteRevisione: string | null
  seoJson: Record<string, any>
  immagineUrl: string | null
  punteggio: number | null
}

export interface ArticoloDetail {
  id: string
  titolo: string
  slug: string
  stato: string
  wpPostId: number | null
  session: {
    categoria: string
    argomento: string
    tipo: string
    wpPostId: number | null
    wpPostUrl: string | null
    sito?: { wpSiteUrl: string | null } | null
  }
  versioni: VersioneDetail[]
}

export interface WpPost {
  id: number
  title: string
  link: string
  slug: string
  excerpt: string
  postType: string
}

export interface LinkSuggestion {
  id: string
  fonteTitolo: string
  fonteUrl: string
  targetTitolo: string
  targetUrl: string
  anchorText: string
  contesto: string
  motivazione: string
  stato: string
}

export interface LinkJob {
  id: string
  stato: string
  fase: string
  progresso: number
  totalePost: number
  postProcessati: number
  errore: string | null
  sito: { id: string; nome: string }
  suggestions: LinkSuggestion[]
}

export class HubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
    this.name = 'HubError'
  }
}

export class Hub {
  constructor(private readonly base: string) {}

  private async chiama<T>(percorso: string, init?: RequestInit, timeoutMs = 120_000): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    let res: Response
    try {
      res = await fetch(`${this.base}${percorso}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        signal: controller.signal,
      })
    } catch (err) {
      throw new HubError(
        err instanceof Error && err.name === 'AbortError'
          ? `timeout su ${percorso}`
          : `content-hub irraggiungibile (${this.base}): ${err instanceof Error ? err.message : err}`,
        0
      )
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 204) return undefined as T

    const testo = await res.text()
    let corpo: any = null
    try { corpo = testo ? JSON.parse(testo) : null } catch { /* risposta non JSON */ }

    if (!res.ok) {
      throw new HubError(corpo?.errore ?? corpo?.dettaglio ?? testo.slice(0, 300) ?? res.statusText, res.status)
    }

    return corpo as T
  }

  private post<T>(percorso: string, body: unknown, timeoutMs?: number): Promise<T> {
    return this.chiama<T>(percorso, { method: 'POST', body: JSON.stringify(body) }, timeoutMs)
  }

  // ─── Siti ──────────────────────────────────────────────────────────────────

  async siti(): Promise<Sito[]> {
    const { siti } = await this.chiama<{ siti: Sito[] }>('/api/siti')
    return siti
  }

  /** Il fetch di tutti i post type via MCP può richiedere parecchio: timeout lungo. */
  async postWordPress(sitoId: string): Promise<WpPost[]> {
    const { posts } = await this.chiama<{ posts: WpPost[] }>(`/api/siti/${sitoId}/posts`, undefined, 180_000)
    return posts
  }

  // ─── Creazione ─────────────────────────────────────────────────────────────

  creaArticolo(body: CreaArticoloBody): Promise<{ jobId: string; sessionId: string }> {
    return this.post('/api/wizard', body)
  }

  aggiornaArticolo(body: {
    sitoId: string
    wpPostId: number
    wpPostUrl: string
    wpPostTitle: string
    wpPostType?: string
    focus?: string
    tipoArticolo?: 'standard' | 'biografia'
  }): Promise<{ jobId: string; sessionId: string }> {
    return this.post('/api/aggiornamento', body)
  }

  statoJob(jobId: string): Promise<JobStatus> {
    return this.chiama<JobStatus>(`/api/jobs/${jobId}`, undefined, 20_000)
  }

  riprendiJob(jobId: string): Promise<{ ok: boolean }> {
    return this.post(`/api/jobs/${jobId}`, {})
  }

  // ─── Articoli ──────────────────────────────────────────────────────────────

  async articoliPerSessione(sessionId: string): Promise<{ id: string }[]> {
    const { articoli } = await this.chiama<{ articoli: { id: string }[] }>(
      `/api/articles?sessionId=${encodeURIComponent(sessionId)}&limit=5`
    )
    return articoli
  }

  articolo(id: string): Promise<ArticoloDetail> {
    return this.chiama<ArticoloDetail>(`/api/articles/${id}`)
  }

  /** La pubblicazione carica media e risolve i tag via MCP: può superare il minuto. */
  pubblica(
    id: string,
    body: { versioneId: string; wpSiteUrl: string; stato: 'draft' | 'publish' }
  ): Promise<{ wpPostId: number; wpPostUrl: string }> {
    return this.post(`/api/articles/${id}/publish`, body, 300_000)
  }

  applicaAggiornamento(id: string, versioneId: string): Promise<{ wpPostUrl: string }> {
    return this.post(`/api/articles/${id}/apply-update`, { versioneId }, 300_000)
  }

  // ─── Link interni ──────────────────────────────────────────────────────────

  analizzaLink(sitoId: string): Promise<{ jobId: string }> {
    return this.post('/api/internal-linking/analyze', { sitoId })
  }

  statoLink(jobId: string): Promise<LinkJob> {
    return this.chiama<LinkJob>(`/api/internal-linking/jobs/${jobId}`, undefined, 30_000)
  }

  segnaSuggerimento(id: string, stato: 'approvato' | 'rifiutato' | 'pendente'): Promise<unknown> {
    return this.chiama(`/api/internal-linking/suggestions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stato }),
    })
  }

  applicaSuggerimenti(ids: string[]): Promise<{ applicati?: number; falliti?: number }> {
    return this.post('/api/internal-linking/suggestions/apply', { ids }, 300_000)
  }
}
