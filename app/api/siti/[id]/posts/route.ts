import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { WordPressMcpClient } from '@/agents/publisher/mcp-client'
import type { SitoPostsResponse } from '@/types/api'

export const dynamic = 'force-dynamic'

const SYSTEM_TYPES = new Set([
  'page', 'attachment', 'revision', 'nav_menu_item', 'custom_css',
  'customize_changeset', 'oembed_cache', 'user_request', 'wp_block',
  'wp_template', 'wp_template_part', 'wp_global_styles', 'wp_navigation',
  'wp_font_face', 'wp_font_family', 'wp_pattern',
])

async function fetchAllPagesForType(
  wpClient: WordPressMcpClient,
  restBase: string,
): Promise<SitoPostsResponse['posts']> {
  const result: SitoPostsResponse['posts'] = []
  let page = 1
  while (true) {
    try {
      const { posts, totalPages } = await wpClient.listPosts({ page, perPage: 100, postType: restBase })
      for (const p of posts) {
        result.push({
          id: p.id,
          title: p.title?.rendered ?? p.slug,
          link: p.link,
          slug: p.slug,
          excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, '').trim() ?? '',
          postType: restBase,
        })
      }
      if (page >= totalPages || page >= 10) break
      page++
    } catch (err) {
      console.warn(`[siti/posts] fetch "${restBase}" p${page} fallito:`, err instanceof Error ? err.message : err)
      break
    }
  }
  return result
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const sito = await prisma.sito.findUnique({ where: { id } })
  if (!sito) return NextResponse.json({ errore: 'Sito non trovato' }, { status: 404 })
  if (!sito.wpSiteUrl || !sito.wpUsername || !sito.wpAppPassword) {
    return NextResponse.json({ errore: 'Credenziali WordPress non configurate.' }, { status: 400 })
  }

  const wpClient = new WordPressMcpClient()
  try {
    await wpClient.connect({
      siteUrl: sito.wpSiteUrl,
      username: sito.wpUsername,
      appPassword: sito.wpAppPassword,
    })

    // Scopri tutti i post type — prova prima con context=edit, poi senza
    let allTypes: Record<string, { slug: string; rest_base: string; name: string }> = {}
    try {
      allTypes = await wpClient.listPostTypes()
      if (Object.keys(allTypes).length === 0) {
        allTypes = await wpClient.listPostTypesPublic()
      }
    } catch (e) {
      console.warn('[siti/posts] listPostTypes fallito:', e)
    }

    const tipiTrovati = Object.keys(allTypes)

    let typesToFetch: { slug: string; restBase: string }[] = Object.values(allTypes)
      .filter((t) => !SYSTEM_TYPES.has(t.slug))
      .map((t) => ({ slug: t.slug, restBase: t.rest_base }))

    // Fallback assoluto
    if (typesToFetch.length === 0) {
      typesToFetch = [
        { slug: 'post', restBase: 'posts' },
        { slug: 'recensione', restBase: 'recensioni' },
        { slug: 'biografia', restBase: 'biografie' },
      ]
    }

    const results = await Promise.all(
      typesToFetch.map(({ restBase }) => fetchAllPagesForType(wpClient, restBase))
    )

    const allPosts = results.flat().sort((a, b) => a.title.localeCompare(b.title, 'it'))

    const response: SitoPostsResponse = {
      posts: allPosts,
    }

    return NextResponse.json(response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore connessione WordPress'
    console.error('[GET /api/siti/[id]/posts]', err)
    return NextResponse.json({ errore: msg }, { status: 500 })
  } finally {
    await wpClient.disconnect()
  }
}
