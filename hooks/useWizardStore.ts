'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WizardState } from '@/types/wizard'
import type { LinkInternoInput } from '@/types/agents'

interface WizardStore extends WizardState {
  setStep: (step: 1 | 2 | 3 | 4) => void
  setSitoId: (sitoId: string) => void
  setTipoArticolo: (tipo: 'standard' | 'recensione' | 'sistema') => void
  setLinkAmazon: (link: string) => void
  setCategoria: (categoria: string) => void
  setArgomento: (argomento: string) => void
  setFonti: (fonti: string[]) => void
  addFonte: (fonte: string) => void
  removeFonte: (index: number) => void
  setLinkInterni: (links: LinkInternoInput[]) => void
  addLink: (link: LinkInternoInput) => void
  removeLink: (index: number) => void
  updateLink: (index: number, link: LinkInternoInput) => void
  setSistemaCategorie: (categorie: string[]) => void
  reset: () => void
}

const initialState: WizardState = {
  step: 1,
  sitoId: '',
  tipoArticolo: 'standard',
  linkAmazon: '',
  categoria: '',
  argomento: '',
  fonti: [],
  linkInterni: [],
  sistemaCategorie: [],
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set) => ({
      ...initialState,

      setStep: (step) => set({ step }),
      setSitoId: (sitoId) => set({ sitoId }),
      setTipoArticolo: (tipoArticolo) => set({ tipoArticolo }),
      setSistemaCategorie: (sistemaCategorie) => set({ sistemaCategorie }),
      setLinkAmazon: (linkAmazon) => set({ linkAmazon }),
      setCategoria: (categoria) => set({ categoria }),
      setArgomento: (argomento) => set({ argomento }),
      setFonti: (fonti) => set({ fonti }),
      addFonte: (fonte) => set((s) => ({ fonti: [...s.fonti, fonte] })),
      removeFonte: (index) =>
        set((s) => ({ fonti: s.fonti.filter((_, i) => i !== index) })),
      setLinkInterni: (linkInterni) => set({ linkInterni }),
      addLink: (link) => set((s) => ({ linkInterni: [...s.linkInterni, link] })),
      removeLink: (index) =>
        set((s) => ({ linkInterni: s.linkInterni.filter((_, i) => i !== index) })),
      updateLink: (index, link) =>
        set((s) => ({
          linkInterni: s.linkInterni.map((l, i) => (i === index ? link : l)),
        })),
      reset: () => set(initialState),
    }),
    {
      name: 'wizard-store',
      partialize: (state) => ({
        step: state.step,
        sitoId: state.sitoId,
        tipoArticolo: state.tipoArticolo,
        linkAmazon: state.linkAmazon,
        categoria: state.categoria,
        argomento: state.argomento,
        fonti: state.fonti,
        linkInterni: state.linkInterni,
        sistemaCategorie: state.sistemaCategorie,
      }),
    }
  )
)
