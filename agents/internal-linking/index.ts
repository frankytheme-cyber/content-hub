import { prisma } from '@/lib/prisma'
import { WordPressMcpClient } from '@/agents/publisher/mcp-client'
import { callClaudeJson } from '@/lib/claude-cli'
import { emitLinkAnalysisEvent } from '@/lib/events'
import { costruisciIndice, classificaPerRilevanza, type IndiceLessicale } from '@/lib/text-match'
import type { LinkAnalysisFase, LinkSuggestionDraft, WpPostSummary } from '@/types/agents'

const BATCH_SIZE = 15
const MAX_PAGES = 20 // safety: massimo 2000 post
/** Caratteri di contenuto conservati per ogni post: il resto non entra mai nel prompt. */
const MAX_CHAR_CONTENUTO = 1400
/** Target proposti al modello per ogni post sorgente. */
const CANDIDATI_PER_SORGENTE = 12
/** Tetto alla tabella dei target di un batch. */
const MAX_TARGET_PER_BATCH = 60

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function aggiornaJob(jobId: string, data: {
  fase?: LinkAnalysisFase
  stato?: string
  progresso?: number
  totalePost?: number
  postProcessati?: number
  errore?: string
  messaggio?: string
}) {
  const { messaggio, ...persisted } = data
  await prisma.linkAnalysisJob.update({
    where: { id: jobId },
    data: persisted,
  })
  await emitLinkAnalysisEvent({
    jobId,
    fase: (data.fase ?? 'in_coda') as LinkAnalysisFase,
    progresso: data.progresso ?? 0,
    messaggio: messaggio ?? '',
    totalePost: data.totalePost,
    postProcessati: data.postProcessati,
  })
}

/** I target lessicalmente più vicini alla sorgente, esclusa se stessa. */
function candidatiPer(
  sorgente: WpPostSummary,
  indice: IndiceLessicale<WpPostSummary>,
  limite: number
): WpPostSummary[] {
  return classificaPerRilevanza(
    indice,
    `${sorgente.titolo} ${sorgente.estratto} ${sorgente.contenuto}`,
    limite,
    (target) => target.id === sorgente.id
  )
}

function costruisciPrompt(
  batch: WpPostSummary[],
  candidatiPerSorgente: Map<number, WpPostSummary[]>
): string {
  // La tabella dei target contiene solo l'unione dei candidati di questo batch,
  // non l'intero sito.
  const unione = new Map<number, WpPostSummary>()
  for (const sorgente of batch) {
    for (const c of candidatiPerSorgente.get(sorgente.id) ?? []) {
      if (unione.size < MAX_TARGET_PER_BATCH) unione.set(c.id, c)
    }
  }

  const listaTarget = [...unione.values()]
    .map((p) => `${p.id}|${p.titolo}|${p.link}`)
    .join('\n')

  const sorgenti = batch
    .map((p) => {
      const suggeriti = (candidatiPerSorgente.get(p.id) ?? [])
        .map((c) => c.id)
        .join(', ')
      return `[ID:${p.id}] ${p.titolo}\nURL: ${p.link}\nTarget più affini: ${suggeriti || 'nessuno'}\n${p.contenuto.slice(0, MAX_CHAR_CONTENUTO)}`
    })
    .join('\n\n---\n\n')

  return `Sei un esperto SEO. Analizza i post sorgente e proponi link interni verso i post target.

TARGET DISPONIBILI (formato: id|titolo|url):
${listaTarget}

POST SORGENTE DA ANALIZZARE:
${sorgenti}

ISTRUZIONI:
- Per ogni post sorgente proponi 1-3 link verso target semanticamente correlati.
- "Target più affini" è una preselezione lessicale: verifica che il legame abbia davvero senso
  per chi legge e scarta i target fuori tema, anche se suggeriti.
- anchorText: testo GIÀ PRESENTE nel contenuto del post sorgente, copiato alla lettera
  (non inventare frasi nuove, non modificare la punteggiatura).
- contesto: copia esatta della frase del post sorgente che contiene l'anchorText (max 200 caratteri).
- Preferisci anchor descrittivi di 2-5 parole. Mai "clicca qui" o "questo articolo".
- Non proporre self-link. Meglio nessun link che un link irrilevante.

Rispondi SOLO con JSON valido, senza markdown, senza spiegazioni:
[{"fontePostId":123,"targetPostId":456,"anchorText":"testo","contesto":"frase esatta dal testo","motivazione":"perché questo link aiuta la SEO"}]

Se non trovi link validi restituisci: []`
}

