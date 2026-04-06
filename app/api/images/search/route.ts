import { NextRequest, NextResponse } from 'next/server'
import { pexelsSearch } from '@/agents/image/pexels-client'
import type { ImageSearchResponse } from '@/types/api'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const category = searchParams.get('category') ?? ''

  if (!q) {
    return NextResponse.json({ errore: 'Parametro q obbligatorio' }, { status: 400 })
  }

  try {
    const query = category ? `${q} ${category}` : q
    const data = await pexelsSearch(query, 12)

    const response: ImageSearchResponse = {
      immagini: data.photos.map((p) => ({
        id: p.id,
        url: p.src.large2x,
        previewUrl: p.src.medium,
        fotografo: p.photographer,
        creditUrl: p.photographer_url,
      })),
    }

    return NextResponse.json(response)
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : 'Errore interno'
    return NextResponse.json({ errore: messaggio }, { status: 500 })
  }
}
