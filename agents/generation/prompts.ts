import type { GenerationInput } from '@/types/agents'

export function buildGenerationPrompt(input: GenerationInput, tono: string): string {
  const { ricerca, linkInterni, argomento, categoria } = input

  const linkList = linkInterni
    .map((l) => `- Testo anchor: "${l.testo}" → URL: ${l.url}`)
    .join('\n')

  const sitoBlock = input.sitoIstruzioni
    ? `\nLINEE GUIDA DEL SITO (rispettale con priorità):\n${input.sitoIstruzioni}\n`
    : ''

  return `Sei un copywriter esperto in content marketing per e-commerce. Scrivi un articolo SEO in italiano.${sitoBlock}

ARGOMENTO: ${argomento}
CATEGORIA E-COMMERCE: ${categoria}
TONO: ${tono}

RICERCA - PUNTI DA COPRIRE:
${ricerca.puntiFondamentali.map((p, i) => `${i + 1}. ${p}`).join('\n')}

KEYWORD SEO DA UTILIZZARE:
${ricerca.keywordsCorrelate.slice(0, 10).join(', ')}

LINK INTERNI DA INSERIRE NEL TESTO:
${linkList || 'Nessun link interno richiesto'}

ISTRUZIONI SEO E GEO:
1. Scrivi un articolo completo di 900-1200 parole in italiano
2. Usa una struttura H1 → H2 → H2 → ... con heading che contengono keyword naturali
3. Inserisci i link interni naturalmente nel testo usando ESATTAMENTE il testo anchor specificato, formattato come link Markdown: [testo anchor](url)
4. Inizia con un paragrafo introduttivo che risponde direttamente alla domanda principale (ottimizzazione GEO: i motori AI estraggono risposte dirette)
5. Includi una sezione "## Punti chiave" in apertura con 3-5 bullet point sintetici (fondamentale per GEO)
6. Aggiungi una sezione "## Domande frequenti" con 3-4 Q&A in fondo (schema FAQ, GEO snippet)
7. Definisci i termini tecnici o di settore la prima volta che li usi (entity clarity per GEO)
8. Cita entità specifiche (brand, luoghi, persone, prodotti) in modo preciso e verificabile
9. Il tono "${tono}" deve essere coerente in tutto l'articolo
10. L'articolo deve essere informativo e utile; evita toni troppo promozionali
11. Includi la keyword principale nel primo paragrafo e in almeno un H2 (densità 1-2%)

Rispondi ESATTAMENTE in questo formato — nessun testo prima o dopo:

<ARTICLE>
[corpo completo dell'articolo in Markdown, senza il titolo]
</ARTICLE>

<META>
{"titolo": "Titolo H1 con keyword principale", "estratto": "Estratto di 2-3 frasi per i motori di ricerca"}
</META>`
}
