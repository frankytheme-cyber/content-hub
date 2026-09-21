import { troncaTesto } from '@/lib/seo-utils'
import type { ReviewInput } from '@/types/agents'

export function buildReviewPrompt(input: ReviewInput): string {
  const { bozza, fonti } = input

  const fontiTesto = fonti
    .slice(0, 6)
    .map((f) => `[${f.url}] ${troncaTesto(f.estratto, 350)}`)
    .join('\n\n')

  // I requisiti SEO/GEO misurabili (densità keyword, presenza delle sezioni,
  // gerarchia heading) sono verificati in locale da analizzaGeo: chiederli anche
  // qui significherebbe pagare un modello per contare, e ottenere un conteggio
  // meno affidabile. La revisione si concentra su ciò che solo un modello sa fare.
  return `Sei un editor esperto. Verifica questo articolo e produci un report di revisione in italiano.

ARTICOLO DA REVISIONARE (tono: ${bozza.tono}):
${bozza.corpo}

FONTI DI RIFERIMENTO:
${fontiTesto}

VERIFICA:
1. Affermazioni fattuali non supportate dalle fonti, o in contraddizione con esse.
2. Dati, date, cifre e nomi propri errati o imprecisi.
3. Errori di grammatica, concordanza e punteggiatura in italiano.
4. Passaggi vaghi o riempitivi che non aggiungono informazione.
5. Coerenza del tono dichiarato lungo tutto il testo.

REGOLE PER LE CORREZIONI:
- "originale" deve essere una copia ESATTA e VERBATIM del testo presente nell'articolo,
  inclusa la punteggiatura. Non riscriverlo a memoria, non normalizzare apici o trattini.
- Copia il frammento più corto che identifichi il punto in modo univoco (una frase, non un paragrafo).
- Massimo 12 correzioni, dalle più gravi alle meno gravi.
- Non proporre correzioni puramente stilistiche se il testo è già corretto.
- "punteggio": qualità editoriale complessiva da 0 a 100 (accuratezza, chiarezza, utilità).

Restituisci SOLO un JSON con questa struttura:
{
  "approvato": true/false,
  "punteggio": 0-100,
  "correzioni": [
    {
      "tipo": "fattuale|grammatica|stile",
      "originale": "testo esatto copiato dall'articolo",
      "corretto": "testo corretto sostitutivo",
      "spiegazione": "breve spiegazione"
    }
  ]
}`
}
