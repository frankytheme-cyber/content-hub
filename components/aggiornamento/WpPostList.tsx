'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Search, Loader2 } from 'lucide-react'
import type { SitoPostsResponse, WpPostListItem } from '@/types/api'

interface WpPostListProps {
  sitoId: string
  selected: WpPostListItem | null
  onSelect: (post: WpPostListItem) => void
}

async function fetchPosts(sitoId: string): Promise<SitoPostsResponse> {
  const res = await fetch(`/api/siti/${sitoId}/posts`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).errore ?? 'Errore caricamento articoli')
  }
  return res.json()
}

export function WpPostList({ sitoId, selected, onSelect }: WpPostListProps) {
  const [query, setQuery] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['wp-posts', sitoId],
    queryFn: () => fetchPosts(sitoId),
    enabled: !!sitoId,
    staleTime: 0,
    gcTime: 0,
  })

  const filtered = (data?.posts ?? []).filter((p) =>
    p.title.toLowerCase().includes(query.toLowerCase()) ||
    p.slug.toLowerCase().includes(query.toLowerCase()) ||
    p.postType.toLowerCase().includes(query.toLowerCase())
  )

  if (!sitoId) return null

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Cerca articolo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento articoli da WordPress...
        </div>
      )}

      {isError && (
        <p className="text-sm text-destructive py-4 text-center">
          {error instanceof Error ? error.message : 'Errore caricamento'}
        </p>
      )}

      {/* Post list */}
      {!isLoading && !isError && (
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {query ? 'Nessun risultato.' : 'Nessun articolo pubblicato trovato.'}
            </p>
          )}
          {filtered.map((post) => (
            <button
              key={`${post.postType}-${post.id}`}
              type="button"
              onClick={() => onSelect(post)}
              className={[
                'w-full text-left px-4 py-3 rounded-xl border transition-all group',
                selected?.id === post.id && selected?.postType === post.postType
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-border/80 hover:bg-muted/30',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                    {post.postType !== 'posts' && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border/60 text-muted-foreground capitalize">
                        {post.postType}
                      </span>
                    )}
                  </div>
                  {post.excerpt && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{post.excerpt}</p>
                  )}
                </div>
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
