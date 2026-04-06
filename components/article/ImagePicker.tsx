'use client'

import { useState } from 'react'
import { RefreshCw, ExternalLink, ImageIcon } from 'lucide-react'
import type { ImageSearchResponse } from '@/types/api'

interface ImagePickerProps {
  argomento: string
  categoria: string
  immagineUrl: string | null
  immagineCreditUrl: string | null
}

export function ImagePicker({
  argomento,
  categoria,
  immagineUrl,
  immagineCreditUrl,
}: ImagePickerProps) {
  const [url, setUrl] = useState(immagineUrl)
  const [creditUrl, setCreditUrl] = useState(immagineCreditUrl)
  const [cerca, setCerca] = useState(false)
  const [risultati, setRisultati] = useState<ImageSearchResponse['immagini']>([])
  const [caricando, setCaricando] = useState(false)

  async function cercaImmagini() {
    setCaricando(true)
    setCerca(true)
    try {
      const params = new URLSearchParams({ q: argomento, category: categoria })
      const res = await fetch(`/api/images/search?${params}`)
      const data: ImageSearchResponse = await res.json()
      setRisultati(data.immagini ?? [])
    } finally {
      setCaricando(false)
    }
  }

  function seleziona(img: ImageSearchResponse['immagini'][0]) {
    setUrl(img.url)
    setCreditUrl(img.creditUrl)
    setCerca(false)
  }

  return (
    <div className="space-y-3">
      {/* Current image */}
      {url ? (
        <div className="group relative rounded-xl overflow-hidden border border-border h-44 bg-muted/30">
          <img src={url} alt={argomento} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {creditUrl && (
            <a
              href={creditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-white/80 text-xs hover:text-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <ExternalLink className="h-3 w-3" />
              Pexels
            </a>
          )}
        </div>
      ) : (
        <div className="h-44 rounded-xl border border-dashed border-border/60 flex flex-col items-center justify-center gap-2 bg-muted/10">
          <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground/60">Nessuna immagine</p>
        </div>
      )}

      {/* Search button */}
      <button
        onClick={cercaImmagini}
        disabled={caricando}
        className="inline-flex items-center gap-2 h-8 px-3.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-all disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${caricando ? 'animate-spin' : ''}`} />
        {url ? 'Cerca altra immagine' : 'Cerca immagine'}
      </button>

      {/* Results grid */}
      {cerca && (
        <div className="grid grid-cols-3 gap-1.5">
          {caricando
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-muted/30 animate-pulse border border-border/40"
                />
              ))
            : risultati.map((img) => (
                <button
                  key={img.id}
                  onClick={() => seleziona(img)}
                  className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all h-20 focus:outline-none focus:border-primary"
                >
                  <img
                    src={img.previewUrl}
                    alt={`Foto di ${img.fotografo}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </button>
              ))}
        </div>
      )}
    </div>
  )
}
