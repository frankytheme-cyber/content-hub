'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useJobStream } from '@/hooks/useJobStream'
import Link from 'next/link'
import { CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react'

const FASI: Record<string, { label: string; desc: string }> = {
  ricerca:      { label: 'Ricerca materiale',    desc: 'Analizzando fonti e raccogliendo dati...' },
  generazione:  { label: 'Scrittura articoli',   desc: 'Generando due varianti di contenuto...' },
  revisione:    { label: 'Revisione editoriale', desc: 'Verificando fatti e grammatica...' },
  seo:          { label: 'Ottimizzazione SEO',   desc: 'Affinando keyword e metadata GEO...' },
  immagini:     { label: 'Ricerca immagine',     desc: 'Trovando la foto perfetta...' },
  salvataggio:  { label: 'Salvataggio',          desc: 'Archiviando il contenuto...' },
  completato:   { label: 'Completato',           desc: '' },
  errore:       { label: 'Errore',               desc: '' },
}

const FASI_ORDER = ['ricerca', 'generazione', 'revisione', 'seo', 'immagini', 'salvataggio', 'completato']

export default function ProgressoPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const router = useRouter()
  const { fase, progresso, messaggi, completato, errore } = useJobStream(jobId)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    if (completato) {
      const t = setTimeout(() => router.push('/dashboard'), 2500)
      return () => clearTimeout(t)
    }
  }, [completato, router])

  async function riprendi() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      router.refresh()
    } catch {
      setRetrying(false)
    }
  }

  const faseInfo = fase ? FASI[fase] : null
  const faseIndex = fase ? FASI_ORDER.indexOf(fase) : -1

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg space-y-10">

        {/* Status icon */}
        <div className="text-center space-y-4 animate-in">
          {!fase && !errore && (
            <div className="flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
          {completato && (
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
              </div>
            </div>
          )}
          {errore && (
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
          )}

          <div>
            <h1 className="font-display text-3xl text-foreground">
              {completato ? 'Articolo pronto!' : errore ? 'Generazione fallita' : faseInfo?.label ?? 'Avvio...'}
            </h1>
            {!completato && !errore && faseInfo?.desc && (
              <p className="text-sm text-muted-foreground mt-1">{faseInfo.desc}</p>
            )}
            {completato && (
              <p className="text-sm text-muted-foreground mt-1">Reindirizzamento alla dashboard...</p>
            )}
            {errore && <p className="text-sm text-destructive mt-1">{errore}</p>}
          </div>
        </div>

        {/* Progress bar */}
        {!completato && !errore && (
          <div className="space-y-3 animate-in delay-1">
            <div className="progress-track h-1.5 w-full">
              <div className="progress-fill" style={{ width: `${progresso}%` }} />
            </div>

            {/* Step pills */}
            <div className="flex gap-1.5 flex-wrap justify-center">
              {FASI_ORDER.slice(0, -1).map((f, i) => (
                <span
                  key={f}
                  className={[
                    'px-2 py-0.5 rounded-full text-xs font-medium transition-all',
                    i < faseIndex
                      ? 'bg-primary/20 text-primary'
                      : i === faseIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {FASI[f]?.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Log messages */}
        {messaggi.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-4 max-h-40 overflow-y-auto animate-in delay-2">
            <ul className="space-y-1.5">
              {messaggi.map((m, i) => (
                <li key={i} className="flex gap-2 text-xs text-muted-foreground font-mono">
                  <span className="text-primary/50 select-none shrink-0">›</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex justify-center gap-3 animate-in delay-3">
          {completato && (
            <Link
              href="/dashboard"
              className="inline-flex items-center h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all"
            >
              Vai alla dashboard
            </Link>
          )}
          {errore && (
            <>
              <button
                onClick={riprendi}
                disabled={retrying}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              >
                {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Riprendi da checkpoint
              </button>
              <Link href="/dashboard" className="inline-flex items-center h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all">
                Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
