'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizardStore } from '@/hooks/useWizardStore'
import { cn } from '@/lib/utils'
import { ArrowRight, Globe, Check } from 'lucide-react'

interface SitoOption {
  id: string
  nome: string
  dominio: string
  categorie: string[]
  wpSiteUrl: string | null
}

export function StepSito() {
  const router = useRouter()
  const { sitoId, setSitoId, setCategoria, setStep } = useWizardStore()
  const [siti, setSiti] = useState<SitoOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/siti')
      .then((r) => r.json())
      .then((d) => {
        const lista: SitoOption[] = d.siti ?? []
        setSiti(lista)
        setLoading(false)
        if (sitoId && !lista.some((s) => s.id === sitoId)) setSitoId('')
      })
      .catch(() => setLoading(false))
  }, [])

  function seleziona(sito: SitoOption) {
    setSitoId(sito.id)
    // Reset categoria se non è nelle categorie del sito
    setCategoria('')
  }

  function avanti() {
    setStep(2)
    router.push('/wizard/categoria')
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Step 1</p>
        <h2 className="font-display text-3xl text-foreground mb-2">Per quale sito?</h2>
        <p className="text-sm text-muted-foreground">
          Seleziona il sito per cui stai scrivendo. Ogni sito ha le sue linee guida e categorie.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse border border-border/40" />
          ))}
        </div>
      ) : siti.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2 rounded-xl border border-dashed border-border/60 text-muted-foreground">
          <Globe className="h-6 w-6 mb-1 opacity-40" />
          <p className="text-sm">Nessun sito configurato.</p>
          <p className="text-xs opacity-70">Puoi procedere senza selezionare un sito.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {siti.map((sito) => {
            const selezionato = sitoId === sito.id
            return (
              <button
                key={sito.id}
                type="button"
                onClick={() => seleziona(sito)}
                className={cn(
                  'w-full text-left p-4 rounded-xl border transition-all duration-200',
                  selezionato
                    ? 'border-primary/40 bg-primary/8 shadow-sm shadow-primary/10'
                    : 'border-border bg-card hover:border-border/80 hover:bg-muted/20'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors',
                      selezionato ? 'bg-primary/15 border border-primary/30' : 'bg-muted/40 border border-border/60'
                    )}>
                      <Globe className={cn('h-4 w-4', selezionato ? 'text-primary' : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('font-medium text-sm', selezionato ? 'text-foreground' : 'text-foreground/80')}>
                        {sito.nome}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">{sito.dominio}</p>
                    </div>
                  </div>
                  {selezionato && (
                    <span className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 border border-primary/30">
                      <Check className="h-3 w-3 text-primary" />
                    </span>
                  )}
                </div>
                {sito.categorie.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {sito.categorie.slice(0, 4).map((cat) => (
                      <span
                        key={cat}
                        className="px-2 py-0.5 rounded-md text-xs border border-border/60 text-muted-foreground bg-muted/20"
                      >
                        {cat}
                      </span>
                    ))}
                    {sito.categorie.length > 4 && (
                      <span className="px-2 py-0.5 rounded-md text-xs text-muted-foreground/60">
                        +{sito.categorie.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={avanti}
          className="group inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all"
        >
          Avanti
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
