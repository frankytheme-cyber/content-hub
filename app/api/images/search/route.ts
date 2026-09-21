import { NextRequest, NextResponse } from 'next/server'
import { pexelsSearch, pexelsConfigurato } from '@/agents/image/pexels-client'
import { cercaImmaginiPertinenti } from '@/agents/image'
import type { ImageSearchResponse } from '@/types/api'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  const category = searchParams.get('category') ?? ''
  // Il picker manuale passa `smart=1` per la stessa ricerca ragionata della
  // pipeline (query tradotte in inglese + ranking di pertinenza). Senza il
  // flag resta una ricerca letterale, utile quando si sa già cosa cercare.
  const smart = searchParams.get('smart') === '1'

  if (!q) {
    return NextResponse.json({ errore: 'Parametro q obbligatorio' }, { status: 400 })
  }

  if (!pexelsConfigurato()) {
    return NextResponse.json({ errore: 'PEXELS_API_KEY non configurata' }, { status: 503 })
  }

  try {
    if (smart) {
      const classifica = await cercaImmaginiPertinenti(
        { argomento: q, categoria: category, keywords: [] },
        12
      )

      const response: ImageSearchResponse = {
        immagini: classifica.map(({ foto }) => ({
          id: foto.id,
          url: foto.src.large2x,
          previewUrl: foto.src.medium,
          fotografo: foto.photographer,
          creditUrl: foto.photographer_url,
        })),
      }
      return NextResponse.json(response)
    }

    const data = await pexelsSearch(category ? `${q} ${category}` : q, { perPage: 12 })

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
