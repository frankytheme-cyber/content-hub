import { Suspense } from 'react'
import { FiltriBar } from '@/components/dashboard/FiltriBar'
import { ArticleGrid } from '@/components/dashboard/ArticleGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { AppHeader } from '@/components/AppHeader'

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader maxWidth="max-w-6xl" />

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
