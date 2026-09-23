import { PLOTS, PLOT_BY_ID, neighbours } from './derive'
import type { Dir, Plot } from './types'

/**
 * Approximate plot layout for a block. The PDFs give one GPS point per block, but every plot names its
 * N/S/E/W neighbours, so we walk those links to place plots on a grid (x grows east, y grows north).
 * Positions are schematic: good enough to see which plot sits where, not a survey.
 */
export interface BlockLayout {
  cells: Map<string, { x: number; y: number }>
  /** cell size in metres */
  cellW: number
  cellH: number
}

const STEP: Record<Dir, [number, number]> = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] }
const OPP: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' }
const FT = 0.3048

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)] ?? 0
}

const cache = new Map<string, BlockLayout>()

export function blockLayout(block: string): BlockLayout {
  const hit = cache.get(block)
  if (hit) return hit
  const plots = PLOTS.filter((p) => p.block === block)
  const inBlock = new Set(plots.map((p) => p.id))

  // links in both directions, so a plot that is only named by its neighbour still connects
  const adj = new Map<string, { side: Dir; id: string }[]>(plots.map((p) => [p.id, []]))
  let northSouth = 0
  for (const p of plots)
    for (const n of neighbours(p)) {
      if (!inBlock.has(n.id)) continue
      northSouth += n.side === 'N' || n.side === 'S' ? 1 : -1
      adj.get(p.id)!.push(n)
      adj.get(n.id)!.push({ side: OPP[n.side], id: p.id })
    }

  // corners first: they sit at the edge of a row, which makes a steadier anchor
  const order = [...plots].sort((a, b) => b.roadSides - a.roadSides || a.sl - b.sl)
  const cells = new Map<string, { x: number; y: number }>()
  let offsetX = 0
  for (const seed of order) {
    if (cells.has(seed.id)) continue
    const comp = new Map<string, { x: number; y: number }>([[seed.id, { x: 0, y: 0 }]])
    const taken = new Set(['0,0'])
    const queue = [seed.id]
    while (queue.length) {
      const id = queue.shift()!
      const at = comp.get(id)!
      for (const n of adj.get(id)!) {
        if (comp.has(n.id)) continue
        const [dx, dy] = STEP[n.side]
        let x = at.x + dx
        let y = at.y + dy
        while (taken.has(`${x},${y}`)) {
          x += dx
          y += dy
        }
        comp.set(n.id, { x, y })
        taken.add(`${x},${y}`)
        queue.push(n.id)
      }
    }
    // place each separate group to the right of the previous one, one cell apart
    const xs = [...comp.values()].map((c) => c.x)
    const minX = Math.min(...xs)
    for (const [id, c] of comp) cells.set(id, { x: c.x - minX + offsetX, y: c.y })
    offsetX += Math.max(...xs) - minX + 2
  }

  // plots share their long sides, so the frontage runs along the row: rows stacked north–south face east/west
  const front = median(plots.map((p) => p.estDims.front)) * FT
  const depth = median(plots.map((p) => p.estDims.depth)) * FT
  const layout = northSouth > 0 ? { cells, cellW: depth, cellH: front } : { cells, cellW: front, cellH: depth }
  cache.set(block, layout)
  return layout
}

/** Lat/lng rectangle for each plot in the block, with the layout centred on the block's pin. */
export function plotBounds(block: string, pin: [number, number]): { plot: Plot; bounds: [[number, number], [number, number]] }[] {
  const { cells, cellW, cellH } = blockLayout(block)
  if (!cells.size) return []
  const xs = [...cells.values()].map((c) => c.x)
  const ys = [...cells.values()].map((c) => c.y)
  const cx = (Math.min(...xs) + Math.max(...xs) + 1) / 2
  const cy = (Math.min(...ys) + Math.max(...ys) + 1) / 2
  const mLat = 1 / 111320
  const mLng = 1 / (111320 * Math.cos((pin[0] * Math.PI) / 180))
  return [...cells].map(([id, c]) => {
    const south = pin[0] + (c.y - cy) * cellH * mLat
    const west = pin[1] + (c.x - cx) * cellW * mLng
    return {
      plot: PLOT_BY_ID.get(id)!,
      bounds: [
        [south, west],
        [south + cellH * mLat, west + cellW * mLng],
      ],
    }
  })
}
