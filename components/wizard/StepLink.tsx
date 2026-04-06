'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizardStore } from '@/hooks/useWizardStore'
import { toast } from 'sonner'
import { ArrowLeft, Plus, X, Loader2, Sparkles, ShoppingCart, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StepLink() {
  const router = useRouter()
  const {
    sitoId, categoria, argomento, fonti, linkInterni,
    tipoArticolo, linkAmazon,
    addLink, removeLink, setStep, setTipoArticolo, setLinkAmazon, reset,
  } = useWizardStore()

  const [nuovoTesto, setNuovoTesto] = useState('')
  const [nuovoUrl, setNuovoUrl] = useState('')
  const [invio, setInvio] = useState(false)
  const [isPulashock, setIsPulashock] = useState(false)

  useEffect(() => {
    if (!sitoId) return
    fetch('/api/siti')
      .then((r) => r.json())
      .then((d) => {
        const sito = d.siti?.find((s: any) => s.id === sitoId)
        setIsPulashock(sito?.dominio === 'pulashock.it')
      })
  }, [sitoId])

  function aggiungi() {
    if (!nuovoTesto.trim() || !nuovoUrl.trim()) return
    addLink({ testo: nuovoTesto.trim(), url: nuovoUrl.trim() })
    setNuovoTesto('')
    setNuovoUrl('')
  }

  // tipoEffettivo: 'recensione' is valid only for Pulashock, everything else is 'standard'
  const tipoEffettivo = isPulashock ? tipoArticolo : 'standard'

  async function avvia() {
    if (tipoEffettivo === 'recensione' && !linkAmazon.trim()) {
      toast.error('Inserisci il link Amazon per la recensione')
      return
    }
    if (tipoEffettivo === 'standard' && linkInterni.length === 0) {
      toast.error('Aggiungi almeno un link interno prima di procedere')
      return
    }
    setInvio(true)
    try {
      const res = await fetch('/api/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitoId,
          tipoArticolo: tipoEffettivo,
          linkAmazon: tipoEffettivo === 'recensione' ? linkAmazon.trim() : undefined,
          categoria,
          argomento,
          fonti,
          linkInterni,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.dettaglio ?? err.errore ?? 'Errore di invio')
      }
      const data = await res.json()
      reset()
      router.push(`/wizard/progresso/${data.jobId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setInvio(false)
    }
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Step 4</p>
        <h2 className="font-display text-3xl text-foreground mb-2">Link interni</h2>
        <p className="text-sm text-muted-foreground">
          Aggiungi i link ai prodotti del tuo e-commerce. Verranno inseriti naturalmente nel testo.
        </p>
      </div>

      {/* Tipo articolo — solo per Pulashock */}
      {isPulashock && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Tipo articolo
          </label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'standard', label: 'Articolo standard', desc: 'Informativo, SEO, con link interni', Icon: FileText },
              { value: 'recensione', label: 'Recensione hi-fi', desc: 'Template fisso Gutenberg + Amazon', Icon: ShoppingCart },
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
      )}

      {/* Link Amazon — solo per Pulashock recensione */}
      {tipoEffettivo === 'recensione' && (
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Link Amazon *
          </label>
          <input
            placeholder="https://www.amazon.it/dp/..."
            value={linkAmazon}
            onChange={(e) => setLinkAmazon(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Verrà inserito nei bottoni Amazon della recensione.
          </p>
        </div>
      )}

      {/* Link table — nascosto solo per recensioni Pulashock */}
      {tipoEffettivo === 'standard' && (
        <>
          {linkInterni.length > 0 && (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_auto] text-xs font-medium text-muted-foreground bg-muted/30 px-4 py-2.5 border-b border-border">
                <span>Testo anchor</span>
                <span>URL prodotto</span>
                <span />
              </div>
              {linkInterni.map((link, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center px-4 py-3 border-b border-border/50 last:border-0 text-sm hover:bg-muted/20 transition-colors">
                  <span className="text-foreground truncate pr-4">{link.testo}</span>
                  <span className="text-muted-foreground font-mono text-xs truncate pr-4">{link.url}</span>
                  <button type="button" onClick={() => removeLink(i)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Aggiungi link
            </label>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                placeholder="Testo anchor"
                value={nuovoTesto}
                onChange={(e) => setNuovoTesto(e.target.value)}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
              />
              <input
                placeholder="https://..."
                value={nuovoUrl}
                onChange={(e) => setNuovoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungi()}
                className="flex-1 min-w-0 px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-mono"
              />
              <button
                type="button"
                onClick={aggiungi}
                disabled={!nuovoTesto.trim() || !nuovoUrl.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 disabled:opacity-30 disabled:pointer-events-none transition-all"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Riepilogo */}
      <div className="rounded-xl bg-muted/20 border border-border/60 p-4 grid grid-cols-2 gap-3 text-sm">
        {[
          ['Categoria', categoria],
          tipoEffettivo === 'recensione'
            ? ['Tipo', 'Recensione hi-fi']
            : ['Link interni', String(linkInterni.length)],
          ['Fonti', String(fonti.length)],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-xs text-muted-foreground mb-0.5">{k}</p>
            <p className="font-medium text-foreground truncate">{v || '—'}</p>
          </div>
        ))}
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground mb-0.5">Argomento</p>
          <p className="font-medium text-foreground line-clamp-2">{argomento}</p>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => { setStep(3); router.push('/wizard/riferimenti') }}
          disabled={invio}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-all disabled:opacity-30"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </button>

        <button
          onClick={avvia}
          disabled={invio}
          className="group inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:brightness-110 transition-all shadow-lg shadow-primary/20"
        >
          {invio ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Avvio...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
              Avvia generazione
            </>
          )}
        </button>
      </div>
    </div>
  )
}
