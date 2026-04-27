import { callClaudeJson } from '@/lib/claude-cli'
import { tavilySearch, tavilyExtract } from './tavily-client'
import type { ResearchInput, ResearchResult, ResearchSource } from '@/types/agents'

export async function runResearchAgent(input: ResearchInput): Promise<ResearchResult> {
  const { argomento, fonti, categoria } = input

  // 1. Ricerca principale su Tavily
  const searchData = await tavilySearch(`${argomento} ${categoria}`)

  // 2. Estrazione contenuto dalle fonti URL fornite dall'utente
  const urlFonti = fonti.filter((f) => f.startsWith('http'))
  let estrattiUtente: string[] = []

  if (urlFonti.length > 0) {
    try {
      const extractData = await tavilyExtract(urlFonti)
      estrattiUtente = extractData.results.map(
        (r) => `[${r.url}]\n${r.raw_content.slice(0, 2000)}`
      )
    } catch {
      // Se l'estrazione fallisce, proseguiamo senza
    }
  }

  const testi = fonti.filter((f) => !f.startsWith('http'))

  const fontiTavily = searchData.results
    .map((r) => `Titolo: ${r.title}\nURL: ${r.url}\nContenuto: ${r.content}`)
    .join('\n\n---\n\n')

  const prompt = `Sei un ricercatore esperto in content marketing per e-commerce.

Argomento da ricercare: "${argomento}"
Categoria e-commerce: "${categoria}"

FONTI RACCOLTE:
${fontiTavily}

${estrattiUtente.length > 0 ? `FONTI DELL'UTENTE:\n${estrattiUtente.join('\n\n')}` : ''}
${testi.length > 0 ? `NOTE AGGIUNTIVE:\n${testi.join('\n')}` : ''}

Sulla base di queste fonti, produci un report strutturato in JSON con questi campi:
{
  "sommario": "panoramica completa dell'argomento in 3-4 paragrafi",
  "puntiFondamentali": ["punto 1", "punto 2", ...] (8-12 punti chiave verificati),
  "keywordsCorrelate": ["keyword 1", "keyword 2", ...] (15-20 keyword SEO rilevanti),
  "fonti": [{"url": "...", "titolo": "...", "estratto": "...", "dataPubblicazione": "..."}]
}

Restituisci SOLO il JSON, senza markdown o testo aggiuntivo.`

  const result = await callClaudeJson<ResearchResult>(prompt, { timeout: 5 * 60 * 1000 })

  // Aggiungi le fonti Tavily se non già presenti nel risultato
  const urlNelRisultato = new Set(result.fonti?.map((f: ResearchSource) => f.url) ?? [])
  for (const r of searchData.results) {
    if (!urlNelRisultato.has(r.url)) {
      result.fonti = result.fonti ?? []
      result.fonti.push({
        url: r.url,
        titolo: r.title,
        estratto: r.content.slice(0, 400),
        dataPubblicazione: r.published_date,
      })
    }
  }

  return result
}
