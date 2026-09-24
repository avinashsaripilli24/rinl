import { BLOCKS, VASTU_ORDER, score } from './derive'
import type { Facing, Plot, PlotType, Weights } from './types'

export interface Filters {
  q: string
  day: '' | '1' | '2'
  blocks: string[]
  types: PlotType[]
  facing: Facing[]
  corner: boolean
  minRoad: number
  minSides: number
  areaMin: number | null
  areaMax: number | null
  priceMin: number | null // lakh
  priceMax: number | null // lakh
  rateMin: number | null // ₹/sq.yd
  rateMax: number | null
  good: boolean
  noBad: boolean
  /** only plots on the shortlist */
  starred: boolean
  /** site visit status */
  visit: '' | 'yes' | 'no'
  sort: SortKey
}

export type SortKey = 'score' | 'vastu' | 'price' | '-price' | 'rate' | '-rate' | 'area' | '-area' | 'block'
export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'score', label: 'Best overall score' },
  { key: 'vastu', label: 'Vastu (NE first)' },
  { key: 'price', label: 'Price: low → high' },
  { key: '-price', label: 'Price: high → low' },
  { key: 'rate', label: '₹/sq.yd: low → high' },
  { key: '-rate', label: '₹/sq.yd: high → low' },
  { key: '-area', label: 'Area: large → small' },
  { key: 'area', label: 'Area: small → large' },
  { key: 'block', label: 'Block & plot no.' },
]

export const EMPTY: Filters = {
  q: '', day: '', blocks: [], types: [], facing: [], corner: false, minRoad: 0, minSides: 0,
  areaMin: null, areaMax: null, priceMin: null, priceMax: null, rateMin: null, rateMax: null,
  good: false, noBad: false, starred: false, visit: '', sort: 'score',
}

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])
const n = (v: string | null) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v))

export function fromParams(sp: URLSearchParams): Filters {
  return {
    q: sp.get('q') ?? '',
    day: (sp.get('day') as Filters['day']) ?? '',
    blocks: list(sp.get('blocks')),
    types: list(sp.get('types')) as PlotType[],
    facing: list(sp.get('facing')) as Facing[],
    corner: sp.get('corner') === '1',
    minRoad: n(sp.get('minRoad')) ?? 0,
    minSides: n(sp.get('minSides')) ?? 0,
    areaMin: n(sp.get('areaMin')), areaMax: n(sp.get('areaMax')),
    priceMin: n(sp.get('priceMin')), priceMax: n(sp.get('priceMax')),
    rateMin: n(sp.get('rateMin')), rateMax: n(sp.get('rateMax')),
    good: sp.get('good') === '1',
    noBad: sp.get('noBad') === '1',
    starred: sp.get('starred') === '1',
    visit: (sp.get('visit') as Filters['visit']) ?? '',
    sort: (sp.get('sort') as SortKey) || 'score',
  }
}

export function toParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams()
  const set = (k: string, v: unknown) => {
    if (v === '' || v == null || v === false || v === 0 || (Array.isArray(v) && !v.length)) return
    sp.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : String(v))
  }
  set('q', f.q); set('day', f.day); set('blocks', f.blocks); set('types', f.types); set('facing', f.facing)
  set('corner', f.corner); set('minRoad', f.minRoad); set('minSides', f.minSides)
  set('areaMin', f.areaMin); set('areaMax', f.areaMax); set('priceMin', f.priceMin); set('priceMax', f.priceMax)
  set('rateMin', f.rateMin); set('rateMax', f.rateMax); set('good', f.good); set('noBad', f.noBad); set('starred', f.starred); set('visit', f.visit)
  if (f.sort !== 'score') sp.set('sort', f.sort)
  return sp
}

/** number of filters applied besides the search text and sort */
export function activeCount(f: Filters): number {
  let c = 0
  if (f.day) c++
  if (f.blocks.length) c++
  if (f.types.length) c++
  if (f.facing.length) c++
  if (f.corner) c++
  if (f.minRoad) c++
  if (f.minSides) c++
  if (f.areaMin != null || f.areaMax != null) c++
  if (f.priceMin != null || f.priceMax != null) c++
  if (f.rateMin != null || f.rateMax != null) c++
  if (f.good) c++
  if (f.noBad) c++
  if (f.starred) c++
  if (f.visit) c++
  return c
}

const compact = (s: string) => s.toLowerCase().replace(/[\s\-_.]/g, '')

