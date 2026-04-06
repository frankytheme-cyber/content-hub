'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Globe, Loader2, FileText, Zap } from 'lucide-react'
import type { PublishResponse } from '@/types/api'

interface PubblicaButtonProps {
  articoloId: string
  versioneId: string | null
  wpSiteUrl?: string
}

export function PubblicaButton({ articoloId, versioneId, wpSiteUrl }: PubblicaButtonProps) {
  const [aperto, setAperto] = useState(false)
  const [wpUrl, setWpUrl] = useState(wpSiteUrl ?? '')
  const [statoWp, setStatoWp] = useState<'draft' | 'publish'>('draft')
  const [invio, setInvio] = useState(false)
  const queryClient = useQueryClient()

  async function pubblica() {
    if (!versioneId) {
      toast.error('Seleziona prima una versione da pubblicare.')
      return
    }

    setInvio(true)
    try {
      const res = await fetch(`/api/articles/${articoloId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versioneId, wpSiteUrl: wpUrl, stato: statoWp }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.errore ?? 'Errore pubblicazione')
      }

      const data: PublishResponse = await res.json()
      toast.success(
        `Articolo ${statoWp === 'publish' ? 'pubblicato' : 'salvato come bozza'}! ID: ${data.wpPostId}`
      )

      queryClient.invalidateQueries({ queryKey: ['article', articoloId] })
      queryClient.invalidateQueries({ queryKey: ['articles'] })
      setAperto(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setInvio(false)
    }
  }

  return (
    <Dialog open={aperto} onOpenChange={setAperto}>
      <DialogTrigger
        disabled={!versioneId}
        className="inline-flex items-center gap-2 h-8 px-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 hover:border-primary/50 disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <Globe className="h-3.5 w-3.5" />
        Pubblica
      </DialogTrigger>

      <DialogContent className="max-w-md bg-[#0f0f12] border-border/60">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Globe className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg text-foreground">
                Pubblica su WordPress
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                L&apos;articolo sarà inviato via MCP.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              URL sito WordPress {!wpSiteUrl && '*'}
            </label>
            {wpSiteUrl ? (
              <p className="px-4 py-2.5 rounded-xl bg-card/50 border border-border/50 text-sm text-foreground font-mono truncate">
                {wpUrl}
              </p>
            ) : (
              <input
                placeholder="https://tuosito.com"
                value={wpUrl}
                onChange={(e) => setWpUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all font-mono"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              Modalità pubblicazione
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'draft', label: 'Bozza', desc: 'Rivedibile in WP', Icon: FileText },
                { value: 'publish', label: 'Pubblica', desc: 'Visibile subito', Icon: Zap },
              ] as const).map(({ value, label, desc, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatoWp(value)}
                  className={[
                    'flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all',
                    statoWp === value
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'border-border bg-card/50 text-muted-foreground hover:border-border/80 hover:text-foreground',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-3.5 w-3.5 ${statoWp === value ? 'text-primary' : ''}`} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                  <span className="text-xs opacity-60">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setAperto(false)}
            disabled={invio}
            className="flex-1 h-10 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 disabled:opacity-30 transition-all"
          >
            Annulla
          </button>
          <button
            onClick={pubblica}
            disabled={invio || !wpUrl}
            className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-lg shadow-primary/20"
          >
            {invio ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Pubblicazione...
              </>
            ) : (
              'Conferma e pubblica'
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
