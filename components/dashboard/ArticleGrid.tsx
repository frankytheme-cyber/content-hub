'use client'

import { useArticles } from '@/hooks/useArticles'
import { ArticleCard } from './ArticleCard'
import { useSearchParams } from 'next/navigation'
import { PenLine } from 'lucide-react'
import Link from 'next/link'

export function ArticleGrid() {
  const searchParams = useSearchParams()
  const stato = searchParams.get('stato') ?? undefined
  const { data, isLoading, isError } = useArticles(stato)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-60 rounded-xl shimmer border border-border" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted-foreground text-sm">Errore nel caricamento degli articoli.</p>
      </div>
    )
  }

  if (!data?.articoli.length) {
    return (
      <div className="py-24 flex flex-col items-center gap-6">
        <div className="w-16 h-16 rounded-2xl border border-border/60 bg-muted/30 flex items-center justify-center">
          <PenLine className="h-7 w-7 text-muted-foreground/50" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">Nessun articolo ancora</p>
          <p className="text-xs text-muted-foreground">Inizia creando il tuo primo contenuto SEO.</p>
        </div>
        <Link
          href="/wizard"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all"
        >
          <PenLine className="h-3.5 w-3.5" />
          Crea il primo articolo
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.articoli.map((a, i) => (
          <ArticleCard key={a.id} articolo={a} index={i} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6 font-mono">
        {data.totale} articoli totali
      </p>
    </div>
  )
}
