import Link from 'next/link'
import { PenLine, Link2, RefreshCw } from 'lucide-react'

interface AppHeaderProps {
  maxWidth?: 'max-w-2xl' | 'max-w-5xl' | 'max-w-6xl'
}

export function AppHeader({ maxWidth = 'max-w-6xl' }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className={`${maxWidth} mx-auto px-6 h-16 flex items-center justify-between`}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-7 h-7 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
          </div>
          <span className="font-display text-lg text-foreground tracking-wide group-hover:text-primary transition-colors">
            Content Hub
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/internal-linking"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Link2 className="h-3.5 w-3.5" />
            Link interni
          </Link>
          <Link
            href="/aggiornamento"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-background hover:bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Aggiorna articolo
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
  )
}
