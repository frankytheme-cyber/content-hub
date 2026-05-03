/**
 * Client WordPress che usa direttamente la REST API v2.
 *
 * Configurazione in .env.local:
 *   WORDPRESS_SITE_URL=https://tuosito.com
 *   WORDPRESS_USERNAME=admin
 *   WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx
 */

export interface WpCreatePostParams {
  title: string
  content: string
  status: 'draft' | 'publish'
  slug?: string
  excerpt?: string
  meta?: Record<string, string>
  featured_media?: number
  tags?: number[]
}

export interface WpPostResult {
  id: number
  link: string
  status: string
}

export class WordPressMcpClient {
  private baseUrl: string = ''
  private authHeader: string = ''

  async connect(credentials?: { siteUrl?: string; username?: string; appPassword?: string }) {
    const siteUrl = credentials?.siteUrl ?? process.env.WORDPRESS_SITE_URL
    const username = credentials?.username ?? process.env.WORDPRESS_USERNAME
    const appPassword = credentials?.appPassword ?? process.env.WORDPRESS_APP_PASSWORD

    if (!siteUrl || !username || !appPassword) {
      throw new Error(
        'Variabili WordPress mancanti: WORDPRESS_SITE_URL, WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD'
      )
    }

    this.baseUrl = siteUrl.replace(/\/$/, '') + '/wp-json/wp/v2'
    this.authHeader = 'Basic ' + Buffer.from(`${username}:${appPassword}`).toString('base64')
  }

  async createPost(params: WpCreatePostParams): Promise<WpPostResult> {
    if (!this.baseUrl) throw new Error('Client non connesso')

    const body: Record<string, unknown> = {
      title: params.title,
      content: params.content,
      status: params.status,
    }
    if (params.slug) body.slug = params.slug
    if (params.excerpt) body.excerpt = params.excerpt
    if (params.meta && Object.keys(params.meta).length > 0) body.meta = params.meta
    if (params.featured_media) body.featured_media = params.featured_media
    if (params.tags && params.tags.length > 0) body.tags = params.tags

    const res = await fetch(`${this.baseUrl}/posts`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Creazione post fallita: ${(err as any).message ?? res.status}`)
    }

    const data = await res.json()
    return { id: data.id, link: data.link, status: data.status }
  }

  async listPosts(opts: { page: number; perPage?: number; status?: string; postType?: string } = { page: 1 }): Promise<{
    posts: Array<{
      id: number
      slug: string
      link: string
      title: { rendered: string }
      excerpt: { rendered: string }
      content: { rendered: string }
    }>
    totalPages: number
  }> {
    if (!this.baseUrl) throw new Error('Client non connesso')
    const perPage = opts.perPage ?? 100
    const status = opts.status ?? 'publish'
    const endpoint = opts.postType ?? 'posts'
    const url = `${this.baseUrl}/${endpoint}?_fields=id,slug,link,title,excerpt,content&per_page=${perPage}&page=${opts.page}&status=${status}&orderby=date&order=desc`

    const res = await fetch(url, {
      headers: { Authorization: this.authHeader },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`listPosts fallito: ${(err as any).message ?? res.status}`)
    }

    const totalPages = Number(res.headers.get('x-wp-totalpages') ?? '1')
    const posts = (await res.json()) as Array<{
      id: number
      slug: string
      link: string
      title: { rendered: string }
      excerpt: { rendered: string }
      content: { rendered: string }
    }>
    return { posts, totalPages }
  }

  async getPost(id: number, postType?: string): Promise<{ id: number; link: string; content: { rendered: string; raw?: string } }> {
    if (!this.baseUrl) throw new Error('Client non connesso')
    const endpoint = postType ?? 'posts'
    const res = await fetch(`${this.baseUrl}/${endpoint}/${id}?context=edit&_fields=id,link,content`, {
      headers: { Authorization: this.authHeader },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`getPost fallito: ${(err as any).message ?? res.status}`)
    }
    return res.json() as Promise<{ id: number; link: string; content: { rendered: string; raw?: string } }>
  }

  async updatePostContent(id: number, content: string, postType?: string): Promise<void> {
    if (!this.baseUrl) throw new Error('Client non connesso')
    const endpoint = postType ?? 'posts'
    const res = await fetch(`${this.baseUrl}/${endpoint}/${id}`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`updatePostContent fallito: ${(err as any).message ?? res.status}`)
    }
  }

  async uploadMediaFromUrl(imageUrl: string, title: string): Promise<number> {
    if (!this.baseUrl) throw new Error('Client non connesso')

    // Scarica immagine
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) throw new Error(`Download immagine fallito: ${imgRes.status}`)
    const buffer = Buffer.from(await imgRes.arrayBuffer())

    // Determina mime type dall'URL
    const ext = imageUrl.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg'
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    }
    const mimeType = mimeMap[ext] ?? 'image/jpeg'
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}.${ext}`

    const res = await fetch(`${this.baseUrl}/media`, {
      method: 'POST',
      headers: {
        Authorization: this.authHeader,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: buffer,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(`Upload media fallito: ${(err as any).message ?? res.status}`)
    }

    const data = await res.json()
    return data.id as number
  }

  async getOrCreateTag(name: string): Promise<number> {
    if (!this.baseUrl) throw new Error('Client non connesso')
    const searchRes = await fetch(
      `${this.baseUrl}/tags?search=${encodeURIComponent(name)}&_fields=id,name&per_page=5`,
      { headers: { Authorization: this.authHeader } }
    )
    if (searchRes.ok) {
      const found = (await searchRes.json()) as Array<{ id: number; name: string }>
      const exact = found.find((t) => t.name.toLowerCase() === name.toLowerCase())
      if (exact) return exact.id
    }

    const createRes = await fetch(`${this.baseUrl}/tags`, {
      method: 'POST',
      headers: { Authorization: this.authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}))
      throw new Error(`Creazione tag "${name}" fallita: ${(err as any).message ?? createRes.status}`)
    }
    const created = (await createRes.json()) as { id: number }
    return created.id
  }

  async resolveTagIds(tagNames: string[]): Promise<number[]> {
    const ids: number[] = []
    for (const name of tagNames) {
      try {
        ids.push(await this.getOrCreateTag(name))
      } catch (e) {
        console.warn(`[publisher] tag "${name}" ignorato:`, e)
      }
    }
    return ids
  }

  async listPostTypes(): Promise<Record<string, { slug: string; rest_base: string; name: string }>> {
    if (!this.baseUrl) throw new Error('Client non connesso')
    const res = await fetch(`${this.baseUrl}/types?context=edit`, {
      headers: { Authorization: this.authHeader },
    })
    if (!res.ok) return {}
    const data = await res.json()
    if (typeof data !== 'object' || Array.isArray(data)) return {}
    return data as Record<string, { slug: string; rest_base: string; name: string }>
  }

  async listPostTypesPublic(): Promise<Record<string, { slug: string; rest_base: string; name: string }>> {
    if (!this.baseUrl) throw new Error('Client non connesso')
    const res = await fetch(`${this.baseUrl}/types`, {
      headers: { Authorization: this.authHeader },
    })
    if (!res.ok) return {}
    const data = await res.json()
    if (typeof data !== 'object' || Array.isArray(data)) return {}
    return data as Record<string, { slug: string; rest_base: string; name: string }>
  }

  async disconnect() {
    // niente da chiudere con REST API
  }
}
