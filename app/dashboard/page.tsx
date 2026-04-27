import Link from 'next/link'
import { Suspense } from 'react'
import { FiltriBar } from '@/components/dashboard/FiltriBar'
import { ArticleGrid } from '@/components/dashboard/ArticleGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { PenLine, Link2 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
            </div>
            <span className="font-display text-lg text-foreground tracking-wide">
              Content Hub
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/internal-linking"
              className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" />
              Link interni
            </Link>
            <Link
              href="/wizard"
              className="group inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-all hover:brightness-110 hover:shadow-lg hover:shadow-primary/20 active:scale-95"
            >
              <PenLine className="h-3.5 w-3.5 transition-transform group-hover:-rotate-6" />
              Nuovo articolo
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {/* Page title */}
        <div className="mb-10 animate-in">
          <p className="text-xs font-medium tracking-widest text-primary uppercase mb-2">
            Archivio
          </p>
          <h1 className="font-display text-4xl text-foreground leading-tight">
            I tuoi articoli
          </h1>
        </div>

        {/* Filters */}
        <div className="mb-8 animate-in delay-1">
          <Suspense>
            <FiltriBar />
          </Suspense>
        </div>

        {/* Grid */}
        <div className="animate-in delay-2">
          <Suspense
            fallback={
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-60 rounded-xl shimmer border border-border" />
                ))}
              </div>
            }
          >
            <ArticleGrid />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