export async function runInternalLinkingJob(args: { jobId: string; sitoId: string }): Promise<void> {
  const { jobId, sitoId } = args

  const job = await prisma.linkAnalysisJob.findUniqueOrThrow({ where: { id: jobId } })
  const sito = await prisma.sito.findUniqueOrThrow({ where: { id: sitoId } })

  if (!sito.wpSiteUrl || !sito.wpUsername || !sito.wpAppPassword) {
    await aggiornaJob(jobId, {
      stato: 'errore',
      fase: 'errore',
      errore: 'Credenziali WordPress mancanti per questo sito',
      messaggio: 'Credenziali WordPress mancanti',
    })
    return
  }

  const client = new WordPressMcpClient()
  try {
    await client.connect({
      siteUrl: sito.wpSiteUrl,
      username: sito.wpUsername,
      appPassword: sito.wpAppPassword,
    })

    // ── Fase 1: fetch
    await aggiornaJob(jobId, { stato: 'in_corso', fase: 'fetch', progresso: 5, messaggio: 'Recupero articoli WordPress…' })

    const tutti: WpPostSummary[] = []
    let page = 1
    let totalPages = 1
    do {
      const { posts, totalPages: tp } = await client.listPosts({ page, perPage: 100 })
      totalPages = tp
      for (const p of posts) {
        tutti.push({
          id: p.id,
          slug: p.slug,
          link: p.link,
          titolo: stripHtml(p.title.rendered),
          estratto: stripHtml(p.excerpt.rendered).slice(0, 400),
          // Troncato subito: del contenuto integrale non se ne fa nulla e su
          // siti grandi tenerlo in memoria per ogni post costa centinaia di MB.
          contenuto: stripHtml(p.content.rendered).slice(0, MAX_CHAR_CONTENUTO),
        })
      }
      page++
      const progressoFetch = Math.min(30, 5 + Math.round((page / Math.max(totalPages, 1)) * 25))
      await aggiornaJob(jobId, {
        fase: 'fetch',
        progresso: progressoFetch,
        totalePost: tutti.length,
        messaggio: `Recuperati ${tutti.length} articoli (pagina ${page - 1}/${totalPages})`,
      })
    } while (page <= totalPages && page <= MAX_PAGES)

    if (tutti.length === 0) {
      await aggiornaJob(jobId, {
        stato: 'completato',
        fase: 'completato',
        progresso: 100,
        totalePost: 0,
        messaggio: 'Nessun articolo pubblicato trovato.',
      })
      return
    }

    // ── Fase 2: analisi a batch
    await aggiornaJob(jobId, { fase: 'analisi', progresso: 35, totalePost: tutti.length, messaggio: 'Avvio analisi semantica…' })

    // Il titolo pesa doppio: è il segnale più affidabile del tema di un post.
    const indice = costruisciIndice(
      tutti,
      (p) => p.id,
      (p) => `${p.titolo} ${p.titolo} ${p.estratto}`
    )
    const draftDeduplicato = new Map<string, LinkSuggestionDraft>()
    let processati = 0

    for (let i = 0; i < tutti.length; i += BATCH_SIZE) {
      const batch = tutti.slice(i, i + BATCH_SIZE)

      const candidatiPerSorgente = new Map<number, WpPostSummary[]>(
        batch.map((p) => [p.id, candidatiPer(p, indice, CANDIDATI_PER_SORGENTE)])
      )

      // Un batch i cui post non hanno alcun target affine non merita una chiamata.
      if ([...candidatiPerSorgente.values()].every((c) => c.length === 0)) {
        processati = Math.min(tutti.length, i + batch.length)
        continue
      }

      const prompt = costruisciPrompt(batch, candidatiPerSorgente)

      let suggerimenti: LinkSuggestionDraft[] = []
      try {
        suggerimenti = await callClaudeJson<LinkSuggestionDraft[]>(prompt, {
          tier: 'standard',
          label: `internal-linking:${i}`,
          timeout: 8 * 60 * 1000,
        })
        console.log(`[internal-linking] batch ${i}: ${suggerimenti.length} suggerimenti`)
      } catch (e) {
        console.error(`[internal-linking] batch ${i} ERRORE:`, e instanceof Error ? e.message : e)
      }

      for (const s of suggerimenti) {
        if (!s || typeof s.fontePostId !== 'number' || typeof s.targetPostId !== 'number') continue
        if (s.fontePostId === s.targetPostId) continue
        const key = `${s.fontePostId}-${s.targetPostId}-${(s.anchorText ?? '').toLowerCase()}`
        if (!draftDeduplicato.has(key)) draftDeduplicato.set(key, s)
      }

      processati = Math.min(tutti.length, i + batch.length)
      const progresso = 35 + Math.round((processati / tutti.length) * 60)
      await aggiornaJob(jobId, {
        fase: 'analisi',
        progresso,
        totalePost: tutti.length,
        postProcessati: processati,
        messaggio: `Analizzati ${processati}/${tutti.length} articoli — ${draftDeduplicato.size} suggerimenti`,
      })
    }

    // Persisto i suggerimenti
    const indexById = new Map(tutti.map((p) => [p.id, p]))
    const validi = [...draftDeduplicato.values()].filter(
      (s) => indexById.has(s.fontePostId) && indexById.has(s.targetPostId)
    )

    if (validi.length > 0) {
      await prisma.linkSuggestion.createMany({
        data: validi.map((s) => {
          const fonte = indexById.get(s.fontePostId)!
          const target = indexById.get(s.targetPostId)!
          return {
            jobId,
            sitoId,
            fontePostId: s.fontePostId,
            fonteTitolo: fonte.titolo,
            fonteUrl: fonte.link,
            targetPostId: s.targetPostId,
            targetTitolo: target.titolo,
            targetUrl: target.link,
            anchorText: s.anchorText ?? '',
            contesto: s.contesto ?? '',
            motivazione: s.motivazione ?? '',
          }
        }),
      })
    }

    await aggiornaJob(jobId, {
      stato: 'completato',
      fase: 'completato',
      progresso: 100,
      postProcessati: tutti.length,
      messaggio: `Analisi completata: ${validi.length} suggerimenti generati.`,
    })
  } catch (err) {
    const messaggio = err instanceof Error ? err.message : String(err)
    console.error('[internal-linking] errore job', jobId, err)
    await aggiornaJob(jobId, {
      stato: 'errore',
      fase: 'errore',
      errore: messaggio,
      messaggio: `Errore: ${messaggio}`,
    })
  } finally {
    await client.disconnect()
  }
}

