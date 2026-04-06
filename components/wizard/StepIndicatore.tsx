'use client'

import { cn } from '@/lib/utils'

const STEPS = [
  { num: 1, label: 'Sito' },
  { num: 2, label: 'Categoria' },
  { num: 3, label: 'Argomento' },
  { num: 4, label: 'Link interni' },
]

export function StepIndicatore({ stepCorrente }: { stepCorrente: number }) {
  return (
    <div className="mb-12">
      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const completato = step.num < stepCorrente
          const attivo = step.num === stepCorrente

          return (
            <div key={step.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium font-mono transition-all duration-300',
                    completato && 'bg-primary text-primary-foreground',
                    attivo && 'bg-primary/10 border border-primary text-primary ring-4 ring-primary/10',
                    !completato && !attivo && 'bg-muted border border-border text-muted-foreground'
                  )}
                >
                  {completato ? '✓' : step.num}
                </div>
                <span
                  className={cn(
                    'text-xs whitespace-nowrap transition-colors',
                    attivo ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-3 mb-5">
                  <div className="h-px bg-border relative overflow-hidden">
                    <div
                      className={cn(
                        'absolute inset-0 bg-primary transition-all duration-500 origin-left',
                        completato ? 'scale-x-100' : 'scale-x-0'
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
