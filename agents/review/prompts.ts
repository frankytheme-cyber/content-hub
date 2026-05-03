import type { ReviewInput } from '@/types/agents'

export function buildReviewPrompt(input: ReviewInput): string {
  const { bozza, fonti } = input

  const fontiTesto = fonti
    .slice(0, 6)
    .map((f) => `[${f.url}] ${f.estratto}`)
    .join('\n\n')

  return `Sei un editor esperto in content marketing. Verifica questo articolo e produci un report di revisione in italiano.

ARTICOLO DA REVISIONARE (tono: ${bozza.tono}):
${bozza.corpo}

FONTI DI RIFERIMENTO:
${fontiTesto}

ISTRUZIONI:
1. Verifica che le affermazioni fattuali siano supportate dalle fonti
2. Identifica errori grammaticali e stilistici in italiano
3. Verifica i requisiti SEO: keyword principale nel primo paragrafo, almeno un H2 con keyword, densità 1-2%
4. Verifica i requisiti GEO: presenza di sezione "Punti chiave", sezione "Domande frequenti", risposta diretta nel primo paragrafo
5. Valuta la qualità complessiva con un punteggio da 0 a 100 (SEO e GEO contano 30% del punteggio)
6. Se il punteggio è >= 75, l'articolo è approvato
7. Per ogni correzione, riporta il testo ESATTO originale e la versione corretta

Restituisci SOLO un JSON con questa struttura:
{
  "approvato": true/false,
  "punteggio": 0-100,
  "correzioni": [
    {
      "tipo": "fattuale|grammatica|stile",
      "originale": "testo esatto da correggere (copia dal testo)",
      "corretto": "testo corretto sostitutivo",
      "spiegazione": "breve spiegazione"
    }
  ]
}

Restituisci SOLO il JSON.`
}
