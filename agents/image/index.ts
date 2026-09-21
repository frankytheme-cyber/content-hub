import { callClaude, callClaudeJson } from '@/lib/claude-cli'
import { troncaTesto, MAX_ALT_TEXT } from '@/lib/seo-utils'
import { pexelsSearchMulti, pexelsConfigurato, type PexelsPhoto } from './pexels-client'
import type { ImageInput, ImageResult } from '@/types/agents'

interface PianoRicerca {
  /** Query brevi in inglese, dalla più specifica alla più generica. */
  queries: string[]
  /** Termini inglesi che ci si aspetta di trovare in una foto pertinente. */
  termini: string[]
  /** Soggetto visivo principale, in inglese. */
  soggetto: string
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'of', 'on', 'in', 'at', 'with', 'and', 'or', 'for', 'to',
  'photo', 'image', 'picture', 'stock', 'background', 'view', 'close', 'up',
])

/**
 * Traduce l'argomento italiano in query di stock photography inglesi.
 *
 * Pexels indicizza tag e didascalie in inglese: passargli una frase italiana
 * lunga ("migliori cuffie bluetooth per ascolto hi-fi") restituisce zero
 * risultati o rumore, ed era la causa principale delle immagini fuori tema.
 */
async function pianificaRicerca(input: ImageInput): Promise<PianoRicerca> {
  const prompt = `Devi trovare una foto di stock pertinente per un articolo.

ARGOMENTO (italiano): "${input.argomento}"
CATEGORIA: "${input.categoria}"
KEYWORD: ${input.keywords.slice(0, 5).join(', ') || 'nessuna'}

Produci query di ricerca per una banca di immagini (Pexels), che indicizza SOLO in inglese.

REGOLE:
- 4 query in INGLESE, da 2 a 4 parole ciascuna, ordinate dalla più specifica alla più generica.
- Descrivi un SOGGETTO FOTOGRAFABILE, non un concetto astratto: "wireless headphones desk" va bene, "best audio quality 2025" no.
- Niente nomi di marca, niente anni, niente superlativi.
- L'ultima query deve essere abbastanza generica da restituire sempre risultati.
- "termini": 6-10 parole inglesi singole che compaiono nella didascalia di una foto davvero pertinente.

Rispondi SOLO con questo JSON:
{"soggetto":"soggetto visivo in inglese","queries":["q1","q2","q3","q4"],"termini":["t1","t2","t3","t4","t5","t6"]}`

  const piano = await callClaudeJson<PianoRicerca>(prompt, {
    tier: 'fast',
    label: 'image-piano',
    timeout: 90_000,
  })

  return {
    soggetto: (piano.soggetto ?? input.argomento).trim(),
    queries: (piano.queries ?? []).map((q) => String(q).trim()).filter(Boolean).slice(0, 4),
    termini: (piano.termini ?? []).map((t) => String(t).trim().toLowerCase()).filter(Boolean),
  }
}

/**
 * Testo descrittivo di una foto: l'alt di Pexels più lo slug dell'URL, che
 * contiene la didascalia redazionale ("black-headphones-on-wooden-table").
 */
function testoDescrittivo(foto: PexelsPhoto): string {
  const slug = foto.url
    .replace(/https?:\/\/[^/]+\/photo\//, '')
    .replace(/-?\d+\/?$/, '')
    .replace(/-/g, ' ')
  return `${foto.alt ?? ''} ${slug}`.toLowerCase()
}

function tokenizza(testo: string): string[] {
  return testo
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t))
}

interface Candidato {
  foto: PexelsPhoto
  punteggio: number
  query: string
}

/**
 * Assegna un punteggio di pertinenza incrociando la didascalia della foto con
 * i termini attesi. Senza questo passaggio veniva presa la prima foto della
 * prima query che restituisse un risultato qualsiasi.
 */
function valuta(
  foto: PexelsPhoto,
  rank: number,
  query: string,
  termini: string[],
  soggetto: string
): Candidato {
  const descrizione = testoDescrittivo(foto)
  const tokenFoto = new Set(tokenizza(descrizione))

  let punteggio = 0

  // Corrispondenza sui termini attesi: il segnale più forte.
  const terminiAttesi = tokenizza(termini.join(' '))
  const trovati = terminiAttesi.filter((t) => tokenFoto.has(t))
  punteggio += trovati.length * 12

  // Il soggetto principale vale doppio.
  const tokenSoggetto = tokenizza(soggetto)
  const soggettoTrovato = tokenSoggetto.filter((t) => tokenFoto.has(t))
  punteggio += soggettoTrovato.length * 18
  if (tokenSoggetto.length > 0 && soggettoTrovato.length === tokenSoggetto.length) punteggio += 15

  // Le parole della query che ha prodotto la foto.
  const tokenQuery = tokenizza(query)
  punteggio += tokenQuery.filter((t) => tokenFoto.has(t)).length * 6

  // Le query più specifiche vengono prima: premia chi arriva da quelle.
  punteggio += Math.max(0, 12 - rank * 4)

  // Formato: le immagini di copertina sono orizzontali.
  const ratio = foto.width / foto.height
  if (ratio >= 1.3 && ratio <= 2.1) punteggio += 10
  else if (ratio > 1) punteggio += 4
  else punteggio -= 12

  // Risoluzione sufficiente per una hero image.
  if (foto.width >= 1920) punteggio += 5
  else if (foto.width < 1200) punteggio -= 8

  // Una foto senza alcuna didascalia è inverificabile: la teniamo come ripiego.
  if (descrizione.trim().length < 10) punteggio -= 20

  return { foto, punteggio, query }
}

