'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAggiornamentoStore } from '@/hooks/useAggiornamentoStore'
import { WpPostList } from '@/components/aggiornamento/WpPostList'
import { cn } from '@/lib/utils'
import { ArrowRight, ArrowLeft, Globe, Check, RefreshCw, Loader2, FileText, Music } from 'lucide-react'

interface SitoOption {
  id: string
  nome: string
  dominio: string
  wpSiteUrl: string | null
}

export default function AggiornamentoPage() {
  const router = useRouter()
  const {
    step, sitoId, postSelezionato, focus, tipoArticolo,
    setStep, setSitoId, setPostSelezionato, setFocus, setTipoArticolo, reset,
  } = useAggiornamentoStore()

  const [siti, setSiti] = useState<SitoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/siti')
      .then((r) => r.json())
      .then((d) => {
        setSiti((d.siti ?? []).filter((s: SitoOption) => s.wpSiteUrl))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function avvia() {
    if (!postSelezionato || !sitoId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/aggiornamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitoId,
          wpPostId: postSelezionato.id,
          wpPostUrl: postSelezionato.link,
          wpPostTitle: postSelezionato.title,
          wpPostType: postSelezionato.postType,
          focus: focus.trim() || undefined,
          tipoArticolo,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).errore ?? 'Errore avvio aggiornamento')
      }
      const { jobId } = await res.json()
      reset()
      router.push(`/wizard/progresso/${jobId}`)
    } catch (e) {
      setSubmitting(false)
      alert(e instanceof Error ? e.message : 'Errore imprevisto')
    }
  }

  return (
    <div className="space-y-8 animate-in">
      {/* Step 1: Selezione sito + articolo */}
      {step === 1 && (
        <>
          <div>
            <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Step 1 di 2</p>
            <h2 className="font-display text-3xl text-foreground mb-2">Quale articolo aggiornare?</h2>
            <p className="text-sm text-muted-foreground">
              Seleziona il sito e poi scegli l&apos;articolo da aggiornare.
            </p>
          </div>

          {/* Selezione sito */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-muted/30 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : siti.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 rounded-xl border border-dashed border-border/60 text-muted-foreground">
              <Globe className="h-6 w-6 mb-1 opacity-40" />
              <p className="text-sm">Nessun sito con credenziali WordPress configurate.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Sito</p>
              {siti.map((sito) => {
                const sel = sitoId === sito.id
                return (
                  <button
                    key={sito.id}
                    type="button"
                    onClick={() => setSitoId(sito.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-xl border transition-all',
                      sel
                        ? 'border-primary/40 bg-primary/8'
                        : 'border-border bg-card hover:bg-muted/20'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Globe className={cn('h-4 w-4', sel ? 'text-primary' : 'text-muted-foreground')} />
                        <div>
                          <p className="text-sm font-medium">{sito.nome}</p>
                          <p className="text-xs text-muted-foreground font-mono">{sito.dominio}</p>
                        </div>
                      </div>
                      {sel && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Lista post WP */}
          {sitoId && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Articolo</p>
              <WpPostList
                sitoId={sitoId}
                selected={postSelezionato}
                onSelect={setPostSelezionato}
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!postSelezionato}
              className="group inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 disabled:opacity-40 transition-all"
            >
              Avanti
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </>
      )}

      {/* Step 2: Configurazione */}
      {step === 2 && postSelezionato && (
        <>
          <div>
            <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Step 2 di 2</p>
            <h2 className="font-display text-3xl text-foreground mb-2">Configura l&apos;aggiornamento</h2>
            <p className="text-sm text-muted-foreground">
              Opzionalmente indica su cosa concentrarti nell&apos;aggiornamento.
            </p>
          </div>

          {/* Tipo articolo */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tipo articolo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'standard', label: 'Standard', desc: 'Articolo informativo / recensione', Icon: FileText },
                { value: 'biografia', label: 'Biografia', desc: 'Biografia artista musicale', Icon: Music },
              ] as const).map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTipoArticolo(value)}
                  className={cn(
                    'flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all',
                    tipoArticolo === value
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-3.5 w-3.5', tipoArticolo === value ? 'text-primary' : '')} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <span className="text-xs opacity-60">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Riepilogo articolo scelto */}
          <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Articolo selezionato</p>
            <p className="text-sm font-medium text-foreground">{postSelezionato.title}</p>
          </div>

          {/* Focus opzionale */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="focus">
              Focus dell&apos;aggiornamento{' '}
              <span className="text-muted-foreground font-normal">(opzionale)</span>
            </label>
            <textarea
              id="focus"
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Es: aggiorna la sezione premi, aggiungi le attività del 2024-2025, correggi le date..."
              rows={3}
              className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Se vuoto, l&apos;agente aggiorna autonomamente tutto l&apos;articolo con le informazioni più recenti.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Indietro
            </button>
            <button
              type="button"
              onClick={avvia}
              disabled={submitting}
              className="group inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 disabled:opacity-60 transition-all"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Avvio...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 transition-transform group-hover:rotate-180 duration-500" />
                  Avvia aggiornamento
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
