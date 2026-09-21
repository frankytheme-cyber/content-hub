import { prisma } from '@/lib/prisma'
import { emitJobEvent } from '@/lib/events'
import { withUsageLedger, type UsageLedger } from '@/lib/claude-cli'
import {
  analizzaGeo,
  applicaCorrezioni,
  costruisciSchema,
  estraiPrimoParagrafo,
  normalizzaSlug,
  validaSeoMetadata,
} from '@/lib/seo-utils'
import { runResearchAgent } from './research'
import { runGenerationAgent, numeroVersioni } from './generation'
import { runReviewAgent } from './review'
import { runSeoAgent } from './seo'
import { runImageAgent } from './image'
import { runRecensioneAgent } from './recensione'
import { runSistemaAgent } from './sistema'
import { runBiografiaAgent } from './biografia'
import { runAggiornamentoAgent } from './aggiornamento'
import { WordPressMcpClient } from './publisher/mcp-client'
import type { PipelineJobData } from '@/lib/job-queue'
import type { ArticoloBozza, ImageResult, ResearchResult, ReviewResult, SeoResult } from '@/types/agents'

function slug(testo: string): string {
  return normalizzaSlug(testo)
}

/** Applica le correzioni della revisione segnalando quelle non agganciate. */
function applicaRevisione(corpo: string, revisione: ReviewResult): string {
  const { corpo: risultato, applicate, fallite } = applicaCorrezioni(corpo, revisione.correzioni)

  if (fallite.length > 0) {
    console.warn(
      `[review] ${applicate}/${revisione.correzioni.length} correzioni applicate. ` +
      `Non agganciate: ${fallite.map((f) => `"${f.originale.slice(0, 60)}"`).join(' · ')}`
    )
  }

  return risultato
}

function riepilogoCosti(ledger: UsageLedger): string {
  const t = ledger.totale()
  return `${t.chiamate} chiamate · ${t.inputTokens.toLocaleString('it-IT')} token in · ` +
    `${t.outputTokens.toLocaleString('it-IT')} token out · $${t.costUsd.toFixed(3)}`
}

export function runPipeline(data: PipelineJobData) {
  // Un registro per job: due pipeline concorrenti nello stesso worker non si
  // mescolano i conteggi di token.
  return withUsageLedger((ledger) => eseguiPipeline(data, ledger))
}

