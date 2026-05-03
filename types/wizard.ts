import type { LinkInternoInput } from './agents'

export interface WizardState {
  step: 1 | 2 | 3 | 4
  sitoId: string
  tipoArticolo: 'standard' | 'recensione' | 'sistema' | 'biografia'
  linkAmazon: string
  categoriaArtista: string
  categoria: string
  argomento: string
  fonti: string[]
  linkInterni: LinkInternoInput[]
  sistemaCategorie: string[]
}

export const CATEGORIE = [
  'Elettronica',
  'Abbigliamento',
  'Casa e giardino',
  'Sport e fitness',
  'Bellezza e cura persona',
  'Alimentare e bevande',
  'Libri e media',
  'Giocattoli e bambini',
  'Auto e moto',
  'Altro',
] as const

export type Categoria = (typeof CATEGORIE)[number]
