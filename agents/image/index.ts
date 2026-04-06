import { callClaude } from '@/lib/claude-cli'
import { pexelsSearch } from './pexels-client'
import type { ImageInput, ImageResult } from '@/types/agents'

export async function runImageAgent(input: ImageInput): Promise<ImageResult> {
  const { argomento, categoria, keywords } = input

  const queries = [
    `${argomento} ${keywords[0] ?? ''}`.trim(),
    argomento,
    categoria,
  ]

  let foto = null
  for (const query of queries) {
    const data = await pexelsSearch(query)
    if (data.photos.length > 0) {
      foto = data.photos.find((p) => p.width > p.height) ?? data.photos[0]
      break
    }
  }

  if (!foto) {
    return {
      url: '',
      previewUrl: '',
      fotografo: '',
      creditUrl: '',
      altText: argomento,
    }
  }

  const altText = await callClaude(
    `Scrivi un testo alternativo (alt text) SEO per un'immagine su questo argomento: "${argomento}" nella categoria "${categoria}".
Il testo deve essere conciso (massimo 125 caratteri), descrittivo e includere la keyword principale.
Restituisci SOLO il testo alt, senza virgolette o spiegazioni.`,
    { timeout: 30_000 }
  )

  return {
    url: foto.src.large2x,
    previewUrl: foto.src.medium,
    fotografo: foto.photographer,
    creditUrl: foto.photographer_url,
    altText: altText.trim(),
  }
}
