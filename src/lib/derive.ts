import raw from '../data/plots.json'
import type { Dir, Facing, Plot, RawPlot, Road, Tag, Weights } from './types'

export const DIRS: Dir[] = ['N', 'E', 'S', 'W']
export const DIR_NAME: Record<Dir, string> = { N: 'North', S: 'South', E: 'East', W: 'West' }

/** User's vastu preference, best first. SW is appended as the least preferred. */
export const VASTU_ORDER: Facing[] = ['NE', 'E', 'N', 'NW', 'SE', 'W', 'S', 'SW']
export const FACING_NAME: Record<Facing, string> = {
  NE: 'North-East', E: 'East', N: 'North', NW: 'North-West',
  SE: 'South-East', W: 'West', S: 'South', SW: 'South-West',
}

const ADJ: Record<string, Facing> = { NE: 'NE', EN: 'NE', NW: 'NW', WN: 'NW', SE: 'SE', ES: 'SE', SW: 'SW', WS: 'SW' }
const DIR_WORD: Record<string, Dir> = { north: 'N', south: 'S', east: 'E', west: 'W' }

function roadWidth(text: string): number | null {
  const m = text.match(/(\d{2})'/)
  if (m) return Number(m[1])
  if (/narrow/i.test(text)) return 15
  return null
}

function roadLabel(text: string, width: number | null): string {
  if (/krishna/i.test(text)) return 'Krishna Road'
  if (/narrow/i.test(text)) return 'Narrow road'
  return width ? `${width}' road` : 'Road (width not stated)'
}

function parseRoads(p: RawPlot): Road[] {
  const found = new Map<Dir, { text: string; width: number | null }>()
  for (const d of DIRS) {
    const cell = p.surroundings[d]
    if (/road/i.test(cell)) found.set(d, { text: cell, width: roadWidth(cell) })
  }
  // The surroundings column decides which sides are roads (it is more specific; in Block 41 the
  // approach column says "West" where the neighbours show the road is on the East). The approach
  // column only fills in a missing width, or supplies the sides if surroundings name no road at all.
  for (const m of p.approach.matchAll(/((\d{2})'\s*|Narrow\s+|Krishna\s+)?Road\s+on\s+(north|south|east|west)/gi)) {
    const side = DIR_WORD[m[3].toLowerCase()]
    const width = roadWidth(m[0])
    const cur = found.get(side)
    if (cur && cur.width == null && width != null) cur.width = width
    if (!cur && !Object.values(p.surroundings).some((v) => /road/i.test(v))) found.set(side, { text: m[0], width })
  }
  return DIRS.filter((d) => found.has(d)).map((d) => {
    const { text, width } = found.get(d)!
    return { side: d, width, label: roadLabel(text, width) }
  })
}

/**
 * One road side -> that direction. Adjacent road sides form a corner (N+E = NE, N+W = NW...);
 * with 3+ sides the best corner by vastu wins. Only opposite sides (N+S, E+W) fall back to the
 * better single direction.
 */
function facingOf(sides: Dir[]): Facing | null {
  if (!sides.length) return null
  const rank = (f: Facing) => VASTU_ORDER.indexOf(f)
  const corners = sides.flatMap((a) => sides.map((b) => ADJ[a + b]).filter(Boolean))
  const pool = corners.length ? corners : (sides as Facing[])
  return [...pool].sort((x, y) => rank(x) - rank(y))[0]
}

export const isCornerSides = (sides: Dir[]) => sides.some((a) => sides.some((b) => ADJ[a + b]))

function typeOf(unit: string): Plot['type'] {
  if (unit.startsWith('LIG')) return 'LIG'
  if (unit.startsWith('MIG')) return 'MIG'
  if (unit.startsWith('Pump')) return 'Pump House'
  return 'Autonagar'
}

function tagsOf(p: RawPlot, roads: Road[], type: Plot['type']): Tag[] {
  const t: Tag[] = []
  const all = Object.values(p.surroundings).join(' | ')
  const max = Math.max(0, ...roads.map((r) => r.width ?? 0))
  if (max >= 60) t.push({ key: 'road60', kind: 'good', label: "60' main road frontage" })
  else if (max >= 40) t.push({ key: 'road40', kind: 'good', label: "40' wide road frontage" })
  if (roads.length >= 3) t.push({ key: 'open3', kind: 'good', label: 'Open on 3 sides' })
  else if (roads.length === 2 && isCornerSides(roads.map((r) => r.side))) t.push({ key: 'corner', kind: 'good', label: 'Corner plot' })
  else if (roads.length === 2) t.push({ key: 'frontback', kind: 'good', label: 'Roads on two opposite sides' })
  if (/open space/i.test(all)) t.push({ key: 'openspace', kind: 'good', label: 'Next to open space' })
  if (/kalavedika/i.test(all)) t.push({ key: 'kalavedika', kind: 'good', label: 'Next to Ukku Kalavedika (community venue)' })
  if ((type === 'LIG' && p.area > 200) || (type === 'MIG' && p.area > 350)) t.push({ key: 'large', kind: 'good', label: `Larger than typical ${type}` })
  if (/drain/i.test(all)) t.push({ key: 'drain', kind: 'bad', label: /canal/i.test(all) ? 'Drainage canal alongside' : 'Drain alongside' })
  if (/pump house/i.test(all)) t.push({ key: 'pump', kind: 'bad', label: 'Next to pump house' })
  if (/water tank/i.test(all)) t.push({ key: 'tank', kind: 'bad', label: 'Next to water tank' })
  if (/stair ?case/i.test(all)) t.push({ key: 'stair', kind: 'bad', label: 'Next to a staircase' })
  if (roads.some((r) => r.width != null && r.width < 24) && /narrow/i.test(all + p.approach)) t.push({ key: 'narrow', kind: 'bad', label: 'Narrow road on one side' })
  else if (max > 0 && max <= 24) t.push({ key: 'narrow', kind: 'bad', label: "Only 24' (or narrower) road access" })
  if (roads.some((r) => r.width == null)) t.push({ key: 'unknownroad', kind: 'info', label: 'Road width not stated on a side' })
  if (/industrial/i.test(p.landUse)) t.push({ key: 'industrial', kind: 'bad', label: 'Industrial land use (VMRDA Master Plan 2041)' })
  if (type === 'LIG' && p.area < 135) t.push({ key: 'small', kind: 'bad', label: 'Smaller than typical LIG' })
  if (p.conflicts.length) t.push({ key: 'conflict', kind: 'bad', label: 'PDFs disagree, verify' })
  const approachSides = [...p.approach.matchAll(/on\s+(north|south|east|west)/gi)].map((m) => DIR_WORD[m[1].toLowerCase()])
  const wrong = approachSides.filter((d) => !roads.some((r) => r.side === d))
  if (wrong.length)
    t.push({
      key: 'approachmismatch',
      kind: 'bad',
      label: `RFP approach says road on ${wrong.map((d) => DIR_NAME[d]).join('/')}, but the neighbours listed show it on ${roads.map((r) => DIR_NAME[r.side]).join('/')}. Verify the facing on site`,
    })
  if (/mmtc/i.test(all)) t.push({ key: 'mmtc', kind: 'info', label: 'Adjoins MMTC Colony' })
  if (/dci/i.test(all)) t.push({ key: 'dci', kind: 'info', label: 'Adjoins DCI Ltd office' })
  if (/private (property|land)/i.test(all)) t.push({ key: 'private', kind: 'info', label: 'Adjoins private property' })
  if (/apiic/i.test(all)) t.push({ key: 'apiic', kind: 'info', label: 'Bounded by APIIC limits' })
  return t
}

function roadClassOf(max: number): Plot['roadClass'] {
  if (max >= 60) return 'Arterial 60ft'
  if (max >= 40) return 'Wide 40ft'
  if (max >= 30) return 'Standard 30ft'
  if (max > 0) return 'Narrow ≤24ft'
  return 'Unspecified'
}

function derive(p: RawPlot): Plot {
  const type = typeOf(p.unit)
  const roads = parseRoads(p)
  const facing = facingOf(roads.map((r) => r.side))
  const maxRoad = Math.max(0, ...roads.map((r) => r.width ?? 0))
  const sqft = Math.round(p.area * 9)
  const front = Math.round(Math.sqrt(sqft / 1.47))
  const tags = tagsOf(p, roads, type)
  return {
    ...p,
    type,
    zone: type === 'Autonagar' ? 'Autonagar' : 'HB Colony',
    roads,
    roadSides: roads.length,
    isCorner: isCornerSides(roads.map((r) => r.side)),
    facing,
    vastuRank: facing ? VASTU_ORDER.indexOf(facing) + 1 : 9,
    maxRoad,
    roadClass: roadClassOf(maxRoad),
    sqft,
    estDims: { front, depth: Math.round(sqft / front) },
    tags,
    mapUrl: p.coords ? `https://www.google.com/maps?q=${p.coords[0]},${p.coords[1]}` : null,
    searchText: [p.unit, p.unit.replace('-', ''), `block ${p.block}`, type, facing ?? '', ...Object.values(p.surroundings), p.approach, ...tags.map((x) => x.label)]
      .join(' | ')
      .toLowerCase(),
  }
}

export const PLOTS: Plot[] = (raw as RawPlot[]).map(derive)
export const PLOT_BY_ID = new Map(PLOTS.map((p) => [p.id, p]))
export const BLOCKS: string[] = [...new Set(PLOTS.map((p) => p.block))].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b, undefined, { numeric: true }))

// ------------------------------------------------------------------ scoring
export const DEFAULT_WEIGHTS: Weights = { vastu: 30, corner: 20, road: 15, value: 20, area: 5, features: 10 }

const ROAD_SCORE = (w: number) => (w >= 60 ? 1 : w >= 40 ? 0.8 : w >= 30 ? 0.6 : w >= 24 ? 0.35 : w > 0 ? 0.2 : 0.3)

const zoneStats = (() => {
  const s: Record<string, { minRate: number; maxRate: number; minArea: number; maxArea: number }> = {}
  for (const p of PLOTS) {
    const z = (s[p.zone] ??= { minRate: Infinity, maxRate: -Infinity, minArea: Infinity, maxArea: -Infinity })
    z.minRate = Math.min(z.minRate, p.rate); z.maxRate = Math.max(z.maxRate, p.rate)
    z.minArea = Math.min(z.minArea, p.area); z.maxArea = Math.max(z.maxArea, p.area)
  }
  return s
})()

/** Each factor on a 0–1 scale; value and area are relative to plots in the same zone. */
export function factors(p: Plot): Record<keyof Weights, number> {
  const z = zoneStats[p.zone]
  const good = p.tags.filter((t) => t.kind === 'good' && t.key !== 'corner' && t.key !== 'open3' && t.key !== 'frontback' && !t.key.startsWith('road')).length
  const bad = p.tags.filter((t) => t.kind === 'bad' && t.key !== 'narrow').length
  return {
    vastu: p.facing ? (8 - p.vastuRank) / 7 : 0,
    corner: p.roadSides >= 3 ? 1 : p.isCorner ? 0.75 : p.roadSides === 2 ? 0.4 : 0,
    road: ROAD_SCORE(p.maxRoad),
    value: z.maxRate > z.minRate ? 1 - (p.rate - z.minRate) / (z.maxRate - z.minRate) : 0.5,
    area: z.maxArea > z.minArea ? (p.area - z.minArea) / (z.maxArea - z.minArea) : 0.5,
    features: Math.max(0, Math.min(1, 0.5 + 0.25 * good - 0.2 * bad)),
  }
}

export function score(p: Plot, w: Weights): number {
  const f = factors(p)
  const total = Object.values(w).reduce((a, b) => a + b, 0) || 1
  const s = (Object.keys(w) as (keyof Weights)[]).reduce((acc, k) => acc + f[k] * w[k], 0)
  return Math.round((s / total) * 100)
}

export const blockAvgRate: Record<string, number> = (() => {
  const acc: Record<string, [number, number]> = {}
  for (const p of PLOTS) {
    const a = (acc[p.block] ??= [0, 0])
    a[0] += p.rate; a[1]++
  }
  return Object.fromEntries(Object.entries(acc).map(([k, [s, n]]) => [k, s / n]))
})()
