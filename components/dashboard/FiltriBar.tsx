'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const FILTRI = [
  { label: 'Tutti', value: '' },
  { label: 'Bozze', value: 'BOZZA' },
  { label: 'Approvati', value: 'APPROVATO' },
  { label: 'Pubblicati', value: 'PUBBLICATO' },
]

export function FiltriBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const statoCorrente = searchParams.get('stato') ?? ''

  function setFiltro(stato: string) {
    const params = new URLSearchParams()
    if (stato) params.set('stato', stato)
    router.push(`/dashboard?${params}`)
  }

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60 w-fit">
      {FILTRI.map((f) => (
        <button
          key={f.value}
          onClick={() => setFiltro(f.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            statoCorrente === f.value
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