function inserisciLinkInHtml(html: string, contesto: string, anchorText: string, targetUrl: string): string | null {
  const linkTag = `<a href="${targetUrl}">${anchorText}</a>`

  // 1. Prova a sostituire il contesto letterale
  if (contesto && html.includes(contesto)) {
    if (contesto.includes(anchorText)) {
      const sostituito = contesto.replace(anchorText, linkTag)
      return html.replace(contesto, sostituito)
    }
  }

  // 2. Fallback: cerca anchor text "nudo" (no-tag boundary) nel primo paragrafo
  const regex = new RegExp(`(?<![>\\w])${anchorText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![<\\w])`)
  if (regex.test(html)) {
    return html.replace(regex, linkTag)
  }

  return null
}

export async function applyLinkSuggestions(suggestionIds: string[]): Promise<{
  applied: string[]
  failed: Array<{ id: string; errore: string }>
}> {
  const applied: string[] = []
  const failed: Array<{ id: string; errore: string }> = []

  const suggestions = await prisma.linkSuggestion.findMany({
    where: { id: { in: suggestionIds } },
    include: { job: { include: { sito: true } } },
  })

  // Raggruppa per sito per condividere il client
  const perSito = new Map<string, typeof suggestions>()
  for (const s of suggestions) {
    const arr = perSito.get(s.sitoId) ?? []
    arr.push(s)
    perSito.set(s.sitoId, arr)
  }

  for (const [, group] of perSito) {
    const sito = group[0].job.sito
    if (!sito.wpSiteUrl || !sito.wpUsername || !sito.wpAppPassword) {
      for (const s of group) {
        failed.push({ id: s.id, errore: 'Credenziali WordPress mancanti' })
        await prisma.linkSuggestion.update({
          where: { id: s.id },
          data: { stato: 'errore', errore: 'Credenziali WordPress mancanti' },
        })
      }
      continue
    }

    const client = new WordPressMcpClient()
    try {
      await client.connect({
        siteUrl: sito.wpSiteUrl,
        username: sito.wpUsername,
        appPassword: sito.wpAppPassword,
      })

      // Raggruppa per fontePostId per minimizzare le GET
      const perPost = new Map<number, typeof group>()
      for (const s of group) {
        const arr = perPost.get(s.fontePostId) ?? []
        arr.push(s)
        perPost.set(s.fontePostId, arr)
      }

      for (const [postId, group2] of perPost) {
        try {
          const post = await client.getPost(postId)
          let html = post.content.raw ?? post.content.rendered

          const appliedQui: string[] = []
          for (const s of group2) {
            const aggiornato = inserisciLinkInHtml(html, s.contesto, s.anchorText, s.targetUrl)
            if (aggiornato) {
              html = aggiornato
              appliedQui.push(s.id)
            } else {
              failed.push({ id: s.id, errore: 'Anchor/contesto non trovato nel contenuto del post' })
              await prisma.linkSuggestion.update({
                where: { id: s.id },
                data: { stato: 'errore', errore: 'Anchor/contesto non trovato' },
              })
            }
          }

          if (appliedQui.length > 0) {
            await client.updatePostContent(postId, html)
            await prisma.linkSuggestion.updateMany({
              where: { id: { in: appliedQui } },
              data: { stato: 'applicato', appliedAt: new Date() },
            })
            applied.push(...appliedQui)
          }
        } catch (e) {
          const messaggio = e instanceof Error ? e.message : String(e)
          for (const s of group2) {
            failed.push({ id: s.id, errore: messaggio })
            await prisma.linkSuggestion.update({
              where: { id: s.id },
              data: { stato: 'errore', errore: messaggio },
            })
          }
        }
      }
    } finally {
      await client.disconnect()
    }
  }

  return { applied, failed }
}
