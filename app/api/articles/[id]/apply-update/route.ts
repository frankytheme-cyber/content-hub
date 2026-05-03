import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { WordPressMcpClient } from '@/agents/publisher/mcp-client'
import { markdownToGutenberg } from '@/agents/publisher'
import type { ApplyUpdateResponse } from '@/types/api'

const applyUpdateSchema = z.object({
  versioneId: z.string().min(1),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const body = await req.json()
    const { versioneId } = applyUpdateSchema.parse(body)

    const articolo = await prisma.articolo.findUnique({
      where: { id },
      include: {
        session: { include: { sito: true } },
        versioni: { where: { id: versioneId } },
      },
    })

    if (!articolo) {
      return NextResponse.json({ errore: 'Articolo non trovato' }, { status: 404 })
    }

    const versione = articolo.versioni[0]
    if (!versione) {
      return NextResponse.json({ errore: 'Versione non trovata' }, { status: 404 })
    }

    const wpPostId = articolo.session.wpPostId ?? articolo.wpPostId
    if (!wpPostId) {
      return NextResponse.json({ errore: 'ID post WordPress mancante' }, { status: 400 })
    }

    const sito = articolo.session.sito
    if (!sito?.wpSiteUrl || !sito.wpUsername || !sito.wpAppPassword) {
      return NextResponse.json({ errore: 'Credenziali WordPress mancanti' }, { status: 400 })
    }

    const htmlContent = versione.corpo.trimStart().startsWith('<!-- wp:')
      ? versione.corpo
      : markdownToGutenberg(versione.corpo)

    const wpClient = new WordPressMcpClient()
    try {
      await wpClient.connect({
        siteUrl: sito.wpSiteUrl,
        username: sito.wpUsername,
        appPassword: sito.wpAppPassword,
      })
      await wpClient.updatePostContent(wpPostId, htmlContent, articolo.session.wpPostType ?? 'posts')
    } finally {
      await wpClient.disconnect()
    }

    const aggiornatoIl = new Date().toISOString()

    await prisma.articolo.update({
      where: { id },
      data: {
        stato: 'PUBBLICATO',
        wpPostId,
        pubblicatoIl: new Date(aggiornatoIl),
        versioneScelta: versioneId,
      },
    })

    const wpPostUrl = articolo.session.wpPostUrl ?? sito.wpSiteUrl + '/?p=' + wpPostId

    return NextResponse.json({
      wpPostUrl,
      aggiornatoIl,
    } satisfies ApplyUpdateResponse)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ errore: 'Dati non validi' }, { status: 400 })
    }
    const msg = err instanceof Error ? err.message : 'Errore interno'
    console.error(`[POST /api/articles/${id}/apply-update]`, err)
    return NextResponse.json({ errore: msg }, { status: 500 })
  }
}