async function eseguiPipeline(data: PipelineJobData, ledger: UsageLedger) {
  const { sessionId, jobId, input } = data

  const emit = (fase: string, progresso: number, messaggio: string) =>
    emitJobEvent({ jobId, fase: fase as any, progresso, messaggio })

  try {
    // Carica stato corrente per checkpoint
    const [job, session, sitoCorrente] = await Promise.all([
      prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
      prisma.session.findUniqueOrThrow({ where: { id: sessionId } }),
      input.sitoId ? prisma.sito.findUnique({ where: { id: input.sitoId } }) : Promise.resolve(null),
    ])

    await prisma.job.update({
      where: { id: jobId },
      data: { stato: 'IN_ESECUZIONE' },
    })
    await prisma.session.update({
      where: { id: sessionId },
      data: { stato: 'IN_CORSO' },
    })

    const faseIniziale = job.fase ?? 'ricerca'

    // ─── 1. Ricerca ─────────────────────────────────────────────────────────
    let ricerca: ResearchResult

    if (session.ricercaJson && faseIniziale !== 'ricerca') {
      // Checkpoint: ricerca già completata
      ricerca = session.ricercaJson as unknown as ResearchResult
      await emit('ricerca', 20, 'Ricerca recuperata da checkpoint.')
    } else {
      await prisma.job.update({ where: { id: jobId }, data: { fase: 'ricerca' } })
      await emit('ricerca', 5, 'Avvio ricerca materiale...')

      await emit('ricerca', 8, 'Ricerca Tavily in corso...')

      ricerca = await runResearchAgent(
        {
          argomento: input.argomento,
          fonti: input.fonti,
          categoria: input.categoria,
        },
        (msg) => emit('ricerca', 13, msg)
      )

      await prisma.session.update({
        where: { id: sessionId },
        data: { ricercaJson: ricerca as any },
      })

      await emit('ricerca', 20, `Ricerca completata. ${ricerca.fonti.length} fonti trovate.`)
    }

    const isRecensione = input.tipoArticolo === 'recensione'
    const isSistema = input.tipoArticolo === 'sistema'
    const isBiografia = input.tipoArticolo === 'biografia'

    // ─── 2. Generazione ─────────────────────────────────────────────────────
    let versioni: ArticoloBozza[]
    let extraMeta: { schemaJsonLd?: object; tag?: string[] } = {}

    const versioniSalvate = await prisma.versione.findMany({
      where: { articolo: { sessionId } },
      include: { articolo: true },
    })

    const checkpointCount = isRecensione || isSistema || isBiografia ? 1 : numeroVersioni()

    if (versioniSalvate.length >= checkpointCount && !['ricerca', 'generazione'].includes(faseIniziale)) {
      versioni = versioniSalvate.map((v) => ({
        titolo: v.articolo.titolo,
        corpo: v.corpo,
        estratto: '',
        tono: v.tono,
      }))
      await emit('generazione', 50, 'Generazione recuperata da checkpoint.')
    } else {
      await prisma.job.update({ where: { id: jobId }, data: { fase: 'generazione' } })
      await emit('generazione', 25, 'Generazione contenuti in corso...')

      if (isRecensione) {
        const rec = await runRecensioneAgent({
          ricerca,
          argomento: input.argomento,
          categoria: input.categoria,
          linkAmazon: input.linkAmazon ?? '',
          sitoIstruzioni: input.sitoIstruzioni,
        })
        versioni = [rec.versione]
        extraMeta = { schemaJsonLd: rec.versione.schemaJsonLd, tag: rec.versione.tag }
        await emit('generazione', 50, 'Recensione hi-fi generata.')
      } else if (isBiografia) {
        const bio = await runBiografiaAgent({
          ricerca,
          argomento: input.argomento,
          categoria: input.categoria,
          linkRecensioni: input.linkInterni,
          sitoIstruzioni: input.sitoIstruzioni,
        })
        versioni = [bio.versione]
        extraMeta = { schemaJsonLd: bio.versione.schemaJsonLd, tag: bio.versione.tag }
        await emit('generazione', 50, 'Biografia musicale generata.')
      } else if (isSistema) {
        if (!sitoCorrente?.wpSiteUrl || !sitoCorrente.wpUsername || !sitoCorrente.wpAppPassword) {
          throw new Error('Articolo sistema richiede credenziali WordPress configurate sul sito.')
        }
        const sis = await runSistemaAgent({
          ricerca,
          linkInterni: [],
          argomento: input.argomento,
          categoria: input.categoria,
          sitoIstruzioni: input.sitoIstruzioni,
          sistemaCategorie: input.sistemaCategorie ?? [],
          siteUrl: sitoCorrente.wpSiteUrl,
          username: sitoCorrente.wpUsername,
          appPassword: sitoCorrente.wpAppPassword,
        })
        versioni = [sis.versione]
        extraMeta = { tag: sis.versione.tag }
        await emit('generazione', 50, 'Articolo sistema hi-fi generato.')
      } else {
        const gen = await runGenerationAgent({
          ricerca,
          linkInterni: input.linkInterni,
          argomento: input.argomento,
          categoria: input.categoria,
          sitoIstruzioni: input.sitoIstruzioni,
          toni: [],
        })
        versioni = gen.versioni
        await emit('generazione', 50, `${versioni.length === 1 ? 'Articolo generato' : `${versioni.length} versioni generate`}.`)
      }
    }

    // ─── 3. Revisione ───────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'revisione' } })
    await emit('revisione', 52, 'Revisione fattuale e grammaticale...')

    // L'immagine non dipende dalla revisione: cercarla adesso in parallelo toglie
    // una fase dal percorso critico e rende l'URL disponibile allo schema JSON-LD.
    const immaginePromise: Promise<ImageResult> = runImageAgent({
      argomento: input.argomento,
      categoria: input.categoria,
      keywords: ricerca.keywordsCorrelate.slice(0, 5),
    }).catch((err) => {
      console.warn('[immagini] ricerca fallita:', err instanceof Error ? err.message : err)
      return { url: '', previewUrl: '', fotografo: '', creditUrl: '', altText: input.argomento }
    })

    const revisioni: ReviewResult[] = await Promise.all(
      versioni.map((v) => runReviewAgent({ bozza: v, fonti: ricerca.fonti }))
    )

    await emit('revisione', 68, 'Revisione completata.')

    const immagine = await immaginePromise
    await emit('immagini', 72, immagine.url ? 'Immagine trovata.' : 'Nessuna immagine pertinente trovata.')

    // ─── 4. SEO ─────────────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'seo' } })
    await emit('seo', 75, 'Ottimizzazione SEO e GEO...')

    const bozzePronto: ArticoloBozza[] = versioni.map((v, i) => ({
      ...v,
      corpo: applicaRevisione(v.corpo, revisioni[i]),
    }))

    const siteUrl = sitoCorrente?.wpSiteUrl ?? undefined
    let seoResults: SeoResult[]

    if (isRecensione || isSistema || isBiografia) {
      // Questi template producono già la struttura editoriale completa: non
      // serve un passaggio di riscrittura, ma i metadati vanno comunque
      // normalizzati e lo schema costruito, invece di copiare titolo ed estratto.
      seoResults = bozzePronto.map((b) => {
        const tag = extraMeta.tag ?? b.tag ?? []
        const { metadata } = validaSeoMetadata(
          {
            metaTitolo: b.titolo,
            metaDescrizione: b.estratto,
            keywordPrincipale: input.argomento,
            keywordSecondarie: tag,
            geoHints: ricerca.entita ?? [],
          },
          {
            titolo: b.titolo,
            estratto: b.estratto,
            corpo: b.corpo,
            argomento: input.argomento,
            categoria: input.categoria,
          }
        )

        // I template hi-fi producono già uno schema specifico (Review, Person):
        // se c'è lo teniamo, altrimenti lo generiamo.
        metadata.schemaMarkup = extraMeta.schemaJsonLd ?? costruisciSchema({
          titolo: metadata.metaTitolo,
          descrizione: metadata.metaDescrizione,
          corpo: b.corpo,
          categoria: input.categoria,
          keywordPrincipale: metadata.keywordPrincipale,
          keywordSecondarie: metadata.keywordSecondarie,
          entita: ricerca.entita ?? [],
          slug: metadata.slug,
          siteUrl,
          immagineUrl: immagine.url || undefined,
        })

        return {
          metadata,
          corpoOttimizzato: b.corpo,
          diagnosi: analizzaGeo(b.corpo, metadata.keywordPrincipale),
        }
      })

      const tipoLabel = isSistema ? 'sistema' : isBiografia ? 'biografia' : 'recensione'
      await emit('seo', 90, `SEO ${tipoLabel} completato.`)
    } else {
      seoResults = await Promise.all(
        bozzePronto.map((b) =>
          runSeoAgent({
            bozza: b,
            argomento: input.argomento,
            categoria: input.categoria,
            keywordsCorrelate: ricerca.keywordsCorrelate,
            domandeUtenti: ricerca.domandeUtenti,
            ricerca,
            siteUrl,
            immagineUrl: immagine.url || undefined,
          })
        )
      )

      const punteggi = seoResults.map((s) => s.diagnosi?.punteggio ?? 0)
      await emit('seo', 90, `SEO e GEO completati (punteggio GEO: ${punteggi.join(' / ')}).`)
    }

    // ─── 5. Salvataggio ─────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'salvataggio' } })
    await emit('salvataggio', 95, 'Salvataggio articolo nel database...')

    const titoloArticolo = bozzePronto[0].titolo
    let articoloSlug = seoResults[0].metadata.slug || slug(titoloArticolo)

    const esistente = await prisma.articolo.findUnique({ where: { slug: articoloSlug } })
    if (esistente) articoloSlug = `${articoloSlug}-${Date.now()}`

    await prisma.articolo.create({
      data: {
        sessionId,
        slug: articoloSlug,
        titolo: titoloArticolo,
        versioni: {
          create: bozzePronto.map((bozza, i) => ({
            indice: i,
            tono: bozza.tono,
            corpo: seoResults[i].corpoOttimizzato,
            noteRevisione: [
              ...revisioni[i].correzioni.map((c) => `[${c.tipo}] ${c.spiegazione}`),
              ...(seoResults[i].avvisi ?? []).map((a) => `[seo] ${a}`),
              ...(seoResults[i].diagnosi?.mancanti ?? []).map((m) => `[geo] ${m}`),
            ].join('\n') || null,
            seoJson: {
              ...seoResults[i].metadata,
              altText: immagine.altText,
              diagnosiGeo: seoResults[i].diagnosi,
            } as any,
            immagineUrl: immagine.url || null,
            immagineCreditUrl: immagine.creditUrl || null,
            // Punteggio combinato: qualità editoriale dal revisore, conformità
            // SEO/GEO misurata in locale.
            punteggio: Math.round(
              revisioni[i].punteggio * 0.6 + (seoResults[i].diagnosi?.punteggio ?? 70) * 0.4
            ),
          })),
        },
      },
    })

    await Promise.all([
      prisma.session.update({ where: { id: sessionId }, data: { stato: 'COMPLETATA' } }),
      prisma.job.update({
        where: { id: jobId },
        data: { stato: 'COMPLETATO', fase: 'completato', completatoIl: new Date() },
      }),
    ])

    console.log(`[pipeline] ${jobId} · ${riepilogoCosti(ledger)}`)
    await emit('completato', 100, `Articolo "${titoloArticolo}" pronto. (${riepilogoCosti(ledger)})`)
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : 'Errore sconosciuto'

    await Promise.all([
      prisma.job.update({ where: { id: jobId }, data: { stato: 'FALLITO', errore: messaggio } }),
      prisma.session.update({ where: { id: sessionId }, data: { stato: 'FALLITA' } }),
    ])

    await emit('errore', 0, `Errore: ${messaggio}`)
    throw err
  }
}

