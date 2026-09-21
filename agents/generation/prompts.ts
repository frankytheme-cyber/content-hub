import type { GenerationInput } from '@/types/agents'

export function buildGenerationPrompt(input: GenerationInput, tono: string): string {
  const { ricerca, linkInterni, argomento, categoria } = input

  const linkList = linkInterni
    .map((l) => `- Testo anchor: "${l.testo}" → URL: ${l.url}`)
    .join('\n')

  const sitoBlock = input.sitoIstruzioni
    ? `\nLINEE GUIDA DEL SITO (rispettale con priorità):\n${input.sitoIstruzioni}\n`
    : ''

  const entitaBlock = ricerca.entita?.length
    ? `\nENTITÀ DA CITARE CON PRECISIONE:\n${ricerca.entita.slice(0, 8).join(', ')}\n`
    : ''

  const domandeBlock = ricerca.domandeUtenti?.length
    ? `\nDOMANDE REALI DEGLI UTENTI (usale come H2 o come FAQ, riformulandole):\n${ricerca.domandeUtenti.map((d) => `- ${d}`).join('\n')}\n`
    : ''

  return `Sei un copywriter esperto in content marketing per e-commerce. Scrivi un articolo SEO in italiano.${sitoBlock}

ARGOMENTO: ${argomento}
CATEGORIA E-COMMERCE: ${categoria}
TONO: ${tono}

RICERCA - PUNTI DA COPRIRE:
${ricerca.puntiFondamentali.map((p, i) => `${i + 1}. ${p}`).join('\n')}

KEYWORD SEO DA UTILIZZARE:
${ricerca.keywordsCorrelate.slice(0, 12).join(', ')}
${entitaBlock}${domandeBlock}
LINK INTERNI DA INSERIRE NEL TESTO:
${linkList || 'Nessun link interno richiesto'}

═══ STRUTTURA OBBLIGATORIA ═══
L'articolo deve seguire ESATTAMENTE quest'ordine:

1. Paragrafo di apertura (40-70 parole) che risponde in modo COMPLETO e AUTONOMO alla
   domanda implicita del titolo. Deve reggersi da solo se estratto e citato fuori contesto.
   La keyword principale va nella prima frase.
2. "## Punti chiave" — 4-5 bullet, uno per riga, ciascuno un'affermazione autoconclusiva
   con un dato concreto (numero, misura, prezzo, data). Non anticipazioni vaghe.
3. 4-6 sezioni "## ..." di contenuto. Almeno due titoli in forma di domanda
   ("Come si sceglie...", "Quanto conta...", "Meglio X o Y?").
4. "## Domande frequenti" — 4 coppie in formato:
   ### Domanda in forma interrogativa?
   Risposta di 40-80 parole che inizia rispondendo, senza premesse.

═══ REGOLE SEO ═══
- 1000-1400 parole complessive, in italiano.
- Keyword principale nel primo paragrafo e in almeno un H2. Densità 1-2%: distribuita, mai forzata.
- Gerarchia heading senza salti di livello (H2 → H3, mai H2 → H4).
- Link interni inseriti nel flusso del discorso con ESATTAMENTE il testo anchor indicato,
  in formato Markdown [testo anchor](url). Mai "clicca qui" o "leggi di più".
- Non scrivere il titolo H1 nel corpo: viene gestito separatamente.

═══ REGOLE GEO (motori generativi: ChatGPT, Perplexity, AI Overviews) ═══
- Ogni sezione si apre con la conclusione, poi la spiega. Mai costruire suspense.
- Definisci ogni termine tecnico la prima volta che lo usi, nella stessa frase.
- Usa cifre concrete con unità di misura, date esplicite e nomi propri completi:
  i motori generativi citano i passaggi verificabili e ignorano quelli vaghi.
- Quando un'informazione viene da una fonte, attribuiscila nel testo
  ("secondo i dati di …", "il produttore dichiara …").
- Inserisci almeno una tabella Markdown di confronto se l'argomento prevede alternative.
- Evita "è importante notare che", "nel mondo di oggi", "in conclusione" e ogni
  riempitivo che non aggiunge informazione.
- Nessuna affermazione non supportata dai punti di ricerca qui sopra. Se un dato manca,
  scrivi il contenuto senza quel dato invece di inventarlo.

Il tono "${tono}" deve restare coerente dall'inizio alla fine. L'articolo è informativo,
non promozionale.

Rispondi ESATTAMENTE in questo formato — nessun testo prima o dopo:

<ARTICLE>
[corpo completo dell'articolo in Markdown, senza il titolo]
</ARTICLE>

<META>
{"titolo": "Titolo H1 con keyword principale, max 65 caratteri", "estratto": "Meta description di 150-160 caratteri che invoglia al clic e contiene la keyword"}
</META>`
}
