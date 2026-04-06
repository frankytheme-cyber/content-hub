import type { SeoInput } from '@/types/agents'

export function buildSeoPrompt(input: SeoInput): string {
  const { bozza, argomento, categoria, keywordsCorrelate } = input

  return `Sei un esperto SEO e copywriter specializzato in e-commerce. Genera i metadati SEO e ottimizza il corpo dell'articolo in italiano.

ARTICOLO:
Titolo: ${bozza.titolo}
Estratto: ${bozza.estratto}

ARGOMENTO: ${argomento}
CATEGORIA: ${categoria}
KEYWORD CORRELATE: ${keywordsCorrelate.slice(0, 15).join(', ')}

CORPO DELL'ARTICOLO:
${bozza.corpo}

ISTRUZIONI PER L'OTTIMIZZAZIONE DEL CORPO:
1. Assicurati che la keyword principale appaia nel primo paragrafo e in almeno un H2
2. Distribuisci naturalmente le keyword secondarie nel testo (densità 1-2%)
3. Aggiungi una sezione "## Domande Frequenti" con 3-4 domande e risposte pertinenti (ottimizzazione GEO per AI)
4. Mantieni il tono e lo stile originale
5. Non aggiungere link o modificare i link esistenti
6. Non cambiare la struttura generale dell'articolo

Restituisci SOLO un JSON con questa struttura:
{
  "metadata": {
    "metaTitolo": "titolo SEO ottimizzato (max 60 caratteri)",
    "metaDescrizione": "descrizione SEO coinvolgente (max 160 caratteri)",
    "keywordPrincipale": "keyword principale dell'articolo",
    "keywordSecondarie": ["keyword 2", "keyword 3", ...] (5-8 keyword),
    "slug": "slug-url-ottimizzato-senza-accenti",
    "schemaMarkup": {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "...",
      "description": "...",
      "keywords": "...",
      "articleSection": "..."
    },
    "geoHints": ["entità 1", "brand 1", ...] (entità nominate per GEO),
    "ogTitolo": "titolo Open Graph",
    "ogDescrizione": "descrizione Open Graph (max 200 caratteri)"
  },
  "corpoOttimizzato": "corpo completo ottimizzato in Markdown"
}

Restituisci SOLO il JSON.`
}
