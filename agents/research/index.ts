import { callClaudeJson } from '@/lib/claude-cli'
import { tavilySearch, tavilyExtract } from './tavily-client'
import type { ResearchInput, ResearchResult, ResearchSource } from '@/types/agents'

/** Caratteri di contenuto tenuti per ogni fonte Tavily nel prompt. */
const MAX_CHAR_FONTE = 1100
/** Caratteri tenuti per ogni URL fornito dall'utente (fonti più rilevanti). */
const MAX_CHAR_ESTRATTO_UTENTE = 2500

interface SintesiRicerca {
  sommario: string
  puntiFondamentali: string[]
  keywordsCorrelate: string[]
  entita: string[]
  domandeUtenti: string[]
}

export async function runResearchAgent(
  input: ResearchInput,
  onProgress?: (msg: string) => void
): Promise<ResearchResult> {
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
        (r) => `[${r.url}]\n${r.raw_content.slice(0, MAX_CHAR_ESTRATTO_UTENTE)}`
      )
    } catch {
      // Se l'estrazione fallisce, proseguiamo senza
    }
  }

  const testi = fonti.filter((f) => !f.startsWith('http'))

  const fontiTavily = searchData.results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content.slice(0, MAX_CHAR_FONTE)}`)
    .join('\n\n---\n\n')

  // Le fonti vengono indicizzate qui e ricostruite in locale dopo la risposta:
  // farle ritrascrivere al modello significava pagarne l'output per un elenco
  // di URL che avevamo già.
  const prompt = `Sei un ricercatore esperto in content marketing per e-commerce.

ARGOMENTO: "${argomento}"
CATEGORIA: "${categoria}"

FONTI RACCOLTE:
${fontiTavily}
${estrattiUtente.length > 0 ? `\nFONTI DELL'UTENTE (prioritarie):\n${estrattiUtente.join('\n\n')}` : ''}
${testi.length > 0 ? `\nNOTE AGGIUNTIVE DELL'UTENTE:\n${testi.join('\n')}` : ''}

Produci un report di ricerca. Regole:
- "puntiFondamentali": 8-12 affermazioni VERIFICABILI ricavate dalle fonti. Includi numeri, date, prezzi e specifiche quando presenti — sono ciò che rende un articolo citabile dai motori AI. Non inventare dati assenti dalle fonti.
- "keywordsCorrelate": 15-20 keyword SEO in italiano, ordinate per rilevanza, includendo varianti long-tail.
- "entita": 5-10 entità nominate concrete (marche, modelli, standard tecnici, persone, luoghi) citate nelle fonti.
- "domandeUtenti": 4-6 domande reali che un utente porrebbe a un motore di ricerca su questo argomento, in forma interrogativa naturale.
- "sommario": 3-4 paragrafi di panoramica.

Rispondi SOLO con questo JSON:
{"sommario":"...","puntiFondamentali":["..."],"keywordsCorrelate":["..."],"entita":["..."],"domandeUtenti":["..."]}`

  onProgress?.('Analisi contenuti con Claude...')

  const sintesi = await callClaudeJson<SintesiRicerca>(prompt, {
    tier: 'standard',
    label: 'research',
    timeout: 4 * 60 * 1000,
  })

  // Le fonti sono dati che possediamo già: le costruiamo in locale.
  const fontiFinali: ResearchSource[] = searchData.results.map((r) => ({
    url: r.url,
    titolo: r.title,
    estratto: r.content.slice(0, 400),
    dataPubblicazione: r.published_date,
  }))

  for (const url of urlFonti) {
    if (!fontiFinali.some((f) => f.url === url)) {
      fontiFinali.push({ url, titolo: url, estratto: 'Fonte fornita dall\'utente' })
    }
  }

  return {
    sommario: sintesi.sommario ?? '',
    puntiFondamentali: sintesi.puntiFondamentali ?? [],
    keywordsCorrelate: sintesi.keywordsCorrelate ?? [],
    entita: sintesi.entita ?? [],
    domandeUtenti: sintesi.domandeUtenti ?? [],
    fonti: fontiFinali,
  }
}