/**
 * Query forms:
 *  "40" / "11a" / "block 40"   -> block match, plus plots whose number is exactly that
 *  "LIG-111" / "lig111" / "111" -> unit number
 *  "lig", "mig", "pump"         -> plot type
 *  anything else                -> free text over unit, surroundings, approach, tags
 */
export function matches(p: Plot, raw: string): boolean {
  const q = raw.trim().toLowerCase()
  if (!q) return true
  return q.split(/\s*,\s*|\s+or\s+/).some((part) => matchOne(p, part))
}

function matchOne(p: Plot, q: string): boolean {
  const blockQ = q.match(/^(?:block|blk|b)?\s*(\d+[ab]?)$/i)
  const unitNum = p.unit.match(/\d+$/)?.[0]
  if (blockQ) {
    const v = blockQ[1].toLowerCase()
    if (/^(block|blk|b)/i.test(q)) return p.block.toLowerCase() === v
    return p.block.toLowerCase() === v || unitNum === v
  }
  const unitQ = compact(q).match(/^(lig|mig)(\d+)$/)
  if (unitQ) return p.unit === `${unitQ[1].toUpperCase()}-${Number(unitQ[2])}`
  if (/^(lig|mig)$/.test(q)) return p.type === q.toUpperCase()
  if (/^pump/.test(q)) return p.type === 'Pump House'
  if (/^(ne|nw|se|sw|n|e|s|w)$/.test(q)) return p.facing === q.toUpperCase()
  return q.split(/\s+/).every((w) => p.searchText.includes(w))
}

/** For an empty result on a block-looking query, suggest nearby blocks that exist. */
export function nearbyBlocks(q: string): string[] {
  const m = q.trim().match(/^(?:block\s*)?(\d+)/i)
  if (!m) return []
  const target = Number(m[1])
  return [...BLOCKS]
    .filter((b) => /^\d/.test(b))
    .sort((a, b) => Math.abs(parseInt(a) - target) - Math.abs(parseInt(b) - target))
    .slice(0, 4)
}

export function applyFilters(plots: Plot[], f: Filters, w: Weights, mine: { starred: string[]; visited: Record<string, number> } = { starred: [], visited: {} }): Plot[] {
  const out = plots.filter((p) => {
    if (!matches(p, f.q)) return false
    if (f.day && String(p.day) !== f.day) return false
    if (f.blocks.length && !f.blocks.includes(p.block)) return false
    if (f.types.length && !f.types.includes(p.type)) return false
    if (f.facing.length && (!p.facing || !f.facing.includes(p.facing))) return false
    if (f.corner && !p.isCorner) return false
    if (f.minRoad && p.maxRoad < f.minRoad) return false
    if (f.minSides && p.roadSides < f.minSides) return false
    if (f.areaMin != null && p.area < f.areaMin) return false
    if (f.areaMax != null && p.area > f.areaMax) return false
    if (f.priceMin != null && p.reservePrice < f.priceMin * 1e5) return false
    if (f.priceMax != null && p.reservePrice > f.priceMax * 1e5) return false
    if (f.rateMin != null && p.rate < f.rateMin) return false
    if (f.rateMax != null && p.rate > f.rateMax) return false
    if (f.good && !p.tags.some((t) => t.kind === 'good' && t.key !== 'corner')) return false
    if (f.noBad && p.tags.some((t) => t.kind === 'bad')) return false
    if (f.starred && !mine.starred.includes(p.id)) return false
    if (f.visit && !!mine.visited[p.id] !== (f.visit === 'yes')) return false
    return true
  })
  return sortPlots(out, f.sort, w)
}

export function sortPlots(plots: Plot[], key: SortKey, w: Weights): Plot[] {
  const by = (fn: (p: Plot) => number) => [...plots].sort((a, b) => fn(a) - fn(b) || blockOrder(a, b))
  switch (key) {
    case 'score': return by((p) => -score(p, w))
    case 'vastu': return by((p) => p.vastuRank * 10 - p.roadSides)
    case 'price': return by((p) => p.reservePrice)
    case '-price': return by((p) => -p.reservePrice)
    case 'rate': return by((p) => p.rate)
    case '-rate': return by((p) => -p.rate)
    case 'area': return by((p) => p.area)
    case '-area': return by((p) => -p.area)
    default: return [...plots].sort(blockOrder)
  }
}

function blockOrder(a: Plot, b: Plot) {
  return (
    (parseInt(a.block) || 999) - (parseInt(b.block) || 999) ||
    a.block.localeCompare(b.block) ||
    a.unit.localeCompare(b.unit, undefined, { numeric: true })
  )
}

export const FACING_OPTIONS: Facing[] = VASTU_ORDER
