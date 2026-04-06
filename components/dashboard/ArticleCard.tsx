'use client'

import Link from 'next/link'
import { StatoBadge } from './StatoBadge'
import { useDeleteArticolo } from '@/hooks/useArticles'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import type { ArticoloSummary } from '@/types/api'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

interface ArticleCardProps {
  articolo: ArticoloSummary
  index?: number
}

export function ArticleCard({ articolo, index = 0 }: ArticleCardProps) {
  const { mutate: elimina, isPending } = useDeleteArticolo()

  function handleElimina(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Eliminare "${articolo.titolo}"?`)) return
    elimina(articolo.id, {
      onSuccess: () => toast.success('Articolo eliminato'),
      onError: () => toast.error('Errore durante l\'eliminazione'),
    })
  }

  const immagine = articolo.versioni[0]?.immagineUrl
  const punteggio = articolo.versioni.find((v) => v.id === articolo.versioneScelta)?.punteggio
    ?? articolo.versioni[0]?.punteggio

  return (
    <Link
      href={`/dashboard/${articolo.id}`}
      className={`group relative flex flex-col rounded-xl border border-border bg-card card-hover overflow-hidden animate-in delay-${Math.min(index + 1, 6)}`}
    >
      {/* Image / placeholder */}
      <div className="relative h-36 bg-muted overflow-hidden">
        {immagine ? (
          <img
            src={immagine}
            alt={articolo.titolo}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="font-display text-5xl text-border select-none">
              {articolo.titolo.charAt(0)}
            </div>
          </div>
        )}

        {/* Score badge */}
        {punteggio != null && (
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur-sm border border-border/60 text-xs font-mono text-primary">
            {Math.round(punteggio)}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-card/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4 gap-3">
        <div className="flex items-center justify-between">
          <StatoBadge stato={articolo.stato} />
          <span className="text-xs text-muted-foreground font-mono">
            {articolo.versioni.length}v
          </span>
        </div>

        <h3 className="text-sm font-medium text-foreground leading-snug line-clamp-2 flex-1">
          {articolo.titolo}
        </h3>

        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {articolo.categoria}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(articolo.createdAt), { addSuffix: true, locale: it })}
            </span>
          </div>

          <button
            type="button"
            onClick={handleElimina}
            disabled={isPending}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </Link>
  )
}
