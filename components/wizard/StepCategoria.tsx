'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizardStore } from '@/hooks/useWizardStore'
import { cn } from '@/lib/utils'
import { ArrowRight, ArrowLeft } from 'lucide-react'

export function StepCategoria() {
  const router = useRouter()
  const { sitoId, categoria, setCategoria, setStep } = useWizardStore()
  const [categorieSito, setCategorieSito] = useState<string[]>([])

  useEffect(() => {
    if (!sitoId) return
    fetch('/api/siti')
      .then((r) => r.json())
      .then((d) => {
        const sito = d.siti?.find((s: any) => s.id === sitoId)
        if (sito?.categorie?.length) setCategorieSito(sito.categorie)
      })
  }, [sitoId])

  function avanti() {
    if (!categoria) return
    setStep(3)
    router.push('/wizard/riferimenti')
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Step 2</p>
        <h2 className="font-display text-3xl text-foreground mb-2">Che categoria?</h2>
        <p className="text-sm text-muted-foreground">
          La categoria aiuta il sistema a contestualizzare l&apos;articolo.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {categorieSito.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoria(cat)}
            className={cn(
              'relative p-3.5 rounded-xl border text-left text-sm font-medium transition-all duration-200',
              categoria === cat
                ? 'border-primary bg-primary/10 text-foreground shadow-sm shadow-primary/10'
                : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-muted/30'
            )}
          >
            {categoria === cat && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
            )}
            {cat}
          </button>
        ))}
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => { setStep(1); router.push('/wizard') }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </button>

        <button
          onClick={avanti}
          disabled={!categoria}
          className="group inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-30 disabled:pointer-events-none hover:brightness-110 transition-all"
        >
          Avanti
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
