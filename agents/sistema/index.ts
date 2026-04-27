import { callClaudeJson } from '@/lib/claude-cli'
import { WordPressMcpClient } from '@/agents/publisher/mcp-client'
import type { GenerationInput, ArticoloBozza } from '@/types/agents'

interface SistemaPost {
  id: number
  titolo: string
  url: string
  estratto: string
}

interface SistemaResult {
  versione: ArticoloBozza
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function runSistemaAgent(input: Omit<GenerationInput, 'toni'> & {
  sistemaCategorie: string[]
  siteUrl: string
  username: string
  appPassword: string
}): Promise<SistemaResult> {
  const client = new WordPressMcpClient()
  let posts: SistemaPost[] = []

  try {
    await client.connect({
      siteUrl: input.siteUrl,
      username: input.username,
      appPassword: input.appPassword,
    })

    // Fetch tutti i post pubblicati (max 100, poi pagina 2 se necessario)
    let page = 1
    let totalPages = 1
    do {
      const { posts: batch, totalPages: tp } = await client.listPosts({ page, perPage: 100 })
      totalPages = tp
      for (const p of batch) {
        posts.push({
          id: p.id,
          titolo: stripHtml(p.title.rendered),
          url: p.link,
          estratto: stripHtml(p.excerpt.rendered).slice(0, 200),
        })
      }
      page++
    } while (page <= totalPages && page <= 5)
  } finally {
    await client.disconnect()
  }

  const listaPost = posts
    .map((p) => `ID:${p.id} | ${p.titolo} | ${p.url}\n  ${p.estratto}`)
    .join('\n')

  const sitoBlock = input.sitoIstruzioni
    ? `\nLINEE GUIDA DEL SITO:\n${input.sitoIstruzioni}\n`
    : ''

  const prompt = `Sei un copywriter esperto in hi-fi e audio. Devi scrivere un articolo-guida su "${input.argomento}" per un e-commerce specializzato.${sitoBlock}

CATEGORIA: ${input.categoria}

COMPONENTI DA INCLUDERE NELL'ARTICOLO:
${input.sistemaCategorie.map((c) => `- ${c}`).join('\n')}

PRODOTTI DISPONIBILI SUL SITO (scegli il più adatto per ogni componente richiesto):
${listaPost}

PUNTI CHIAVE DELLA RICERCA:
${input.ricerca.puntiFondamentali.slice(0, 6).map((p, i) => `${i + 1}. ${p}`).join('\n')}

ISTRUZIONI:
1. Per ogni componente richiesto scegli IL prodotto più adatto dalla lista sopra.
2. Scrivi un articolo completo di 1000-1400 parole in italiano con struttura H1 → H2 → H2 → ...
3. Ogni prodotto selezionato va citato con link Markdown [titolo del prodotto](url) nel testo.
4. Il tono deve essere autorevole ma accessibile, da appassionato hi-fi.
5. Includi una sezione "Componenti del sistema" che elenca i prodotti scelti con una riga descrittiva ciascuno.
6. Includi una sezione "Punti chiave" (utile per GEO).
7. Suggerisci 4-6 tag pertinenti per il post WordPress.

Rispondi SOLO con questo JSON (nessun markdown, nessun testo extra):
{
  "titolo": "Titolo H1 dell'articolo con keyword principale",
  "corpo": "Corpo completo in Markdown",
  "estratto": "Estratto SEO di 2-3 frasi",
  "tag": ["tag1", "tag2", "tag3", "tag4"]
}`

  const parsed = await callClaudeJson<{
    titolo: string
    corpo: string
    estratto: string
    tag: string[]
  }>(prompt, { timeout: 5 * 60 * 1000 })

  return {
    versione: {
      tono: 'sistema hi-fi',
      titolo: parsed.titolo,
      corpo: parsed.corpo,
      estratto: parsed.estratto,
      tag: parsed.tag ?? [],
    },
  }
}
