import slugify from 'slugify'
import type { ReviewCorrezione, SeoMetadata } from '@/types/agents'

// ─── Limiti SEO ──────────────────────────────────────────────────────────────

export const MAX_META_TITOLO = 60
export const MAX_META_DESCRIZIONE = 160
export const MAX_OG_DESCRIZIONE = 200
export const MAX_ALT_TEXT = 125
/** schema.org tronca `headline` oltre i 110 caratteri. */
export const MAX_HEADLINE_SCHEMA = 110

// ─── Testo ───────────────────────────────────────────────────────────────────

/** Tronca su confine di parola, senza spezzare l'ultima parola a metà. */
export function troncaTesto(testo: string, max: number): string {
  const pulito = testo.replace(/\s+/g, ' ').trim()
  if (pulito.length <= max) return pulito

  const tagliato = pulito.slice(0, max)
  const ultimoSpazio = tagliato.lastIndexOf(' ')
  const base = ultimoSpazio > max * 0.6 ? tagliato.slice(0, ultimoSpazio) : tagliato
  return base.replace(/[\s,;:.\-–—]+$/, '')
}

export function normalizzaSlug(testo: string): string {
  return slugify(testo, { lower: true, strict: true, locale: 'it' }).slice(0, 80).replace(/-+$/, '')
}