export function runAggiornamentoPipeline(data: PipelineJobData) {
  return withUsageLedger((ledger) => eseguiAggiornamento(data, ledger))
}

async function eseguiAggiornamento(data: PipelineJobData, ledger: UsageLedger) {
  const { sessionId, jobId } = data

  const emit = (fase: string, progresso: number, messaggio: string) =>
    emitJobEvent({ jobId, fase: fase as any, progresso, messaggio })

  try {
    const [job, session] = await Promise.all([
      prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
      prisma.session.findUniqueOrThrow({ where: { id: sessionId }, include: { sito: true } }),
    ])

    await prisma.job.update({ where: { id: jobId }, data: { stato: 'IN_ESECUZIONE' } })
    await prisma.session.update({ where: { id: sessionId }, data: { stato: 'IN_CORSO' } })

    const faseIniziale = job.fase ?? 'recupero'

    // ─── 1. Recupero contenuto WP ─────────────────────────────────────────────
    let contenutoOriginale: string

    if (session.contenutoOriginale && faseIniziale !== 'recupero') {
      contenutoOriginale = session.contenutoOriginale
      await emit('recupero', 10, 'Contenuto originale recuperato da checkpoint.')
    } else {
      await prisma.job.update({ where: { id: jobId }, data: { fase: 'recupero' } })
      await emit('recupero', 5, 'Recupero articolo da WordPress...')

      const sito = session.sito
      if (!sito?.wpSiteUrl || !sito.wpUsername || !sito.wpAppPassword) {
        throw new Error('Credenziali WordPress mancanti sul sito selezionato.')
      }
      if (!session.wpPostId) {
        throw new Error('ID post WordPress mancante nella sessione.')
      }

      const wpClient = new WordPressMcpClient()
      await wpClient.connect({
        siteUrl: sito.wpSiteUrl,
        username: sito.wpUsername,
        appPassword: sito.wpAppPassword,
      })
      const post = await wpClient.getPost(session.wpPostId, session.wpPostType ?? 'posts')
      await wpClient.disconnect()

      contenutoOriginale = post.content.raw ?? post.content.rendered
      await prisma.session.update({
        where: { id: sessionId },
        data: { contenutoOriginale },
      })
      await emit('recupero', 10, 'Articolo recuperato da WordPress.')
    }

    // ─── 2. Ricerca ────────────────────────────────────────────────────────────
    let ricerca: ResearchResult

    if (session.ricercaJson && !['recupero', 'ricerca'].includes(faseIniziale)) {
      ricerca = session.ricercaJson as unknown as ResearchResult
      await emit('ricerca', 35, 'Ricerca recuperata da checkpoint.')
    } else {
      await prisma.job.update({ where: { id: jobId }, data: { fase: 'ricerca' } })
      await emit('ricerca', 15, 'Avvio ricerca aggiornamenti...')

      const argomento = session.focusAggiornamento
        ? `${session.argomento} - ${session.focusAggiornamento}`
        : session.argomento

      ricerca = await runResearchAgent(
        { argomento, fonti: [], categoria: session.categoria },
        (msg) => emit('ricerca', 25, msg)
      )

      await prisma.session.update({ where: { id: sessionId }, data: { ricercaJson: ricerca as any } })
      await emit('ricerca', 35, `Ricerca completata. ${ricerca.fonti.length} fonti trovate.`)
    }

    // ─── 3. Aggiornamento ─────────────────────────────────────────────────────
    let bozza: ArticoloBozza

    const versioniSalvate = await prisma.versione.findMany({
      where: { articolo: { sessionId } },
    })

    if (versioniSalvate.length >= 1 && !['recupero', 'ricerca', 'aggiornamento'].includes(faseIniziale)) {
      bozza = {
        titolo: session.argomento,
        corpo: versioniSalvate[0].corpo,
        estratto: '',
        tono: versioniSalvate[0].tono,
      }
      await emit('aggiornamento', 65, 'Aggiornamento recuperato da checkpoint.')
    } else {
      await prisma.job.update({ where: { id: jobId }, data: { fase: 'aggiornamento' } })
      await emit('aggiornamento', 40, 'Generazione contenuto aggiornato...')

      bozza = await runAggiornamentoAgent({
        titolo: session.argomento,
        contenutoOriginale,
        ricerca,
        istruzioniSito: session.sito?.istruzioni ?? '',
        focus: session.focusAggiornamento ?? undefined,
        tipoArticolo: (data.input.tipoArticolo === 'biografia') ? 'biografia' : 'standard',
      })
      await emit('aggiornamento', 65, 'Contenuto aggiornato generato.')
    }

    // ─── 4. Revisione ──────────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'revisione' } })
    await emit('revisione', 68, 'Revisione fattuale e grammaticale...')

    const revisione = await runReviewAgent({ bozza, fonti: ricerca.fonti })
    const corpoFinale = applicaRevisione(bozza.corpo, revisione)

    await emit('revisione', 78, 'Revisione completata.')

    // ─── 5. SEO ────────────────────────────────────────────────────────────────
    // L'aggiornamento salvava `seoJson: {}`: l'articolo riscritto tornava su
    // WordPress senza metadati né structured data aggiornati.
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'seo' } })
    await emit('seo', 82, 'Aggiornamento metadati SEO e GEO...')

    const seo = await runSeoAgent({
      bozza: { ...bozza, corpo: corpoFinale },
      argomento: session.argomento,
      categoria: session.categoria,
      keywordsCorrelate: ricerca.keywordsCorrelate,
      domandeUtenti: ricerca.domandeUtenti,
      ricerca,
      siteUrl: session.sito?.wpSiteUrl ?? undefined,
    })

    await emit('seo', 88, `SEO aggiornato (punteggio GEO: ${seo.diagnosi?.punteggio ?? '—'}).`)

    // ─── 6. Salvataggio ────────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'salvataggio' } })
    await emit('salvataggio', 93, 'Salvataggio proposta nel database...')

    const titoloArticolo = bozza.titolo
    let articoloSlug = slug(titoloArticolo) + '-aggiornamento'
    const esistente = await prisma.articolo.findUnique({ where: { slug: articoloSlug } })
    if (esistente) articoloSlug = `${articoloSlug}-${Date.now()}`

    await prisma.articolo.create({
      data: {
        sessionId,
        slug: articoloSlug,
        titolo: titoloArticolo,
        wpPostId: session.wpPostId ?? undefined,
        versioni: {
          create: [{
            indice: 0,
            tono: 'aggiornato',
            corpo: seo.corpoOttimizzato,
            noteRevisione: [
              ...revisione.correzioni.map((c) => `[${c.tipo}] ${c.spiegazione}`),
              ...(seo.avvisi ?? []).map((a) => `[seo] ${a}`),
              ...(seo.diagnosi?.mancanti ?? []).map((m) => `[geo] ${m}`),
            ].join('\n') || null,
            seoJson: { ...seo.metadata, diagnosiGeo: seo.diagnosi } as any,
            punteggio: Math.round(revisione.punteggio * 0.6 + (seo.diagnosi?.punteggio ?? 70) * 0.4),
          }],
        },
      },
    })

    await Promise.all([
      prisma.session.update({ where: { id: sessionId }, data: { stato: 'COMPLETATA' } }),
      prisma.job.update({
        where: { id: jobId },
        data: { stato: 'COMPLETATO', fase: 'completato', completatoIl: new Date() },
      }),
    ])

    console.log(`[aggiornamento] ${jobId} · ${riepilogoCosti(ledger)}`)
    await emit('completato', 100, `Proposta di aggiornamento per "${titoloArticolo}" pronta. (${riepilogoCosti(ledger)})`)
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : 'Errore sconosciuto'

    await Promise.all([
      prisma.job.update({ where: { id: jobId }, data: { stato: 'FALLITO', errore: messaggio } }),
      prisma.session.update({ where: { id: sessionId }, data: { stato: 'FALLITA' } }),
    ])

    await emit('errore', 0, `Errore: ${messaggio}`)
    throw err
  }
}
