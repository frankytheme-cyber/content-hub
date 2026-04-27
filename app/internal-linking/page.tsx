'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Globe, PlayCircle, Clock, Link2 } from 'lucide-react'
import { toast } from 'sonner'

interface SitoCard {
  id: string
  nome: string
  dominio: string
  wpSiteUrl: string | null
  credenzialiConfigurate: boolean
  ultimoJob: {
    id: string
    stato: string
    fase: string
    progresso: number
    totalePost: number
    creatoIl: string
    aggiornatoIl: string
  } | null
}

const STATO_LABEL: Record<string, string> = {
  in_coda: 'In coda',
  in_corso: 'In corso',
  completato: 'Completato',
  errore: 'Errore',
}

export default function InternalLinkingPage() {
  const router = useRouter()
  const [siti, setSiti] = useState<SitoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/internal-linking/siti')
      .then(async (r) => {
        if (!r.ok) {
          const data = await r.json().catch(() => ({}))
          throw new Error(data.errore ?? `HTTP ${r.status}`)
        }
        return r.json()
      })
      .then((d) => setSiti(d.siti ?? []))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Errore sconosciuto'
        setErrore(msg)
        toast.error('Impossibile caricare i siti')
      })
      .finally(() => setLoading(false))
  }, [])

  async function avviaAnalisi(sitoId: string) {
    setAnalyzing(sitoId)
    try {
      const res = await fetch('/api/internal-linking/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitoId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.errore ?? 'Errore avvio analisi')
      router.push(`/internal-linking/${data.jobId}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore'
      toast.error(msg)
      setAnalyzing(null)
    }
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <p className="text-xs font-medium tracking-widest text-primary uppercase mb-2">SEO</p>
        <h1 className="font-display text-4xl text-foreground leading-tight mb-3">
          Link interni
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Analizza i post pubblicati su WordPress e ricevi suggerimenti di link interni
          ottimizzati SEO. I suggerimenti vengono mostrati per la tua approvazione: solo
          quelli che selezioni vengono applicati ai post.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : errore ? (
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3 rounded-xl border border-dashed border-destructive/40 text-muted-foreground">
          <Globe className="h-7 w-7 mb-1 opacity-40 text-destructive" />
          <p className="text-sm text-destructive">Errore caricamento siti</p>
          <p className="text-xs opacity-70 max-w-md wrap-break-word">{errore}</p>
          <p className="text-xs opacity-70 mt-2">
            Se hai appena fatto la migrazione, riavvia il dev server (Ctrl+C poi <code>npm run dev</code>).
          </p>
        </div>
      ) : siti.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center gap-3 rounded-xl border border-dashed border-border/60 text-muted-foreground">
          <Globe className="h-7 w-7 mb-1 opacity-40" />
          <p className="text-sm">Nessun sito presente nel database.</p>
          <p className="text-xs opacity-70">Esegui <code>npx tsx prisma/seed.ts</code>.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {siti.map((sito) => {
            const job = sito.ultimoJob
            const isAnalyzing = analyzing === sito.id
            const inCorso = job?.stato === 'in_corso' || job?.stato === 'in_coda'
            const configurato = sito.credenzialiConfigurate

            return (
              <div
                key={sito.id}
                className="p-5 rounded-xl border border-border bg-card hover:border-border/80 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20">
                      <Link2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-foreground">{sito.nome}</p>
                      <p className="text-xs text-muted-foreground font-mono">{sito.dominio}</p>
                      {!configurato && (
                        <p className="mt-2 text-xs text-amber-500">
                          Credenziali WordPress non configurate (wpSiteUrl, wpUsername, wpAppPassword)
                        </p>
                      )}
                      {job && (
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Ultima analisi: {new Date(job.aggiornatoIl).toLocaleString('it-IT')}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-muted/40 border border-border/60">
                            {STATO_LABEL[job.stato] ?? job.stato}
                          </span>
                          {job.totalePost > 0 && (
                            <span>{job.totalePost} post</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {job && (
                      <Link
                        href={`/internal-linking/${job.id}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted text-sm transition-colors"
                      >
                        Vedi ultimo
                      </Link>
                    )}
                    <button
                      onClick={() => avviaAnalisi(sito.id)}
                      disabled={isAnalyzing || inCorso || !configurato}
                      title={!configurato ? 'Credenziali WordPress non configurate' : undefined}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      {inCorso ? 'In corso…' : isAnalyzing ? 'Avvio…' : 'Analizza'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
