import { estraiHeadings, estraiPrimoParagrafo, troncaTesto } from '@/lib/seo-utils'
import type { SeoInput } from '@/types/agents'

/**
 * Prompt per i soli metadati.
 *
 * Non riceve il corpo integrale ma il suo scheletro (apertura + heading): per
 * scrivere un meta title, una description e una lista di entità serve sapere di
 * cosa parla l'articolo e com'è strutturato, non rileggerne ogni paragrafo.
 */
export function buildSeoPrompt(input: SeoInput): string {
  const { bozza, argomento, categoria, keywordsCorrelate } = input

  const struttura = estraiHeadings(bozza.corpo)
    .filter((h) => h.livello <= 3)
    .map((h) => `${'  '.repeat(Math.max(0, h.livello - 2))}- ${h.testo}`)
    .join('\n')

  const apertura = troncaTesto(estraiPrimoParagrafo(bozza.corpo), 600)

  return `Sei un esperto SEO. Genera i metadati per questo articolo in italiano.

TITOLO: ${bozza.titolo}
ARGOMENTO: ${argomento}
CATEGORIA: ${categoria}
KEYWORD CORRELATE: ${keywordsCorrelate.slice(0, 15).join(', ')}

APERTURA DELL'ARTICOLO:
${apertura}

STRUTTURA DELLE SEZIONI:
${struttura || '(nessun heading rilevato)'}

REGOLE:
- metaTitolo: massimo 60 caratteri, keyword principale il più a sinistra possibile, nessun clickbait.
- metaDescrizione: 150-160 caratteri, contiene la keyword, descrive il beneficio concreto per chi legge e invita all'azione.
- keywordPrincipale: la query che questo articolo deve intercettare, come la digiterebbe un utente.
- keywordSecondarie: 5-8 keyword realmente coperte dalle sezioni elencate sopra, nessuna inventata.
- entita: 5-8 entità nominate concrete citate nell'articolo (marche, modelli, standard, luoghi, persone).
  Servono al markup structured data, quindi devono essere nomi propri, non concetti.
- ogTitolo / ogDescrizione: variante più discorsiva per la condivisione social.

Rispondi SOLO con questo JSON, senza markdown:
{
  "metaTitolo": "...",
  "metaDescrizione": "...",
  "keywordPrincipale": "...",
  "keywordSecondarie": ["..."],
  "entita": ["..."],
  "slug": "slug-url-senza-accenti",
  "ogTitolo": "...",
  "ogDescrizione": "..."
}`
}

/** Prompt chirurgico: genera SOLO la sezione mancante, non riscrive l'articolo. */
export function buildPuntiChiavePrompt(input: SeoInput): string {
  const apertura = troncaTesto(estraiPrimoParagrafo(input.bozza.corpo), 500)
  const struttura = estraiHeadings(input.bozza.corpo)
    .filter((h) => h.livello === 2)
    .map((h) => `- ${h.testo}`)
    .join('\n')

  return `Scrivi la sezione "Punti chiave" per un articolo in italiano su "${input.argomento}".

APERTURA DELL'ARTICOLO:
${apertura}

SEZIONI DELL'ARTICOLO:
${struttura}

REGOLE:
- Esattamente 4 bullet.
- Ogni bullet è un'affermazione autoconclusiva che ha senso letta da sola, con un dato concreto quando disponibile.
- Massimo 25 parole per bullet. Nessuna anticipazione vaga ("scopriremo che…").

Rispondi SOLO con i bullet in markdown, uno per riga, che iniziano con "- ". Nessun titolo, nessun altro testo.`
}

export function buildFaqPrompt(input: SeoInput): string {
  const struttura = estraiHeadings(input.bozza.corpo)
    .filter((h) => h.livello === 2)
    .map((h) => `- ${h.testo}`)
    .join('\n')

  const domande = input.domandeUtenti?.length
    ? `\nDOMANDE REALI DEGLI UTENTI DA PRIVILEGIARE:\n${input.domandeUtenti.map((d) => `- ${d}`).join('\n')}\n`
    : ''

  return `Scrivi la sezione "Domande frequenti" per un articolo in italiano su "${input.argomento}" (categoria: ${input.categoria}).

SEZIONI GIÀ PRESENTI NELL'ARTICOLO (non ripetere ciò che trattano):
${struttura}
${domande}
REGOLE:
- Esattamente 4 coppie domanda/risposta.
- Formato per ciascuna:
### Domanda in forma interrogativa?
Risposta di 40-80 parole che inizia rispondendo, senza premesse.
- Le risposte devono reggersi fuori contesto: sono i blocchi che i motori AI citano.
- Nessun dato inventato: se non lo sai, riformula la domanda su qualcosa di verificabile.

Rispondi SOLO con le 4 coppie in markdown. Non includere il titolo "## Domande frequenti".`
}
