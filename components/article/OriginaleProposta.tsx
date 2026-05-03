'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ExternalLink, Loader2, CheckCircle2 } from 'lucide-react'
import type { ArticoloDetailResponse, ApplyUpdateResponse } from '@/types/api'

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-6 mb-2">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary underline">$1</a>')
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/^(?!<[h|l])/gm, '')
}

interface OriginaleProposta {
  articoloId: string
  versioneId: string | null
  session: ArticoloDetailResponse['session']
  corpo: string
}

export function OriginaleProposta({ articoloId, versioneId, session, corpo }: OriginaleProposta) {
  const [applicato, setApplicato] = useState(false)

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!versioneId) throw new Error('Nessuna versione selezionata')
      const res = await fetch(`/api/articles/${articoloId}/apply-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versioneId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).errore ?? 'Errore applicazione aggiornamento')
      }
      return res.json() as Promise<ApplyUpdateResponse>
    },
    onSuccess: (data) => {
      setApplicato(true)
      toast.success('Aggiornamento pubblicato su WordPress', {
        action: {
          label: 'Visualizza',
          onClick: () => window.open(data.wpPostUrl, '_blank'),
        },
      })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Errore imprevisto')
    },
  })

  const originalHtml = session.contenutoOriginale ?? ''
  const proposedHtml = `<p class="mb-3">${markdownToHtml(corpo)}</p>`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground uppercase mb-0.5">
            Proposta di aggiornamento
          </p>
          {session.wpPostUrl && (
            <a
              href={session.wpPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Articolo originale
            </a>
          )}
        </div>

        {!applicato ? (
          <button
            type="button"
            onClick={() => applyMutation.mutate()}
            disabled={applyMutation.isPending || !versioneId}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {applyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Applica aggiornamento
          </button>
        ) : (
          <div className="inline-flex items-center gap-1.5 text-sm text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
            Pubblicato
          </div>
        )}
      </div>

      {session.focusAggiornamento && (
        <div className="text-xs text-muted-foreground bg-muted/40 border border-border/60 rounded-lg px-3 py-2">
          <span className="font-medium text-foreground">Focus: </span>
          {session.focusAggiornamento}
        </div>
      )}

      {/* Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Originale</p>
          <div className="rounded-xl border border-border bg-muted/10 p-4 max-h-[600px] overflow-y-auto text-sm text-foreground/80 leading-relaxed prose prose-sm max-w-none">
            {originalHtml ? (
              <div dangerouslySetInnerHTML={{ __html: originalHtml }} />
            ) : (
              <p className="text-muted-foreground italic">Contenuto originale non disponibile.</p>
            )}
          </div>
        </div>

        {/* Proposed */}
        <div>
          <p className="text-xs font-medium text-primary mb-2 uppercase tracking-wider">Proposta aggiornata</p>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 max-h-[600px] overflow-y-auto text-sm text-foreground leading-relaxed prose prose-sm max-w-none">
            <div dangerouslySetInnerHTML={{ __html: proposedHtml }} />
          </div>
        </div>
      </div>
    </div>
  )
}
