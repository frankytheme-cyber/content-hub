'use client'

import { create } from 'zustand'
import type { WpPostListItem } from '@/types/api'

interface AggiornamentoStore {
  step: 1 | 2
  sitoId: string
  postSelezionato: WpPostListItem | null
  focus: string
  tipoArticolo: 'standard' | 'biografia'
  setStep: (step: 1 | 2) => void
  setSitoId: (id: string) => void
  setPostSelezionato: (post: WpPostListItem | null) => void
  setFocus: (focus: string) => void
  setTipoArticolo: (tipo: 'standard' | 'biografia') => void
  reset: () => void
}

const initialState = {
  step: 1 as const,
  sitoId: '',
  postSelezionato: null,
  focus: '',
  tipoArticolo: 'standard' as const,
}

export const useAggiornamentoStore = create<AggiornamentoStore>()((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setSitoId: (sitoId) => set({ sitoId, postSelezionato: null }),
  setPostSelezionato: (postSelezionato) => set({ postSelezionato }),
  setFocus: (focus) => set({ focus }),
  setTipoArticolo: (tipoArticolo) => set({ tipoArticolo }),
  reset: () => set(initialState),
}))
