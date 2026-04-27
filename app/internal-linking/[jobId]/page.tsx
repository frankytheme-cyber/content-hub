'use client'

import { useEffect, useMemo, useState, use } from 'react'
import Link from 'next/link'
import {
  Check,
  X,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface Suggestion {
  id: string
  fontePostId: number
  fonteTitolo: string
  fonteUrl: string
  targetPostId: number
  targetTitolo: string
  targetUrl: string
  anchorText: string
  contesto: string
  motivazione: string
  stato: 'pendente' | 'approvato' | 'rifiutato' | 'applicato' | 'errore'
  errore: string | null
}

interface JobData {
  id: string
  stato: string
  fase: string
  progresso: number
  totalePost: number
  postProcessati: number
  errore: string | null
  sito: { id: string; nome: string; dominio: string }
  suggestions: Suggestion[]
}

const FASE_LABEL: Record<string, string> = {
  in_coda: 'In coda',
  fetch: 'Recupero post da WordPress',
  analisi: 'Analisi semantica con Claude',
  completato: 'Completato',
  errore: 'Errore',
}

export default function JobReviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  const [job, setJob] = useState<JobData | null>(null)
  const [loading, setLoading] = useState(true)
  const [streamProgress, setStreamProgress] = useState<{
    fase: string
    progresso: number
    messaggio: string
  } | null>(null)
  const [applying, setApplying] = useState(false)
  const [restarting, setRestarting] = useState(false)

  async function refresh() {
    const res = await fetch(`/api/internal-linking/jobs/${jobId}`)
    if (!res.ok) {
      toast.error('Job non trovato')
      return
    }
    const data: JobData = await res.json()
    setJob(data)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [jobId])

  // SSE per progressi live
  useEffect(() => {
    if (!job) return
    if (job.stato === 'completato' || job.stato === 'errore') return

    const es = new EventSource(`/api/internal-linking/jobs/${jobId}/stream`)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        setStreamProgress({
          fase: data.fase,
          progresso: data.progresso,
          messaggio: data.messaggio,
        })
        if (data.fase === 'completato' || data.fase === 'errore') {
          es.close()
          refresh()
        }
      } catch { /* ignore */ }
    }
    es.onerror = () => es.close()
    return () => es.close()
  }, [job?.stato, jobId])

  const grouped = useMemo(() => {
    if (!job) return []
    const map = new Map<number, { titolo: string; url: string; items: Suggestion[] }>()
    for (const s of job.suggestions) {
      const g = map.get(s.fontePostId) ?? { titolo: s.fonteTitolo, url: s.fonteUrl, items: [] }
      g.items.push(s)
      map.set(s.fontePostId, g)
    }
    return [...map.entries()].map(([id, v]) => ({ id, ...v }))
  }, [job])

  const approvati = useMemo(
    () => (job?.suggestions ?? []).filter((s) => s.stato === 'approvato').map((s) => s.id),
    [job]
  )

  async function setStato(id: string, stato: 'approvato' | 'rifiutato' | 'pendente') {
    const res = await fetch(`/api/internal-linking/suggestions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato }),
    })
    if (!res.ok) {
      toast.error('Errore aggiornamento')
      return
    }
    setJob((j) => j ? {
      ...j,
      suggestions: j.suggestions.map((s) => s.id === id ? { ...s, stato } : s),
    } : j)
  }

  async function riavvia() {
    setRestarting(true)
    try {
      const res = await fetch(`/api/internal-linking/jobs/${jobId}`, { method: 'POST' })
      if (!res.ok) throw new Error('Errore riavvio')
      await refresh()
      toast.success('Job riavviato')
    } catch {
      toast.error('Impossibile riavviare il job')
    } finally {
      setRestarting(false)
    }
  }

  async function applicaApprovati() {
    if (approvati.length === 0) {
      toast.error('Nessun suggerimento approvato')
      return
    }
    setApplying(true)
    try {
      const res = await fetch('/api/internal-linking/suggestions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: approvati }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.errore ?? 'Errore applicazione')

      const failedCount = data.failed?.length ?? 0
      const appliedCount = data.applied?.length ?? 0
      if (failedCount > 0) {
        toast.warning(`Applicati ${appliedCount}, falliti ${failedCount}`)
      } else {
        toast.success(`Applicati ${appliedCount} link`)
      }
      await refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore'
      toast.error(msg)
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-in">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/30 animate-pulse border border-border/40" />
        ))}
      </div>
    )
  }

  if (!job) return null

  const fase = streamProgress?.fase ?? job.fase
  const progresso = streamProgress?.progresso ?? job.progresso
  const messaggio = streamProgress?.messaggio ?? FASE_LABEL[fase] ?? fase
  const inCorso = job.stato === 'in_corso' || job.stato === 'in_coda'

  return (
    <div className="space-y-6 animate-in pb-32">
      <div>
        <Link
          href="/internal-linking"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Torna a Internal Linking
        </Link>
        <h1 className="font-display text-3xl text-foreground mt-2 mb-1">
          {job.sito.nome}
        </h1>
        <p className="text-xs text-muted-foreground font-mono">{job.sito.dominio}</p>
      </div>

      {/* Progress */}
      <div className="p-5 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {inCorso && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {job.stato === 'completato' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
            {job.stato === 'errore' && <AlertCircle className="h-4 w-4 text-destructive" />}
            <span className="text-sm font-medium">{FASE_LABEL[fase] ?? fase}</span>
          </div>
          <span className="text-xs text-muted-foreground">{progresso}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{messaggio}</p>
        {job.totalePost > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            {job.postProcessati} / {job.totalePost} post analizzati ·{' '}
            {job.suggestions.length} suggerimenti
          </p>
        )}
        {job.errore && (
          <p className="mt-2 text-xs text-destructive">{job.errore}</p>
        )}
        {(job.stato === 'errore' || job.stato === 'in_coda') && (
          <div className="mt-3">
            <button
              onClick={riavvia}
              disabled={restarting}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors disabled:opacity-50"
            >
              {restarting ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Riavvia analisi
            </button>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {job.suggestions.length === 0 && job.stato === 'completato' && (
        <div className="p-10 rounded-xl border border-dashed border-border text-center text-sm text-muted-foreground">
          Nessun suggerimento generato per questo sito.
        </div>
      )}

      {grouped.map((group) => (
        <div key={group.id} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Post sorgente</p>
              <p className="text-sm font-medium truncate">{group.titolo}</p>
            </div>
            <a
              href={group.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              Apri <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="divide-y divide-border">
            {group.items.map((s) => (
              <SuggestionRow
                key={s.id}
                suggestion={s}
                onApprove={() => setStato(s.id, s.stato === 'approvato' ? 'pendente' : 'approvato')}
                onReject={() => setStato(s.id, s.stato === 'rifiutato' ? 'pendente' : 'rifiutato')}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Sticky apply bar */}
      {approvati.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            <p className="text-sm">
              <span className="font-medium">{approvati.length}</span>{' '}
              <span className="text-muted-foreground">suggerimenti pronti per essere applicati</span>
            </p>
            <button
              onClick={applicaApprovati}
              disabled={applying}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50"
            >
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
              Applica a WordPress
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SuggestionRow({
  suggestion,
  onApprove,
  onReject,
}: {
  suggestion: Suggestion
  onApprove: () => void
  onReject: () => void
}) {
  const s = suggestion
  return (
    <div
      className={
        s.stato === 'approvato'
          ? 'px-5 py-4 bg-emerald-500/5'
          : s.stato === 'rifiutato'
            ? 'px-5 py-4 bg-muted/20 opacity-60'
            : s.stato === 'applicato'
              ? 'px-5 py-4 bg-primary/5'
              : s.stato === 'errore'
                ? 'px-5 py-4 bg-destructive/5'
                : 'px-5 py-4'
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">→</span>
            <a
              href={s.targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              {s.targetTitolo}
              <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
          </div>

          <div className="text-xs">
            <span className="text-muted-foreground">Anchor: </span>
            <span className="font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {s.anchorText}
            </span>
          </div>

          {s.contesto && (
            <p className="text-xs text-muted-foreground italic">
              «{s.contesto.length > 200 ? s.contesto.slice(0, 200) + '…' : s.contesto}»
            </p>
          )}

          {s.motivazione && (
            <p className="text-xs text-muted-foreground/80">{s.motivazione}</p>
          )}

          {s.errore && (
            <p className="text-xs text-destructive">{s.errore}</p>
          )}

          {s.stato === 'applicato' && (
            <p className="text-xs text-primary font-medium">✓ Applicato</p>
          )}
        </div>

        {s.stato !== 'applicato' && (
          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={onReject}
              aria-label="Rifiuta"
              className={
                s.stato === 'rifiutato'
                  ? 'h-7 w-7 rounded-md bg-muted border border-border flex items-center justify-center text-foreground'
                  : 'h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors'
              }
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onApprove}
              aria-label="Approva"
              className={
                s.stato === 'approvato'
                  ? 'h-7 w-7 rounded-md bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-500'
                  : 'h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors'
              }
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