/** Rimuove la sintassi markdown per ottenere il testo leggibile. */
export function markdownATesto(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function contaParole(markdown: string): number {
  const testo = markdownATesto(markdown)
  return testo.length === 0 ? 0 : testo.split(/\s+/).length
}

export function tempoLetturaMinuti(markdown: string): number {
  return Math.max(1, Math.round(contaParole(markdown) / 200))
}

// ─── Struttura ───────────────────────────────────────────────────────────────

export interface Heading {
  livello: number
  testo: string
}

export function estraiHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  const regex = /^(#{1,6})\s+(.+?)\s*$/gm
  let match: RegExpExecArray | null
  while ((match = regex.exec(markdown)) !== null) {
    headings.push({ livello: match[1].length, testo: markdownATesto(match[2]) })
  }
  return headings
}

/** Ritorna il corpo della sezione il cui H2 corrisponde a `pattern`. */
export function estraiSezione(markdown: string, pattern: RegExp): string | null {
  const righe = markdown.split('\n')
  let inizio = -1
  let livelloSezione = 0

  for (let i = 0; i < righe.length; i++) {
    const m = righe[i].match(/^(#{2,3})\s+(.+?)\s*$/)
    if (!m) continue

    if (inizio === -1 && pattern.test(m[2])) {
      inizio = i + 1
      livelloSezione = m[1].length
      continue
    }
    // La sezione finisce al primo heading di livello pari o superiore.
    if (inizio !== -1 && m[1].length <= livelloSezione) {
      return righe.slice(inizio, i).join('\n').trim()
    }
  }

  return inizio === -1 ? null : righe.slice(inizio).join('\n').trim()
}

export interface FaqItem {
  domanda: string
  risposta: string
}

/**
 * Estrae le Q&A dalla sezione "Domande frequenti".
 * Riconosce sia `### Domanda?` sia `**Domanda?**` come intestazione della coppia.
 */
export function estraiFaq(markdown: string): FaqItem[] {
  const sezione = estraiSezione(markdown, /domande\s+frequenti|faq|domande\s+comuni/i)
  if (!sezione) return []

  const items: FaqItem[] = []
  const righe = sezione.split('\n')

  let domandaCorrente: string | null = null
  let rispostaCorrente: string[] = []

  const chiudi = () => {
    if (domandaCorrente) {
      const risposta = markdownATesto(rispostaCorrente.join(' ')).trim()
      if (risposta.length > 0) items.push({ domanda: domandaCorrente, risposta })
    }
    domandaCorrente = null
    rispostaCorrente = []
  }

  for (const riga of righe) {
    const heading = riga.match(/^#{3,6}\s+(.+?)\s*$/)
    const grassetto = riga.match(/^\s*(?:[-*]\s*)?\*\*(.+?)\*\*:?\s*(.*)$/)

    if (heading) {
      chiudi()
      domandaCorrente = markdownATesto(heading[1])
    } else if (grassetto && grassetto[1].length > 8) {
      chiudi()
      domandaCorrente = markdownATesto(grassetto[1])
      if (grassetto[2]) rispostaCorrente.push(grassetto[2])
    } else if (domandaCorrente && riga.trim().length > 0) {
      rispostaCorrente.push(riga)
    }
  }
  chiudi()

  return items.filter((i) => i.domanda.length > 5 && i.risposta.length > 15)
}

export function estraiPuntiChiave(markdown: string): string[] {
  const sezione = estraiSezione(markdown, /punti\s+chiave|in\s+sintesi|takeaway|riepilogo/i)
  if (!sezione) return []

  return sezione
    .split('\n')
    .map((r) => r.match(/^\s*(?:[-+*]|\d+\.)\s+(.+)$/)?.[1])
    .filter((r): r is string => Boolean(r))
    .map((r) => markdownATesto(r))
    .filter((r) => r.length > 10)
}

/** Primo paragrafo di testo vero, saltando heading, liste e citazioni. */
export function estraiPrimoParagrafo(markdown: string): string {
  const blocchi = markdown.split(/\n\s*\n/)
  for (const blocco of blocchi) {
    const t = blocco.trim()
    if (t.length === 0) continue
    if (/^#{1,6}\s/.test(t)) continue
    if (/^\s*(?:[-+*]|\d+\.)\s/.test(t)) continue
    if (/^\s*>/.test(t)) continue
    if (/^\s*\|/.test(t)) continue
    const testo = markdownATesto(t)
    if (testo.length > 40) return testo
  }
  return ''
}

// ─── Keyword ─────────────────────────────────────────────────────────────────

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const STOPWORD_KEYWORD = new Set([
  'come', 'cosa', 'quale', 'quali', 'quando', 'dove', 'perche', 'scegliere',
  'migliore', 'migliori', 'guida', 'per', 'con', 'del', 'della', 'dei', 'delle',
  'dal', 'nel', 'una', 'uno', 'gli', 'gio', 'che', 'gli', 'sul', 'gia',
])

function normalizzaConfronto(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** I termini portanti di una keyword, ignorando modificatori e parole vuote. */
function terminiPortanti(keyword: string): string[] {
  return normalizzaConfronto(keyword)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !STOPWORD_KEYWORD.has(t))
}

/**
 * La keyword è coperta se tutti i suoi termini portanti compaiono nel testo.
 *
 * Il confronto letterale era inutilizzabile: l'argomento inserito nel wizard è
 * una frase ("Come scegliere un amplificatore integrato per diffusori da
 * scaffale") che nessun articolo ripete alla lettera, quindi ogni controllo
 * sulla keyword risultava fallito anche su testi perfettamente ottimizzati.
 */
export function keywordCoperta(testo: string, keyword: string): boolean {
  const termini = terminiPortanti(keyword)
  if (termini.length === 0) return false

  const normalizzato = normalizzaConfronto(testo)
  return termini.every((t) => normalizzato.includes(t))
}

/**
 * Densità della keyword in percentuale sul totale delle parole.
 * Usa la frase esatta quando compare; altrimenti ripiega sulla frequenza del
 * termine portante più raro, che approssima quanto il tema è realmente trattato.
 */
export function densitaKeyword(markdown: string, keyword: string): number {
  if (!keyword.trim()) return 0

  const testo = normalizzaConfronto(markdownATesto(markdown))
  const parole = testo.split(/\s+/).filter(Boolean).length
  if (parole === 0) return 0

  const frase = normalizzaConfronto(keyword.trim())
  const occorrenzeFrase = testo.match(new RegExp(escapeRegex(frase), 'g'))?.length ?? 0
  const paroleKeyword = frase.split(/\s+/).length

  if (occorrenzeFrase > 0) {
    return (occorrenzeFrase * paroleKeyword * 100) / parole
  }

  const termini = terminiPortanti(keyword)
  if (termini.length === 0) return 0

  const frequenze = termini.map(
    (t) => testo.match(new RegExp(`\\b${escapeRegex(t)}`, 'g'))?.length ?? 0
  )
  const minima = Math.min(...frequenze)
  return (minima * termini.length * 100) / parole
}

// ─── Diagnostica GEO ─────────────────────────────────────────────────────────

export interface DiagnosiGeo {
  punteggio: number
  parole: number
  controlli: Array<{ nome: string; superato: boolean; dettaglio: string }>
  mancanti: string[]
}

/**
 * Verifica in locale i requisiti SEO/GEO misurabili senza chiamare un modello.
 * Serve sia come punteggio mostrato all'utente sia come lista di correzioni
 * mirate da passare all'agente, invece di far riscrivere l'intero articolo.
 */
export function analizzaGeo(markdown: string, keywordPrincipale: string): DiagnosiGeo {
  const headings = estraiHeadings(markdown)
  const h2 = headings.filter((h) => h.livello === 2)
  const faq = estraiFaq(markdown)
  const punti = estraiPuntiChiave(markdown)
  const primoParagrafo = estraiPrimoParagrafo(markdown)
  const parole = contaParole(markdown)
  const densita = densitaKeyword(markdown, keywordPrincipale)
  const kw = keywordPrincipale.toLowerCase()

  const controlli = [
    {
      nome: 'Risposta diretta in apertura',
      superato: primoParagrafo.length >= 120 && primoParagrafo.length <= 700,
      dettaglio: `Primo paragrafo di ${primoParagrafo.length} caratteri (atteso 120-700)`,
    },
    {
      nome: 'Keyword nel primo paragrafo',
      superato: Boolean(kw) && keywordCoperta(primoParagrafo, keywordPrincipale),
      dettaglio: kw
        ? `termini di "${keywordPrincipale}" ${keywordCoperta(primoParagrafo, keywordPrincipale) ? 'presenti' : 'assenti'} in apertura`
        : 'keyword non definita',
    },
    {
      nome: 'Keyword in almeno un H2',
      superato: Boolean(kw) && h2.some((h) => keywordCoperta(h.testo, keywordPrincipale)),
      dettaglio: `${h2.length} H2 presenti`,
    },
    {
      nome: 'Sezione "Punti chiave"',
      superato: punti.length >= 3,
      dettaglio: `${punti.length} bullet trovati (attesi >= 3)`,
    },
    {
      nome: 'Sezione "Domande frequenti"',
      superato: faq.length >= 3,
      dettaglio: `${faq.length} Q&A trovate (attese >= 3)`,
    },
    {
      nome: 'H2 in forma di domanda',
      superato: h2.some((h) => /^(come|cosa|quale|quali|quando|perch|dove|quanto|conviene|meglio)/i.test(h.testo) || h.testo.includes('?')),
      dettaglio: 'almeno un H2 interrogativo aiuta il matching con le query conversazionali',
    },
    {
      nome: 'Lunghezza adeguata',
      superato: parole >= 800,
      dettaglio: `${parole} parole (attese >= 800)`,
    },
    {
      nome: 'Densità keyword 0.5-2.5%',
      superato: densita >= 0.5 && densita <= 2.5,
      dettaglio: `densità ${densita.toFixed(2)}%`,
    },
    {
      nome: 'Dati verificabili (cifre o date)',
      superato: (markdownATesto(markdown).match(/\b(19|20)\d{2}\b|\d+([.,]\d+)?\s?(%|€|\$|kg|cm|mm|W|Hz|kHz|GB|ore|minuti)/gi) ?? []).length >= 3,
      dettaglio: 'numeri e date rendono il contenuto citabile dai motori AI',
    },
    {
      nome: 'Gerarchia heading coerente',
      superato: h2.length >= 3 && !headings.some((h, i) => i > 0 && h.livello - headings[i - 1].livello > 1),
      dettaglio: `${h2.length} H2, nessun salto di livello`,
    },
  ]

  const superati = controlli.filter((c) => c.superato).length
  return {
    punteggio: Math.round((superati / controlli.length) * 100),
    parole,
    controlli,
    mancanti: controlli.filter((c) => !c.superato).map((c) => `${c.nome} — ${c.dettaglio}`),
  }
}

// ─── Schema JSON-LD ──────────────────────────────────────────────────────────

export interface SchemaInput {
  titolo: string
  descrizione: string
  corpo: string
  categoria: string
  keywordPrincipale: string
  keywordSecondarie: string[]
  entita: string[]
  slug: string
  siteUrl?: string
  autore?: string
  immagineUrl?: string
  tipo?: 'Article' | 'BlogPosting' | 'Review'
  schemaEsistente?: object
}

/**
 * Costruisce un grafo JSON-LD completo.
 *
 * Generato in codice e non dal modello: è output strutturato e deterministico,
 * quindi farlo scrivere a un LLM costa token e introduce errori di sintassi.
 */
export function costruisciSchema(input: SchemaInput): object {
  const {
    titolo, descrizione, corpo, categoria, keywordPrincipale, keywordSecondarie,
    entita, slug, siteUrl, autore, immagineUrl, tipo = 'Article',
  } = input

  const base = siteUrl?.replace(/\/$/, '') ?? ''
  const urlArticolo = base ? `${base}/${slug}` : `#${slug}`
  const adesso = new Date().toISOString()
  const faq = estraiFaq(corpo)

  const keywords = [keywordPrincipale, ...keywordSecondarie].filter(Boolean)

  const grafo: object[] = [
    {
      '@type': tipo,
      '@id': `${urlArticolo}#article`,
      headline: troncaTesto(titolo, MAX_HEADLINE_SCHEMA),
      description: troncaTesto(descrizione, MAX_META_DESCRIZIONE),
      inLanguage: 'it-IT',
      articleSection: categoria,
      keywords: keywords.join(', '),
      wordCount: contaParole(corpo),
      datePublished: adesso,
      dateModified: adesso,
      mainEntityOfPage: { '@type': 'WebPage', '@id': urlArticolo },
      ...(autore ? { author: { '@type': 'Person', name: autore } } : {}),
      ...(immagineUrl ? { image: { '@type': 'ImageObject', url: immagineUrl } } : {}),
      ...(entita.length > 0
        ? { about: entita.slice(0, 8).map((e) => ({ '@type': 'Thing', name: e })) }
        : {}),
      // Indica ai motori vocali/AI quali blocchi contengono la risposta sintetica.
      speakable: {
        '@type': 'SpeakableSpecification',
        cssSelector: ['h1', '.punti-chiave', '.faq'],
      },
    },
  ]

  if (faq.length > 0) {
    grafo.push({
      '@type': 'FAQPage',
      '@id': `${urlArticolo}#faq`,
      mainEntity: faq.map((f) => ({
        '@type': 'Question',
        name: f.domanda,
        acceptedAnswer: { '@type': 'Answer', text: troncaTesto(f.risposta, 800) },
      })),
    })
  }

  if (categoria) {
    grafo.push({
      '@type': 'BreadcrumbList',
      '@id': `${urlArticolo}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: base || '/' },
        { '@type': 'ListItem', position: 2, name: categoria },
        { '@type': 'ListItem', position: 3, name: troncaTesto(titolo, MAX_HEADLINE_SCHEMA) },
      ],
    })
  }

  return { '@context': 'https://schema.org', '@graph': grafo }
}

// ─── Validazione metadati ────────────────────────────────────────────────────

export interface ValidazioneSeo {
  metadata: SeoMetadata
  avvisi: string[]
}

/**
 * Normalizza i metadati prodotti dal modello: tronca ciò che supera i limiti,
 * riempie i campi vuoti con fallback ragionevoli e segnala cosa è stato corretto.
 */
export function validaSeoMetadata(
  meta: Partial<SeoMetadata>,
  ctx: { titolo: string; estratto: string; corpo: string; argomento: string; categoria: string }
): ValidazioneSeo {
  const avvisi: string[] = []

  const metaTitoloGrezzo = (meta.metaTitolo ?? ctx.titolo ?? '').trim()
  let metaTitolo = metaTitoloGrezzo
  if (metaTitolo.length > MAX_META_TITOLO) {
    metaTitolo = troncaTesto(metaTitolo, MAX_META_TITOLO)
    avvisi.push(`metaTitolo troncato da ${metaTitoloGrezzo.length} a ${metaTitolo.length} caratteri`)
  }
  if (metaTitolo.length === 0) {
    metaTitolo = troncaTesto(ctx.titolo || ctx.argomento, MAX_META_TITOLO)
    avvisi.push('metaTitolo mancante: usato il titolo dell\'articolo')
  }

  const descrizioneGrezza = (meta.metaDescrizione ?? ctx.estratto ?? '').trim()
  let metaDescrizione = descrizioneGrezza
  if (metaDescrizione.length > MAX_META_DESCRIZIONE) {
    metaDescrizione = troncaTesto(metaDescrizione, MAX_META_DESCRIZIONE)
    avvisi.push(`metaDescrizione troncata da ${descrizioneGrezza.length} a ${metaDescrizione.length} caratteri`)
  }
  if (metaDescrizione.length < 50) {
    const fallback = ctx.estratto || estraiPrimoParagrafo(ctx.corpo)
    metaDescrizione = troncaTesto(fallback, MAX_META_DESCRIZIONE)
    avvisi.push('metaDescrizione troppo corta: rigenerata dal primo paragrafo')
  }

  const slug = normalizzaSlug(meta.slug || metaTitolo || ctx.titolo || ctx.argomento)

  const keywordPrincipale = (meta.keywordPrincipale ?? ctx.argomento).trim()
  const keywordSecondarie = (meta.keywordSecondarie ?? [])
    .map((k) => String(k).trim())
    .filter((k) => k.length > 0 && k.toLowerCase() !== keywordPrincipale.toLowerCase())
    .slice(0, 12)

  const ogTitolo = troncaTesto(meta.ogTitolo || metaTitolo, MAX_META_TITOLO)
  const ogDescrizione = troncaTesto(meta.ogDescrizione || metaDescrizione, MAX_OG_DESCRIZIONE)

  return {
    metadata: {
      metaTitolo,
      metaDescrizione,
      keywordPrincipale,
      keywordSecondarie,
      slug,
      schemaMarkup: meta.schemaMarkup ?? {},
      geoHints: (meta.geoHints ?? []).map((g) => String(g).trim()).filter(Boolean).slice(0, 10),
      ogTitolo,
      ogDescrizione,
    },
    avvisi,
  }
}

// ─── Applicazione correzioni ─────────────────────────────────────────────────

function normalizzaPerConfronto(s: string): string {
  return s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Un token della citazione, con apici e trattini resi intercambiabili. */
function tokenFlessibile(token: string): string {
  return escapeRegex(token).replace(
    /['"\-]/g,
    '[\'"‘’“”\\-–—]'
  )
}

/**
 * Separatore che assorbe la sintassi markdown fra due parole.
 *
 * Il revisore legge la prosa e cita il testo senza formattazione: la sua
 * "copia esatta" di `da **50 W** per i [diffusori](url) in casa` arriva come
 * `da 50 W per i diffusori in casa`. Consentendo asterischi, underscore e la
 * coda `](url)` fra un token e il successivo, la citazione torna ad agganciarsi.
 */
const SEPARATORE_MARKDOWN = '[\\s*_~`\\[\\]]*(?:\\([^)\\n]{0,300}\\))?[\\s*_~`\\[\\]]*'

function cercaESostituisci(
  testo: string,
  pattern: string,
  sostituto: string
): string | null {
  try {
    const regex = new RegExp(pattern)
    return regex.test(testo) ? testo.replace(regex, () => sostituto) : null
  } catch {
    // Pattern non compilabile: la correzione viene trattata come fallita.
    return null
  }
}

/**
 * Applica le correzioni della revisione.
 *
 * Il modello riporta il testo originale "a memoria" e ne normalizza apici,
 * trattini, spaziatura e formattazione: un `String.replace` esatto fallisce
 * silenziosamente. Proviamo in ordine il match esatto, uno tollerante sulla
 * punteggiatura e uno che attraversa la sintassi markdown.
 */
export function applicaCorrezioni(
  corpo: string,
  correzioni: ReviewCorrezione[]
): { corpo: string; applicate: number; fallite: ReviewCorrezione[] } {
  let result = corpo
  let applicate = 0
  const fallite: ReviewCorrezione[] = []

  for (const c of correzioni) {
    if (!c?.originale || typeof c.corretto !== 'string') continue

    if (result.includes(c.originale)) {
      result = result.replace(c.originale, c.corretto)
      applicate++
      continue
    }

    const bersaglio = normalizzaPerConfronto(c.originale)
    if (bersaglio.length < 10) {
      fallite.push(c)
      continue
    }

    const token = bersaglio.split(' ').map(tokenFlessibile)

    // 1. Solo spaziatura e punteggiatura diverse.
    const conSpazi = cercaESostituisci(result, token.join('\\s+'), c.corretto)
    if (conSpazi !== null) {
      result = conSpazi
      applicate++
      continue
    }

    // 2. La citazione attraversa formattazione markdown. Richiede almeno cinque
    //    token: con frammenti più corti il pattern diventa troppo permissivo e
    //    rischierebbe di sostituire il punto sbagliato.
    if (token.length >= 5) {
      const conMarkdown = cercaESostituisci(result, token.join(SEPARATORE_MARKDOWN), c.corretto)
      if (conMarkdown !== null) {
        result = conMarkdown
        applicate++
        continue
      }
    }

    fallite.push(c)
  }

  return { corpo: result, applicate, fallite }
}
