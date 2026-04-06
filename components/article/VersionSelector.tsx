'use client'

import { useState } from 'react'
import { usePatchArticolo } from '@/hooks/useArticles'
import { toast } from 'sonner'
import { Star, Check, ChevronDown, ChevronUp } from 'lucide-react'
import type { VersioneDetail } from '@/types/api'

interface VersionSelectorProps {
  articoloId: string
  versioni: VersioneDetail[]
  versioneScelta: string | null
  onVersioneScelta?: (id: string) => void
}

export function VersionSelector({
  articoloId,
  versioni,
  versioneScelta,
  onVersioneScelta,
}: VersionSelectorProps) {
  const { mutate: patch } = usePatchArticolo(articoloId)
  const [activeId, setActiveId] = useState(versioni[0]?.id ?? null)
  const [schemaAperto, setSchemaAperto] = useState(false)

  function seleziona(versioneId: string) {
    patch(
      { versioneScelta: versioneId },
      {
        onSuccess: () => {
          toast.success('Versione selezionata')
          onVersioneScelta?.(versioneId)
        },
        onError: () => toast.error('Errore nella selezione'),
      }
    )
  }

  if (!versioni.length) return null

  const versioneAttiva = versioni.find((v) => v.id === activeId) ?? versioni[0]

  return (
    <div className="space-y-0">
      {/* Tab row */}
      <div className="flex gap-2 mb-6">
        {versioni.map((v) => {
          const isActive = v.id === activeId
          const isScelta = v.id === versioneScelta
          return (
            <button
              key={v.id}
              onClick={() => setActiveId(v.id)}
              className={[
                'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/15 border border-primary/40 text-primary'
                  : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border/80',
              ].join(' ')}
            >
              {v.tono}
              {isScelta && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                  <Check className="h-2.5 w-2.5 text-emerald-400" />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Version header */}
      <div className="rounded-xl border border-border bg-card/50 p-4 mb-5 flex items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium tracking-widest text-primary uppercase">
              {versioneAttiva.tono}
            </span>
            {versioneAttiva.id === versioneScelta && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Versione selezionata
              </span>
            )}
          </div>
          {versioneAttiva.punteggio != null && (
            <div className="flex items-center gap-1.5">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={[
                      'h-3.5 w-3.5',
                      versioneAttiva.punteggio! >= n * 20
                        ? 'fill-primary text-primary'
                        : 'fill-muted text-muted',
                    ].join(' ')}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {Math.round(versioneAttiva.punteggio)}/100
              </span>
            </div>
          )}
          {versioneAttiva.noteRevisione && (
            <p className="text-xs text-muted-foreground italic leading-relaxed max-w-lg">
              {versioneAttiva.noteRevisione}
            </p>
          )}
        </div>

        {versioneAttiva.id !== versioneScelta && (
          <button
            onClick={() => seleziona(versioneAttiva.id)}
            className="shrink-0 inline-flex items-center gap-2 h-8 px-4 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 hover:border-primary/50 transition-all"
          >
            <Check className="h-3.5 w-3.5" />
            Seleziona
          </button>
        )}
      </div>

      {/* Article content */}
      <ArticlePreviewContent corpo={versioneAttiva.corpo} />
    </div>
  )
}

function ArticlePreviewContent({ corpo }: { corpo: string }) {
  const html = markdownToHtml(corpo)
  return (
    <div
      className="article-prose rounded-xl border border-border bg-card/30 p-7 text-[0.9375rem] leading-[1.8] text-foreground/90"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="font-display text-xl text-foreground mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-display text-2xl text-foreground mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-display text-3xl text-foreground mt-12 mb-5">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">$1</a>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc list-inside text-foreground/80">$1</li>')
    .replace(/(<li.*<\/li>\n?)+/g, '<ul class="my-4 space-y-1">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mb-4 text-foreground/80">')
    .replace(/^([^<\n].+)$/gm, (line) => `<p class="mb-4 text-foreground/80">${line}</p>`)
}
