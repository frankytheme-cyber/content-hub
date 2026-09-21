import { callClaude, callClaudeJson } from '@/lib/claude-cli'
import {
  analizzaGeo,
  costruisciSchema,
  estraiPrimoParagrafo,
  validaSeoMetadata,
  type DiagnosiGeo,
} from '@/lib/seo-utils'
import { buildSeoPrompt, buildPuntiChiavePrompt, buildFaqPrompt } from './prompts'
import type { SeoInput, SeoResult, SeoMetadata } from '@/types/agents'

interface SeoMetaGrezzi extends Partial<SeoMetadata> {
  entita?: string[]
}

function autofixAttivo(): boolean {
  return process.env.SEO_AUTOFIX !== '0'
}

/** Inserisce la sezione subito dopo il paragrafo di apertura. */
function inserisciDopoApertura(corpo: string, sezione: string): string {
  const blocchi = corpo.split(/\n\s*\n/)
  const indice = blocchi.findIndex(
    (b) => !/^#{1,6}\s/.test(b.trim()) && !/^\s*(?:[-+*]|\d+\.)\s/.test(b.trim()) && b.trim().length > 40
  )
  if (indice === -1) return `${sezione}\n\n${corpo}`

  blocchi.splice(indice + 1, 0, sezione)
  return blocchi.join('\n\n')
}

/**
 * Ripara solo ciò che manca davvero, generando la singola sezione assente.
 *
 * L'agente SEO riscriveva l'intero corpo a ogni esecuzione per aggiungere una
 * sezione che il prompt di generazione già richiedeva: input e output pari alla
 * lunghezza dell'articolo, con il rischio di annullare le correzioni appena
 * applicate dalla revisione. Qui si paga solo il pezzo mancante e il resto del
 * testo resta intatto byte per byte.
 */
async function riparaStruttura(
  corpo: string,
  diagnosi: DiagnosiGeo,
  input: SeoInput
): Promise<{ corpo: string; riparazioni: string[] }> {
  const riparazioni: string[] = []
  let risultato = corpo

  const manca = (nome: string) =>
    diagnosi.controlli.some((c) => c.nome === nome && !c.superato)

  if (manca('Sezione "Punti chiave"')) {
    try {
      const bullet = await callClaude(buildPuntiChiavePrompt({ ...input, bozza: { ...input.bozza, corpo: risultato } }), {
        tier: 'standard',
        label: 'seo-punti-chiave',
        timeout: 90_000,
      })
      const pulito = bullet.split('\n').filter((r) => /^\s*[-+*]\s+/.test(r)).join('\n')
      if (pulito.trim().length > 0) {
        risultato = inserisciDopoApertura(risultato, `## Punti chiave\n\n${pulito}`)
        riparazioni.push('aggiunta sezione "Punti chiave"')
      }
    } catch (err) {
      console.warn('[seo] riparazione punti chiave fallita:', err instanceof Error ? err.message : err)
    }
  }

  if (manca('Sezione "Domande frequenti"')) {
    try {
      const faq = await callClaude(buildFaqPrompt({ ...input, bozza: { ...input.bozza, corpo: risultato } }), {
        tier: 'standard',
        label: 'seo-faq',
        timeout: 120_000,
      })
      if (faq.trim().length > 0) {
        risultato = `${risultato.trimEnd()}\n\n## Domande frequenti\n\n${faq.trim()}\n`
        riparazioni.push('aggiunta sezione "Domande frequenti"')
      }
    } catch (err) {
      console.warn('[seo] riparazione FAQ fallita:', err instanceof Error ? err.message : err)
    }
  }

  return { corpo: risultato, riparazioni }
}

export async function runSeoAgent(input: SeoInput): Promise<SeoResult> {
  // 1. Diagnosi locale: nessun token speso per verificare ciò che si misura in
  //    codice. Qui serve solo a decidere quali sezioni riparare, quindi la
  //    keyword approssimativa dell'argomento è sufficiente.
  const diagnosi = analizzaGeo(input.bozza.corpo, input.argomento)
  let corpo = input.bozza.corpo
  let riparazioni: string[] = []

  // 2. Riparazione mirata delle sole sezioni mancanti.
  if (autofixAttivo() && diagnosi.mancanti.length > 0) {
    const esito = await riparaStruttura(corpo, diagnosi, input)
    corpo = esito.corpo
    riparazioni = esito.riparazioni
  }

  // 3. Una sola chiamata per i metadati, sullo scheletro dell'articolo.
  let grezzi: SeoMetaGrezzi = {}
  try {
    grezzi = await callClaudeJson<SeoMetaGrezzi>(
      buildSeoPrompt({ ...input, bozza: { ...input.bozza, corpo } }),
      { tier: 'standard', label: 'seo-meta', timeout: 2 * 60 * 1000 }
    )
  } catch (err) {
    console.warn('[seo] metadati non parsabili, uso i fallback locali:', err instanceof Error ? err.message : err)
  }

  const entita = (grezzi.entita ?? input.ricerca?.entita ?? []).map(String).filter(Boolean)

  const { metadata, avvisi } = validaSeoMetadata(
    { ...grezzi, geoHints: entita },
    {
      titolo: input.bozza.titolo,
      estratto: input.bozza.estratto || estraiPrimoParagrafo(corpo),
      corpo,
      argomento: input.argomento,
      categoria: input.categoria,
    }
  )

  // 4. Lo schema JSON-LD è output strutturato: generarlo in codice costa zero
  //    token ed elimina gli errori di sintassi tipici di un LLM.
  metadata.schemaMarkup = costruisciSchema({
    titolo: metadata.metaTitolo || input.bozza.titolo,
    descrizione: metadata.metaDescrizione,
    corpo,
    categoria: input.categoria,
    keywordPrincipale: metadata.keywordPrincipale,
    keywordSecondarie: metadata.keywordSecondarie,
    entita,
    slug: metadata.slug,
    siteUrl: input.siteUrl,
    immagineUrl: input.immagineUrl,
  })

  // La diagnosi definitiva usa la keyword reale individuata dall'agente, non la
  // frase digitata nel wizard: sono due cose diverse e misurare sulla seconda
  // faceva risultare fuori norma anche gli articoli ottimizzati correttamente.
  const diagnosiFinale = analizzaGeo(corpo, metadata.keywordPrincipale)

  if (avvisi.length > 0) console.warn(`[seo] metadati corretti: ${avvisi.join(' · ')}`)
  if (riparazioni.length > 0) console.log(`[seo] ${riparazioni.join(' · ')}`)
  console.log(
    `[seo] punteggio GEO ${diagnosiFinale.punteggio}/100 · ${diagnosiFinale.parole} parole · ` +
    `keyword "${metadata.keywordPrincipale}"`
  )

  return {
    metadata,
    corpoOttimizzato: corpo,
    diagnosi: diagnosiFinale,
    avvisi: [...avvisi, ...riparazioni],
  }
}
