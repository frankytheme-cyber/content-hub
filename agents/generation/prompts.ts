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

ISTRUZIONI:
1. Scrivi un articolo completo di 900-1200 parole in italiano
2. Usa una struttura H1 → H2 → H2 → ... con heading pertinenti
3. Inserisci i link interni naturalmente nel testo usando ESATTAMENTE il testo anchor specificato, formattato come link Markdown: [testo anchor](url)
4. Includi una sezione "Punti Chiave" all'inizio o alla fine (utile per GEO - ottimizzazione per AI)
5. Il tono "${tono}" deve essere coerente in tutto l'articolo
6. L'articolo deve essere informativo, utile e non promozionale in modo esplicito
7. Includi la keyword principale nel primo paragrafo e in almeno un H2

Restituisci SOLO un JSON con questa struttura:
{
  "titolo": "Titolo dell'articolo (H1, con keyword principale)",
  "corpo": "Corpo completo in Markdown",
  "estratto": "Estratto breve di 2-3 frasi per i motori di ricerca"
}

Restituisci SOLO il JSON, senza markdown o testo aggiuntivo.`
}
