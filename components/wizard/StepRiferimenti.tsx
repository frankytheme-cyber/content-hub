'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWizardStore } from '@/hooks/useWizardStore'
import { ArrowRight, ArrowLeft, Plus, X } from 'lucide-react'

export function StepRiferimenti() {
  const router = useRouter()
  const { argomento, fonti, setArgomento, addFonte, removeFonte, setStep } = useWizardStore()
  const [nuovaFonte, setNuovaFonte] = useState('')

  function aggiungi() {
    if (!nuovaFonte.trim()) return
    addFonte(nuovaFonte.trim())
    setNuovaFonte('')
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Step 3</p>
        <h2 className="font-display text-3xl text-foreground mb-2">Di cosa parla?</h2>
        <p className="text-sm text-muted-foreground">
          Descrivi l&apos;argomento e, opzionalmente, indica fonti o note di riferimento.
        </p>
      </div>

      {/* Argomento */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Argomento *
        </label>
        <textarea
          placeholder="Es. Come scegliere le scarpe da running per principianti"
          value={argomento}
          onChange={(e) => setArgomento(e.target.value)}
          rows={3}
          className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all"
        />
        <p className="text-xs text-muted-foreground">Più sei specifico, migliore sarà il risultato.</p>
      </div>

      {/* Fonti */}
      <div className="space-y-3">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Fonti (opzionali)
        </label>

        {fonti.length > 0 && (
          <ul className="space-y-2">
            {fonti.map((f, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/60 text-sm">
                <span className="flex-1 truncate text-muted-foreground font-mono text-xs">{f}</span>
                <button
                  type="button"
                  onClick={() => removeFonte(i)}
                  className="text-muted-foreground/50 hover:text-destructive transition-colors shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="https://... o nota testuale"
            value={nuovaFonte}
            onChange={(e) => setNuovaFonte(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && aggiungi()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-mono"
          />
          <button
            type="button"
            onClick={aggiungi}
            className="px-3.5 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <button
          onClick={() => { setStep(2); router.push('/wizard/categoria') }}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Indietro
        </button>
        <button
          onClick={() => { if (!argomento.trim()) return; setStep(4); router.push('/wizard/link') }}
          disabled={!argomento.trim()}
          className="group inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-30 disabled:pointer-events-none hover:brightness-110 transition-all"
        >
          Avanti
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
