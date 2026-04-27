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

  async disconnect() {
    // niente da chiudere con REST API
  }
}
