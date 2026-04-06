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
3. Valuta la qualità complessiva con un punteggio da 0 a 100
4. Se il punteggio è >= 75, l'articolo è approvato
5. Per ogni correzione, riporta il testo ESATTO originale e la versione corretta

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
