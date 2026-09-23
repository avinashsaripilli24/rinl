import type { KeyboardEvent } from 'react'
import { DIR_NAME, neighbourParts } from '../lib/derive'
import type { Dir, Plot } from '../lib/types'

const S = 320 // viewBox size
const BAND = 62 // space reserved on each side for a road or neighbour label

/** Primary frontage: the first road named in the approach column, else the first road. */
function frontSide(p: Plot): Dir | null {
  const m = p.approach.match(/on\s+(north|south|east|west)/i)
  if (m) return m[1][0].toUpperCase() as Dir
  return p.roads[0]?.side ?? null
}

function short(s: string, n = 24) {
  const t = s.replace(/^Plot\s+/i, '')
  return t.length > n ? t.slice(0, n - 1) + '…' : t
}

/** `onPlot`, when given, makes neighbour labels that name an auction plot tappable. */
export default function SiteSketch({ plot, onPlot }: { plot: Plot; onPlot?: (id: string) => void }) {
  const front = frontSide(plot)
  const horizontalFront = front === 'N' || front === 'S'
  const inner = S - BAND * 2 // 196
  const ratio = plot.estDims.depth / plot.estDims.front // ~1.47
  const long = inner
  const shortSide = Math.round(inner / ratio)
  const w = horizontalFront ? shortSide : long
  const h = horizontalFront ? long : shortSide
  const x = (S - w) / 2
  const y = (S - h) / 2

  const roadBySide = new Map(plot.roads.map((r) => [r.side, r]))
  const thick = (width: number | null) => Math.max(12, Math.min(44, ((width ?? 20) / 60) * 44))

  const sides: { d: Dir; rect: [number, number, number, number]; tx: number; ty: number; rot: number }[] = []
  for (const d of ['N', 'S', 'E', 'W'] as Dir[]) {
    const r = roadBySide.get(d)
    const t = thick(r?.width ?? null)
    const gap = 6
    if (d === 'N') sides.push({ d, rect: [0, y - gap - t, S, t], tx: S / 2, ty: y - gap - (r ? t / 2 : 14), rot: 0 })
    if (d === 'S') sides.push({ d, rect: [0, y + h + gap, S, t], tx: S / 2, ty: y + h + gap + (r ? t / 2 : 14), rot: 0 })
    if (d === 'W') sides.push({ d, rect: [x - gap - t, 0, t, S], tx: x - gap - (r ? t / 2 : 14), ty: S / 2, rot: -90 })
    if (d === 'E') sides.push({ d, rect: [x + w + gap, 0, t, S], tx: x + w + gap + (r ? t / 2 : 14), ty: S / 2, rot: 90 })
  }

  return (
    <figure>
      <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-sm" role="img" aria-label={`Site sketch of ${plot.unit}`}>
        {sides.map(({ d, rect, tx, ty, rot }) => {
          const r = roadBySide.get(d)
          const label = r ? r.label : short(plot.surroundings[d])
          const link = !r && onPlot ? neighbourParts(plot.surroundings[d]).find((x) => x.id) : undefined
          return (
            <g key={d}>
              {r ? (
                <>
                  <rect x={rect[0]} y={rect[1]} width={rect[2]} height={rect[3]} className="fill-slate-300 dark:fill-slate-700" />
                  {/* centre line */}
                  {d === 'N' || d === 'S' ? (
                    <line x1={0} x2={S} y1={rect[1] + rect[3] / 2} y2={rect[1] + rect[3] / 2} strokeDasharray="8 7" strokeWidth={1.5} className="stroke-white/80 dark:stroke-slate-400/60" />
                  ) : (
                    <line y1={0} y2={S} x1={rect[0] + rect[2] / 2} x2={rect[0] + rect[2] / 2} strokeDasharray="8 7" strokeWidth={1.5} className="stroke-white/80 dark:stroke-slate-400/60" />
                  )}
                </>
              ) : null}
              <text
                x={tx}
                y={ty}
                transform={rot ? `rotate(${rot} ${tx} ${ty})` : undefined}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-[11px] ${r ? 'fill-slate-900 font-semibold dark:fill-white' : link ? 'cursor-pointer fill-teal-700 font-semibold underline dark:fill-teal-400' : 'fill-slate-500 dark:fill-slate-400'}`}
                paintOrder="stroke"
                {...(link
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      'aria-label': `Quick look at ${link.unit}`,
                      onClick: () => onPlot!(link.id!),
                      onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onPlot!(link.id!)),
                    }
                  : {})}
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* the plot */}
        <rect x={x} y={y} width={w} height={h} rx={4} className="fill-teal-500/15 stroke-teal-600 dark:fill-teal-400/15 dark:stroke-teal-400" strokeWidth={2} />
        {front ? (
          <line
            x1={front === 'E' ? x + w : x}
            x2={front === 'W' ? x : x + w}
            y1={front === 'S' ? y + h : y}
            y2={front === 'N' ? y : y + h}
            strokeWidth={5}
            strokeLinecap="round"
            className="stroke-teal-600 dark:stroke-teal-400"
          />
        ) : null}
        <text x={S / 2} y={S / 2 - 8} textAnchor="middle" className="fill-slate-900 text-[15px] font-bold dark:fill-white">
          {plot.unit}
        </text>
        <text x={S / 2} y={S / 2 + 10} textAnchor="middle" className="fill-slate-600 text-[11px] dark:fill-slate-300">
          {plot.area} sq.yd
        </text>
        <text x={S / 2} y={S / 2 + 25} textAnchor="middle" className="fill-slate-500 text-[10px] dark:fill-slate-400">
          ≈ {plot.estDims.front}′ × {plot.estDims.depth}′ (est.)
        </text>

        {/* compass */}
        <g transform={`translate(${S - 22} 22)`}>
          <circle r={15} className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600" />
          <path d="M0 -11 L4 2 L0 0 L-4 2 Z" className="fill-rose-500" />
          <text y={11} textAnchor="middle" className="fill-slate-700 text-[8px] font-bold dark:fill-slate-200">N</text>
        </g>
      </svg>
      <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
        Grey bands are roads, drawn thicker for wider roads. The thick teal edge is the main frontage
        {front ? ` (${DIR_NAME[front]})` : ''}.{onPlot ? ' Tap a neighbouring plot for a quick look.' : ''} Not to scale.
      </figcaption>
    </figure>
  )
}
