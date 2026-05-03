import { callClaude } from '@/lib/claude-cli'

interface RevisioneInput {
  titolo: string
  corpo: string
  richiesta: string
  istruzioniSito?: string
}

interface RevisioneOutput {
  corpo: string
  nota?: string
}

function parseRisposta(text: string): RevisioneOutput {
  const articleMatch = text.match(/<ARTICLE>([\s\S]*?)<\/ARTICLE>/)
  const notaMatch = text.match(/<NOTA>([\s\S]*?)<\/NOTA>/)

  if (!articleMatch) {
    throw new Error('Risposta malformata: tag <ARTICLE> non trovato')
  }

  return {
    corpo: articleMatch[1].trim(),
    nota: notaMatch?.[1].trim(),
  }
}

export async function runRevisioneAgent(input: RevisioneInput): Promise<RevisioneOutput> {
  const { titolo, corpo, richiesta, istruzioniSito } = input

  const sitoBlock = istruzioniSito
    ? `\nLINEE GUIDA DEL SITO (rispettale con priorità):\n${istruzioniSito}\n`
    : ''

  const prompt = `Sei un editor esperto in content marketing. Devi applicare una correzione o una richiesta dell'utente a un articolo esistente.${sitoBlock}

TITOLO: "${titolo}"

ARTICOLO ATTUALE:
${corpo.slice(0, 12000)}

RICHIESTA DELL'UTENTE:
${richiesta}

ISTRUZIONI SEO E GEO:
1. Applica la richiesta dell'utente mantenendo la coerenza del testo
2. Mantieni la struttura markdown (## per H2, ### per H3, - per liste)
3. Non includere il titolo nel corpo (viene gestito separatamente)
4. Conserva la sezione "## Punti chiave" aggiornandola se necessario
5. Conserva la sezione "## Domande frequenti" aggiornandola se necessario
6. Il primo paragrafo deve rispondere direttamente alla domanda implicita del titolo
7. Keyword principale nel primo paragrafo e in almeno un H2 (densità 1-2%)
8. Scrivi in italiano

Rispondi ESATTAMENTE in questo formato — nessun testo prima o dopo:

<ARTICLE>
[articolo completo aggiornato in markdown]
</ARTICLE>

<NOTA>
[breve descrizione delle modifiche effettuate, opzionale]
</NOTA>`

  const text = await callClaude(prompt, { timeout: 5 * 60 * 1000 })
  return parseRisposta(text)
}
