import { prisma } from '@/lib/prisma'
import { WordPressMcpClient } from './mcp-client'
import type { PublishInput, PublishResult } from '@/types/agents'
import type { SeoMetadata } from '@/types/agents'

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
}

function markdownToGutenberg(md: string): string {
  const lines = md.split('\n')
  const blocks: string[] = []
  let listItems: string[] = []

  function flushList() {
    if (!listItems.length) return
    const items = listItems.map(i => `<!-- wp:list-item --><li>${i}</li><!-- /wp:list-item -->`).join('\n')
    blocks.push(`<!-- wp:list -->\n<ul class="wp-block-list">\n${items}\n</ul>\n<!-- /wp:list -->`)
    listItems = []
  }

  for (const raw of lines) {
    const line = raw

    // Skip horizontal rules and dividers
    if (/^[-*]{3,}$/.test(line.trim())) {
      flushList()
      continue
    }

    const h3 = line.match(/^### (.+)$/)
    const h2 = line.match(/^## (.+)$/)
    const h1 = line.match(/^# (.+)$/)
    const li = line.match(/^- (.+)$/)

    if (h3) {
      flushList()
      const t = inlineMarkdown(h3[1])
      blocks.push(`<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">${t}</h3>\n<!-- /wp:heading -->`)
    } else if (h2) {
      flushList()
      const t = inlineMarkdown(h2[1])
      blocks.push(`<!-- wp:heading {"level":2} -->\n<h2 class="wp-block-heading">${t}</h2>\n<!-- /wp:heading -->`)
    } else if (h1) {
      flushList()
      const t = inlineMarkdown(h1[1])
      blocks.push(`<!-- wp:heading {"level":1} -->\n<h1 class="wp-block-heading">${t}</h1>\n<!-- /wp:heading -->`)
    } else if (li) {
      listItems.push(inlineMarkdown(li[1]))
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      const t = inlineMarkdown(line)
      blocks.push(`<!-- wp:paragraph -->\n<p>${t}</p>\n<!-- /wp:paragraph -->`)
    }
  }

  flushList()
  return blocks.join('\n\n')
}

export async function runPublisherAgent(input: PublishInput): Promise<PublishResult> {
  const { versioneId, stato } = input

  const versione = await prisma.versione.findUniqueOrThrow({
    where: { id: versioneId },
    include: { articolo: { include: { session: { include: { sito: true } } } } },
  })

  const articolo = versione.articolo
  const seo = versione.seoJson as unknown as SeoMetadata
  const htmlContent = versione.corpo.trimStart().startsWith('<!-- wp:')
    ? versione.corpo
    : markdownToGutenberg(versione.corpo)

  const sito = versione.articolo.session.sito
  const wpClient = new WordPressMcpClient()
  try {
    await wpClient.connect(
      sito?.wpSiteUrl
        ? { siteUrl: sito.wpSiteUrl, username: sito.wpUsername ?? undefined, appPassword: sito.wpAppPassword ?? undefined }
        : undefined
    )

    // Carica immagine in evidenza se disponibile
    let featuredMediaId: number | undefined
    if (versione.immagineUrl) {
      try {
        featuredMediaId = await wpClient.uploadMediaFromUrl(
          versione.immagineUrl,
          articolo.titolo
        )
      } catch (e) {
        console.warn('[publisher] upload immagine fallito:', e)
      }
    }

    const result = await wpClient.createPost({
      title: articolo.titolo,
      content: htmlContent,
      status: stato,
      slug: seo?.slug ?? articolo.slug,
      excerpt: seo?.metaDescrizione ?? '',
      featured_media: featuredMediaId,
    })

    const pubblicatoIl = new Date().toISOString()

    await prisma.articolo.update({
      where: { id: articolo.id },
      data: {
        stato: 'PUBBLICATO',
        wpPostId: result.id,
        pubblicatoIl: new Date(pubblicatoIl),
        versioneScelta: versioneId,
      },
    })

    return {
      wpPostId: result.id,
      wpPostUrl: result.link,
      pubblicatoIl,
    }
  } finally {
    await wpClient.disconnect()
  }
}
