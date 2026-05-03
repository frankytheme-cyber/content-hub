import { callClaude } from '@/lib/claude-cli'
import type { AggiornamentoInput, ArticoloBozza } from '@/types/agents'

function parseRisposta(text: string, titolo: string): ArticoloBozza {
  const articleMatch = text.match(/<ARTICLE>([\s\S]*?)<\/ARTICLE>/)
  const metaMatch = text.match(/<META>([\s\S]*?)<\/META>/)

  if (!articleMatch) {
    throw new Error('Risposta malformata: tag <ARTICLE> non trovato')
  }

  let estratto = ''
  let tag: string[] = []
  let nota: string | undefined

  if (metaMatch) {
    try {
      const meta = JSON.parse(metaMatch[1].trim())
      estratto = meta.estratto ?? ''
      tag = meta.tag ?? []
      nota = meta.nota
    } catch {
      // meta non parsabile, usiamo i default
    }
  }

  return {
    tono: 'aggiornato',
    titolo,
    corpo: articleMatch[1].trim(),
    estratto,
    tag,
    ...(nota ? { nota } : {}),
  } as ArticoloBozza
}

function buildPromptStandard(input: AggiornamentoInput): string {
  const { titolo, contenutoOriginale, ricerca, istruzioniSito, focus } = input
  const fontiText = ricerca.fonti.slice(0, 6).map((f) => `- ${f.titolo} (${f.url})\n  ${f.estratto}`).join('\n')

  return `Sei un editor esperto in content marketing. Il tuo compito è aggiornare un articolo esistente integrando le nuove informazioni dalla ricerca.

ISTRUZIONI DEL SITO:
${istruzioniSito || 'Nessuna istruzione specifica.'}

TITOLO ARTICOLO: "${titolo}"

${focus ? `FOCUS DELL'AGGIORNAMENTO: ${focus}\n` : ''}

CONTENUTO ORIGINALE:
${contenutoOriginale.slice(0, 8000)}

RICERCA AGGIORNATA:
Sommario: ${ricerca.sommario}

Punti fondamentali:
${ricerca.puntiFondamentali.map((p) => `- ${p}`).join('\n')}

Fonti recenti:
${fontiText}

ISTRUZIONI SEO E GEO:
1. Scrivi una versione aggiornata completa dell'articolo
2. Mantieni la struttura e il tono del testo originale
3. Integra le nuove informazioni dalla ricerca dove pertinente — se la ricerca riguarda un'entità diversa da quella dell'articolo, ignorala e aggiorna solo con le informazioni già presenti nel contenuto originale
4. Aggiorna o rimuovi le informazioni obsolete; aggiorna date, numeri e statistiche
5. Ottimizza per SEO: la keyword principale deve comparire nel primo paragrafo e in almeno un H2 (densità 1-2%)
6. Ottimizza per GEO (motori AI): aggiungi o aggiorna la sezione "## Punti chiave" con 3-5 bullet sintetici; aggiungi o aggiorna una sezione "## Domande frequenti" con 3-4 Q&A
7. Il primo paragrafo deve rispondere direttamente alla domanda implicita del titolo
8. Cita entità specifiche (persone, luoghi, brand, date) in modo preciso e verificabile
9. Scrivi in italiano, usando markdown (## per H2, ### per H3, - per liste)
10. Non includere il titolo nell'articolo (viene gestito separatamente)

Rispondi ESATTAMENTE in questo formato — nessun testo prima o dopo:

<ARTICLE>
[articolo completo aggiornato in markdown]
</ARTICLE>

<META>
{"estratto": "breve descrizione max 160 caratteri", "tag": ["tag1", "tag2"], "nota": "eventuali osservazioni sulla ricerca (opzionale)"}
</META>`
}

function buildPromptBiografia(input: AggiornamentoInput): string {
  const { titolo, contenutoOriginale, ricerca, istruzioniSito, focus } = input
  const fontiText = ricerca.fonti.slice(0, 6).map((f) => `- ${f.titolo} (${f.url})\n  ${f.estratto}${f.dataPubblicazione ? ` (${f.dataPubblicazione})` : ''}`).join('\n')

  return `Sei un redattore specializzato in contenuti musicali per pulashock.it. Il tuo compito è aggiornare una biografia artistica esistente integrando le nuove informazioni dalla ricerca.

ISTRUZIONI DEL SITO:
${istruzioniSito || 'Nessuna istruzione specifica.'}

ARTISTA / TITOLO: "${titolo}"

${focus ? `FOCUS DELL'AGGIORNAMENTO: ${focus}\n` : ''}

BIOGRAFIA ORIGINALE:
${contenutoOriginale.slice(0, 8000)}

RICERCA AGGIORNATA:
Sommario: ${ricerca.sommario}

Punti fondamentali:
${ricerca.puntiFondamentali.map((p) => `- ${p}`).join('\n')}

Fonti recenti:
${fontiText}

ISTRUZIONI PER L'AGGIORNAMENTO BIOGRAFIA:
1. Mantieni la struttura a 10 sezioni della biografia originale (apertura, identità artistica, origini, percorso, discografia, collaborazioni, media, citazioni, FAQ, artisti correlati)
2. Aggiorna la sezione "Percorso e momenti chiave" con nuovi eventi, concerti, premi o collaborazioni recenti
3. Aggiorna la "Discografia selezionata" con nuove uscite (album, EP, singoli) — includi titolo, anno, etichetta
4. Aggiorna le FAQ se emergono nuove domande frequenti rilevanti
5. Aggiorna le citazioni se trovi interviste più recenti
6. Aggiorna le date e i fatti verificabili — rimuovi informazioni obsolete
7. Mantieni il tono informativo e autorevole, mai promozionale
8. Ogni affermazione deve essere verificabile e attribuibile a una fonte
9. Non inventare URL: linka solo URL esplicitamente presenti nel contenuto originale o nelle fonti
10. Scrivi in italiano, usando markdown (## per H2, - per liste)
11. Non includere il titolo nell'articolo (viene gestito separatamente)

Rispondi ESATTAMENTE in questo formato — nessun testo prima o dopo:

<ARTICLE>
[biografia completa aggiornata in markdown]
</ARTICLE>

<META>
{"estratto": "meta description 150-160 caratteri con keyword principale", "tag": ["tag1", "tag2"], "nota": "eventuali osservazioni sulla ricerca (opzionale)"}
</META>`
}

export async function runAggiornamentoAgent(input: AggiornamentoInput): Promise<ArticoloBozza> {
  const prompt = input.tipoArticolo === 'biografia'
    ? buildPromptBiografia(input)
    : buildPromptStandard(input)

  const text = await callClaude(prompt, { timeout: 8 * 60 * 1000 })
  return parseRisposta(text, input.titolo)
}
