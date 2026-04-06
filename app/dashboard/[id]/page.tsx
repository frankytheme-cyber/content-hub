'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useArticolo } from '@/hooks/useArticles'
import { VersionSelector } from '@/components/article/VersionSelector'
import { SeoPanel } from '@/components/article/SeoPanel'
import { ImagePicker } from '@/components/article/ImagePicker'
import { PubblicaButton } from '@/components/article/PubblicaButton'
import { StatoBadge } from '@/components/dashboard/StatoBadge'
import { ArrowLeft, Calendar, Tag } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { it } from 'date-fns/locale'

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted/40 rounded-xl ${className ?? ''}`} />
}

export default function ArticoloPage() {
  const { id } = useParams<{ id: string }>()
  const { data: articolo, isLoading } = useArticolo(id)

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="border-b border-border/60 h-14 flex items-center px-6">
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <div className="container mx-auto max-w-5xl px-4 py-10 space-y-6">
          <SkeletonBlock className="h-7 w-80" />
          <SkeletonBlock className="h-105" />
        </div>
      </div>
    )
  }

  if (!articolo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Articolo non trovato.</p>
        <Link
          href="/dashboard"
          className="text-xs text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
        >
          Torna alla dashboard
        </Link>
      </div>
    )
  }

  const versioneScelta = articolo.versioneScelta
  const versioneAttiva = articolo.versioni.find((v) => v.id === versioneScelta) ?? articolo.versioni[0]
  const seoCorrente = versioneAttiva?.seoJson ?? {}

  return (
    <div className="min-h-screen flex flex-col">

      {/* Sticky header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="container mx-auto max-w-5xl px-4 h-14 flex items-center justify-between gap-4">

          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:border-border transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="min-w-0">
              <h1 className="text-sm font-medium text-foreground truncate leading-tight">
                {articolo.titolo}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />
                  {articolo.session.categoria}
                </div>
                <span className="text-muted-foreground/30">·</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(articolo.createdAt), { addSuffix: true, locale: it })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <StatoBadge stato={articolo.stato} />
            <PubblicaButton articoloId={id} versioneId={versioneScelta} wpSiteUrl={articolo.session?.sito?.wpSiteUrl ?? undefined} />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8 items-start">

          {/* Main: versions */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="h-px flex-1 bg-border/60" />
              <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase px-3">
                Versioni dell&apos;articolo
              </span>
              <div className="h-px flex-1 bg-border/60" />
            </div>
            <VersionSelector
              articoloId={id}
              versioni={articolo.versioni}
              versioneScelta={versioneScelta}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:sticky lg:top-20">

            {/* Image section */}
            <div>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
                Immagine
              </p>
              <ImagePicker
                argomento={articolo.session.argomento}
                categoria={articolo.session.categoria}
                immagineUrl={versioneAttiva?.immagineUrl ?? null}
                immagineCreditUrl={versioneAttiva?.immagineCreditUrl ?? null}
              />
            </div>

            <div className="h-px bg-border/50" />

            {/* SEO Panel */}
            <div>
              <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-3">
                SEO &amp; GEO
              </p>
              <SeoPanel seoJson={seoCorrente} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
