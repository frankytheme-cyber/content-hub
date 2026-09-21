/**
 * Preselezione lessicale leggera.
 *
 * Serve a non spedire a un modello elenchi che possiamo restringere in locale:
 * scegliere i 12 candidati plausibili fra 500 costa microsecondi qui e migliaia
 * di token se lo si delega al modello.
 */

export const STOPWORD_IT = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in',
  'con', 'su', 'per', 'tra', 'fra', 'del', 'dello', 'della', 'dei', 'degli',
  'delle', 'dal', 'dalla', 'nel', 'nella', 'nei', 'negli', 'nelle', 'sul',
  'sulla', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'che', 'chi', 'cui',
  'non', 'come', 'dove', 'quando', 'perche', 'piu', 'meno', 'anche', 'ma', 'se',
  'si', 'sono', 'essere', 'stato', 'questa', 'questo', 'questi', 'queste',
  'quello', 'quella', 'suo', 'sua', 'loro', 'nostro', 'ogni', 'tutti', 'tutto',
  'and', 'the', 'for', 'with', 'your',
])

export function tokenizza(testo: string): string[] {
  return testo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 3 && !STOPWORD_IT.has(t))
}

export interface IndiceLessicale<T> {
  elementi: T[]
  idf: Map<string, number>
  tokenPerElemento: Map<string | number, Set<string>>
  chiave: (elemento: T) => string | number
}

/**
 * Costruisce l'indice IDF sul corpus. `testoDi` decide cosa pesa: ripetere il
 * titolo due volte è il modo più semplice per dargli più importanza dell'estratto.
 */
export function costruisciIndice<T>(
  elementi: T[],
  chiave: (elemento: T) => string | number,
  testoDi: (elemento: T) => string
): IndiceLessicale<T> {
  const tokenPerElemento = new Map<string | number, Set<string>>()
  const documentiPerToken = new Map<string, number>()

  for (const el of elementi) {
    const tokens = new Set(tokenizza(testoDi(el)))
    tokenPerElemento.set(chiave(el), tokens)
    for (const t of tokens) {
      documentiPerToken.set(t, (documentiPerToken.get(t) ?? 0) + 1)
    }
  }

  const n = Math.max(1, elementi.length)
  const idf = new Map<string, number>()
  for (const [token, df] of documentiPerToken) {
    idf.set(token, Math.log(1 + n / df))
  }

  return { elementi, idf, tokenPerElemento, chiave }
}

/** Gli elementi più affini alla query, ordinati per punteggio decrescente. */
export function classificaPerRilevanza<T>(
  indice: IndiceLessicale<T>,
  query: string,
  limite: number,
  escludi?: (elemento: T) => boolean
): T[] {
  const tokenQuery = new Set(tokenizza(query))
  if (tokenQuery.size === 0) return []

  const punteggi: Array<{ elemento: T; punteggio: number }> = []

  for (const el of indice.elementi) {
    if (escludi?.(el)) continue

    const tokenEl = indice.tokenPerElemento.get(indice.chiave(el))
    if (!tokenEl) continue

    let punteggio = 0
    for (const t of tokenEl) {
      if (tokenQuery.has(t)) punteggio += indice.idf.get(t) ?? 0
    }

    if (punteggio > 0) punteggi.push({ elemento: el, punteggio })
  }

  return punteggi
    .sort((a, b) => b.punteggio - a.punteggio)
    .slice(0, limite)
    .map((p) => p.elemento)
}
