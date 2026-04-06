import type { SeoMetadata } from '@/types/agents'

interface SeoPanelProps {
  seoJson: Record<string, unknown>
}

function CharBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-primary' : 'bg-muted-foreground/40'
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-mono ${pct > 90 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {value}/{max}
        </span>
      </div>
      <div className="h-0.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SeoPanel({ seoJson }: SeoPanelProps) {
  const seo = seoJson as Partial<SeoMetadata>

  if (!seo.metaTitolo) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 p-4">
        <p className="text-xs text-muted-foreground italic">Dati SEO non disponibili.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm">

      {/* Meta title */}
      <div className="rounded-xl border border-border bg-card/50 p-3.5 space-y-2">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Meta Titolo
        </p>
        <p className="font-medium text-foreground leading-snug">{seo.metaTitolo}</p>
        <CharBar value={seo.metaTitolo?.length ?? 0} max={60} label="caratteri" />
      </div>

      {/* Meta description */}
      <div className="rounded-xl border border-border bg-card/50 p-3.5 space-y-2">
        <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
          Meta Descrizione
        </p>
        <p className="text-foreground/80 leading-relaxed text-xs">{seo.metaDescrizione}</p>
        <CharBar value={seo.metaDescrizione?.length ?? 0} max={160} label="caratteri" />
      </div>

      {/* Slug */}
      {seo.slug && (
        <div className="rounded-xl border border-border bg-card/50 p-3.5 space-y-1.5">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Slug URL
          </p>
          <code className="block text-xs font-mono text-primary/80 bg-primary/5 border border-primary/10 rounded-lg px-2.5 py-1.5 break-all">
            /{seo.slug}
          </code>
        </div>
      )}

      {/* Keywords */}
      {(seo.keywordPrincipale || (seo.keywordSecondarie && seo.keywordSecondarie.length > 0)) && (
        <div className="rounded-xl border border-border bg-card/50 p-3.5 space-y-2.5">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Keyword
          </p>
          {seo.keywordPrincipale && (
            <div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-primary/10 border border-primary/20 text-primary">
                {seo.keywordPrincipale}
              </span>
              <span className="text-xs text-muted-foreground ml-2">principale</span>
            </div>
          )}
          {seo.keywordSecondarie && seo.keywordSecondarie.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {seo.keywordSecondarie.map((k) => (
                <span
                  key={k}
                  className="px-2 py-0.5 rounded-md text-xs border border-border text-muted-foreground bg-muted/30 font-mono"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GEO Hints */}
      {seo.geoHints && seo.geoHints.length > 0 && (
        <div className="rounded-xl border border-border bg-card/50 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              GEO — Entità
            </p>
            <span className="text-xs text-primary/60 font-mono">AI-visible</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {seo.geoHints.map((h) => (
              <span
                key={h}
                className="px-2 py-0.5 rounded-md text-xs border border-blue-500/20 text-blue-400 bg-blue-500/5 font-mono"
              >
                {h}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/70 leading-relaxed">
            Migliorano la visibilità nelle risposte AI generative.
          </p>
        </div>
      )}

      {/* JSON-LD */}
      {seo.schemaMarkup && (
        <div className="rounded-xl border border-border bg-card/50 p-3.5 space-y-2">
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            Schema JSON-LD
          </p>
          <pre className="text-xs font-mono bg-muted/30 border border-border/60 rounded-lg p-3 overflow-auto max-h-36 text-muted-foreground leading-relaxed">
            {JSON.stringify(seo.schemaMarkup, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
