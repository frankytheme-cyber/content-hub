import { prisma } from '@/lib/prisma'
import { emitJobEvent } from '@/lib/events'
import { runResearchAgent } from './research'
import { runGenerationAgent } from './generation'
import { runReviewAgent } from './review'
import { runSeoAgent } from './seo'
import { runImageAgent } from './image'
import { runRecensioneAgent } from './recensione'
import type { PipelineJobData } from '@/lib/job-queue'
import type { ArticoloBozza, ResearchResult, ReviewCorrezione, ReviewResult, SeoResult } from '@/types/agents'
import slugify from 'slugify'

function slug(testo: string): string {
  return slugify(testo, { lower: true, strict: true, locale: 'it' })
}

function applicaCorrezioni(corpo: string, correzioni: ReviewCorrezione[]): string {
  let result = corpo
  for (const c of correzioni) {
    const replaced = result.replace(c.originale, c.corretto)
    if (replaced === result) {
      console.warn(`[review] Correzione non applicata: "${c.originale.slice(0, 80)}"`)
    }
    result = replaced
  }
  return result
}

export async function runPipeline(data: PipelineJobData) {
  const { sessionId, jobId, input } = data

  const emit = (fase: string, progresso: number, messaggio: string) =>
    emitJobEvent({ jobId, fase: fase as any, progresso, messaggio })

  try {
    // Carica stato corrente per checkpoint
    const [job, session] = await Promise.all([
      prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
      prisma.session.findUniqueOrThrow({ where: { id: sessionId } }),
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

      ricerca = await runResearchAgent({
        argomento: input.argomento,
        fonti: input.fonti,
        categoria: input.categoria,
      })

      await prisma.session.update({
        where: { id: sessionId },
        data: { ricercaJson: ricerca as any },
      })

      await emit('ricerca', 20, `Ricerca completata. ${ricerca.fonti.length} fonti trovate.`)
    }

    const isRecensione = input.tipoArticolo === 'recensione'

    // ─── 2. Generazione ─────────────────────────────────────────────────────
    let versioni: ArticoloBozza[]
    let extraMeta: { schemaJsonLd?: object; tag?: string[] } = {}

    const versioniSalvate = await prisma.versione.findMany({
      where: { articolo: { sessionId } },
      include: { articolo: true },
    })

    const checkpointCount = isRecensione ? 1 : 2

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
      } else {
        const gen = await runGenerationAgent({
          ricerca,
          linkInterni: input.linkInterni,
          argomento: input.argomento,
          categoria: input.categoria,
          toni: ['autorevole e professionale', 'colloquiale e coinvolgente'],
        })
        versioni = gen.versioni
        await emit('generazione', 50, 'Due versioni dell\'articolo generate.')
      }
    }

    // ─── 3. Revisione ───────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'revisione' } })
    await emit('revisione', 52, 'Revisione fattuale e grammaticale...')

    const revisioni: ReviewResult[] = await Promise.all(
      versioni.map((v) => runReviewAgent({ bozza: v, fonti: ricerca.fonti }))
    )

    await emit('revisione', 68, 'Revisione completata.')

    // ─── 4. SEO ─────────────────────────────────────────────────────────────
    // Per le recensioni il SEO è già integrato nel template Gutenberg
    let bozzePronto: ArticoloBozza[]
    let seoResults: SeoResult[]

    if (isRecensione) {
      bozzePronto = versioni.map((v, i) => ({
        ...v,
        corpo: applicaCorrezioni(v.corpo, revisioni[i].correzioni),
      }))
      // SEO sintetico dalle info già presenti nella versione
      seoResults = bozzePronto.map((b) => ({
        corpoOttimizzato: b.corpo,
        metadata: {
          metaTitolo: b.titolo,
          metaDescrizione: b.estratto,
          slug: slugify(b.titolo, { lower: true, strict: true, locale: 'it' }),
          keywordPrincipale: input.argomento,
          keywordSecondarie: extraMeta.tag ?? [],
          geoHints: [],
          schemaMarkup: extraMeta.schemaJsonLd ?? {},
          ogTitolo: b.titolo,
          ogDescrizione: b.estratto,
        },
      }))
      await emit('seo', 83, 'SEO recensione completato.')
    } else {
      await prisma.job.update({ where: { id: jobId }, data: { fase: 'seo' } })
      await emit('seo', 70, 'Ottimizzazione SEO e GEO...')

      bozzePronto = versioni.map((v, i) => ({
        ...v,
        corpo: applicaCorrezioni(v.corpo, revisioni[i].correzioni),
      }))

      seoResults = await Promise.all(
        bozzePronto.map((b) =>
          runSeoAgent({
            bozza: b,
            argomento: input.argomento,
            categoria: input.categoria,
            keywordsCorrelate: ricerca.keywordsCorrelate,
          })
        )
      )

      await emit('seo', 83, 'SEO e GEO completati.')
    }

    // ─── 5. Immagine ────────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'immagini' } })
    await emit('immagini', 85, 'Ricerca immagine...')

    const immagine = await runImageAgent({
      argomento: input.argomento,
      categoria: input.categoria,
      keywords: ricerca.keywordsCorrelate.slice(0, 5),
    })

    await emit('immagini', 93, 'Immagine trovata.')

    // ─── 6. Salvataggio ─────────────────────────────────────────────────────
    await prisma.job.update({ where: { id: jobId }, data: { fase: 'salvataggio' } })
    await emit('salvataggio', 95, 'Salvataggio articolo nel database...')

    const titoloArticolo = bozzePronto[0].titolo
    let articoloSlug = slug(titoloArticolo)

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
            noteRevisione: revisioni[i].correzioni.length > 0
              ? revisioni[i].correzioni.map((c) => `[${c.tipo}] ${c.spiegazione}`).join('\n')
              : null,
            seoJson: seoResults[i].metadata as any,
            immagineUrl: immagine.url || null,
            immagineCreditUrl: immagine.creditUrl || null,
            punteggio: revisioni[i].punteggio,
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

    await emit('completato', 100, `Articolo "${titoloArticolo}" pronto.`)
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
