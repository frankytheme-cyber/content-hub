'use client'

import { useEffect, useRef, useState } from 'react'
import type { JobEvent, PipelineFase } from '@/types/agents'

interface JobStreamState {
  fase: PipelineFase | null
  progresso: number
  messaggi: string[]
  completato: boolean
  errore: string | null
}

export function useJobStream(jobId: string | null) {
  const [state, setState] = useState<JobStreamState>({
    fase: null,
    progresso: 0,
    messaggi: [],
    completato: false,
    errore: null,
  })
  const esRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const receivedRef = useRef(false)

  useEffect(() => {
    if (!jobId) return

    function applyEvent(evento: JobEvent) {
      receivedRef.current = true
      setState((prev) => ({
        fase: evento.fase,
        progresso: evento.progresso,
        messaggi: evento.messaggio ? [...prev.messaggi, evento.messaggio] : prev.messaggi,
        completato: evento.fase === 'completato',
        errore: evento.fase === 'errore' ? evento.messaggio : null,
      }))
    }

    // SSE
    const es = new EventSource(`/api/jobs/${jobId}/stream`)
    esRef.current = es

    es.onmessage = (ev) => {
      try { applyEvent(JSON.parse(ev.data)) } catch { /* ignora */ }
    }

    es.onerror = () => { es.close() }

    // Polling di fallback ogni 3s nel caso gli eventi SSE vengano persi
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`)
        if (!res.ok) return
        const job = await res.json()

        if (job.stato === 'COMPLETATO') {
          applyEvent({ jobId, fase: 'completato', progresso: 100, messaggio: 'Articolo pronto.' })
          clearInterval(pollRef.current!)
        } else if (job.stato === 'FALLITO') {
          applyEvent({ jobId, fase: 'errore', progresso: 0, messaggio: job.errore ?? 'Errore sconosciuto' })
          clearInterval(pollRef.current!)
        } else if (!receivedRef.current) {
          // Siamo in coda o in esecuzione ma SSE non ha ancora mandato nulla
          const fase = job.fase ?? 'ricerca'
          applyEvent({ jobId, fase, progresso: job.progresso ?? 0, messaggio: job.fase ? `In esecuzione: ${fase}` : 'In coda...' })
        }
      } catch { /* ignora */ }
    }, 3000)

    return () => {
      es.close()
      esRef.current = null
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [jobId])

  return state
}