async function componiAltText(
  foto: PexelsPhoto | null,
  input: ImageInput
): Promise<string> {
  const descrizione = foto ? testoDescrittivo(foto).trim() : ''
  const fallback = troncaTesto(`${input.argomento} — ${input.categoria}`, MAX_ALT_TEXT)

  if (!foto || descrizione.length < 5) return fallback

  try {
    const alt = await callClaude(
      `Scrivi il testo alternativo (alt) in ITALIANO per l'immagine di copertina di un articolo.

CONTENUTO REALE DELLA FOTO (didascalia inglese): "${descrizione}"
ARGOMENTO DELL'ARTICOLO: "${input.argomento}"
CATEGORIA: "${input.categoria}"

REGOLE:
- Massimo ${MAX_ALT_TEXT} caratteri.
- Descrivi ciò che si VEDE nella foto, non l'argomento dell'articolo.
- Inserisci la keyword principale solo se coerente con ciò che la foto mostra.
- Niente "immagine di", "foto di", niente virgolette.

Rispondi SOLO con il testo alt.`,
      { tier: 'fast', label: 'image-alt', timeout: 60_000 }
    )

    const pulito = alt.replace(/^["']|["']$/g, '').trim()
    return pulito.length > 0 ? troncaTesto(pulito, MAX_ALT_TEXT) : fallback
  } catch {
    return fallback
  }
}

function risultatoVuoto(input: ImageInput): ImageResult {
  return {
    url: '',
    previewUrl: '',
    fotografo: '',
    creditUrl: '',
    altText: troncaTesto(input.argomento, MAX_ALT_TEXT),
  }
}

export async function runImageAgent(input: ImageInput): Promise<ImageResult> {
  if (!pexelsConfigurato()) {
    console.warn('[image] PEXELS_API_KEY non configurata: nessuna immagine cercata.')
    return risultatoVuoto(input)
  }

  let piano: PianoRicerca
  try {
    piano = await pianificaRicerca(input)
  } catch (err) {
    console.warn('[image] pianificazione fallita, uso query di ripiego:', err instanceof Error ? err.message : err)
    piano = { soggetto: input.argomento, queries: [], termini: input.keywords.slice(0, 5) }
  }

  // Ripiego in coda: se il modello non produce nulla di usabile restiamo
  // comunque con query sensate invece di fallire.
  const queries = [...new Set([...piano.queries, input.categoria].filter(Boolean))]
  if (queries.length === 0) return risultatoVuoto(input)

  const gruppi = await pexelsSearchMulti(queries, { perPage: 15, orientation: 'landscape' })

  const candidati: Candidato[] = []
  for (const gruppo of gruppi) {
    for (const foto of gruppo.photos) {
      candidati.push(valuta(foto, gruppo.rank, gruppo.query, piano.termini, piano.soggetto))
    }
  }

  if (candidati.length === 0) {
    console.warn(`[image] nessun risultato per: ${queries.join(' | ')}`)
    return risultatoVuoto(input)
  }

  // Deduplica: la stessa foto può uscire da più query, teniamo il punteggio migliore.
  const perId = new Map<number, Candidato>()
  for (const c of candidati) {
    const esistente = perId.get(c.foto.id)
    if (!esistente || c.punteggio > esistente.punteggio) perId.set(c.foto.id, c)
  }

  const classifica = [...perId.values()].sort((a, b) => b.punteggio - a.punteggio)
  const vincitore = classifica[0]

  console.log(
    `[image] scelta foto ${vincitore.foto.id} (punteggio ${vincitore.punteggio}, query "${vincitore.query}") ` +
    `su ${classifica.length} candidate — 2ª a ${classifica[1]?.punteggio ?? 0}`
  )

  const altText = await componiAltText(vincitore.foto, input)

  return {
    url: vincitore.foto.src.large2x,
    previewUrl: vincitore.foto.src.medium,
    fotografo: vincitore.foto.photographer,
    creditUrl: vincitore.foto.photographer_url,
    altText,
  }
}

/** Usato dal picker manuale: stesse query del pipeline, risultati ordinati. */
export async function cercaImmaginiPertinenti(
  input: ImageInput,
  limite = 12
): Promise<Array<{ foto: PexelsPhoto; punteggio: number }>> {
  if (!pexelsConfigurato()) return []

  let piano: PianoRicerca
  try {
    piano = await pianificaRicerca(input)
  } catch {
    piano = { soggetto: input.argomento, queries: [], termini: input.keywords.slice(0, 5) }
  }

  const queries = [...new Set([...piano.queries, input.categoria].filter(Boolean))]
  if (queries.length === 0) return []

  const gruppi = await pexelsSearchMulti(queries, { perPage: 15, orientation: 'landscape' })

  const perId = new Map<number, Candidato>()
  for (const gruppo of gruppi) {
    for (const foto of gruppo.photos) {
      const c = valuta(foto, gruppo.rank, gruppo.query, piano.termini, piano.soggetto)
      const esistente = perId.get(foto.id)
      if (!esistente || c.punteggio > esistente.punteggio) perId.set(foto.id, c)
    }
  }

  return [...perId.values()]
    .sort((a, b) => b.punteggio - a.punteggio)
    .slice(0, limite)
    .map((c) => ({ foto: c.foto, punteggio: c.punteggio }))
}
