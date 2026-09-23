import type { MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useEmi, usePreview, useShortlist } from '../hooks/useApp'
import { blockLabel, num, short } from '../lib/format'
import type { Plot } from '../lib/types'
import { Badge, FacingBadge, Icon } from './ui'

export default function PlotCard({ plot, score, rank }: { plot: Plot; score?: number; rank?: number }) {
  const { has, toggle } = useShortlist()
  const { open } = usePreview()
  const { emiFor, cappedFor, hint } = useEmi()
  const emi = emiFor(plot)
  const capped = cappedFor(plot)
  const starred = has(plot.id)
  const good = plot.tags.filter((t) => t.kind === 'good' && !['corner', 'open3', 'frontback', 'road60', 'road40'].includes(t.key))
  const bad = plot.tags.filter((t) => t.kind === 'bad')
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-teal-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-600">
      <Link to={`/plot/${plot.id}`} onClick={previewClick(() => open(plot.id))} className="block p-3.5 pr-14">
        <div className="flex items-baseline gap-2">
          {rank ? <span className="text-xs font-bold text-slate-400">#{rank}</span> : null}
          <h3 className="text-lg font-bold leading-tight">{plot.unit}</h3>
          <span className="text-sm text-slate-500 dark:text-slate-400">{blockLabel(plot.block)}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-sm">
          <span className="font-semibold tabular-nums">{short(plot.reservePrice)}</span>
          <span className="tabular-nums text-slate-600 dark:text-slate-300">₹{num(plot.rate, 0)}/sq.yd</span>
          <span className="tabular-nums text-slate-600 dark:text-slate-300">{num(plot.area)} sq.yd</span>
          <span className="tabular-nums text-teal-700 dark:text-teal-300" title={`EMI at reserve price: ${hint}`}>
            {emi ? <>EMI <b>{short(emi)}</b>/mo{capped ? <span className="text-xs text-slate-500 dark:text-slate-400"> · income max</span> : null}</> : 'No loan on your income'}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <FacingBadge facing={plot.facing} rank={plot.vastuRank <= 8 ? plot.vastuRank : undefined} />
          {plot.roadSides >= 2 ? <Badge tone="violet">{plot.roadSides >= 3 ? '3-side open' : plot.isCorner ? 'Corner' : 'Front & back roads'}</Badge> : null}
          {plot.maxRoad ? <Badge tone={plot.maxRoad >= 60 ? 'teal' : plot.maxRoad >= 40 ? 'sky' : 'slate'}>{plot.maxRoad}′ road</Badge> : <Badge>Road width n/a</Badge>}
          <Badge tone={plot.day === 1 ? 'sky' : 'amber'}>{plot.day === 1 ? '12 Oct' : '16 Oct'}</Badge>
          {good.length ? <Badge tone="emerald">＋{good.length} feature{good.length > 1 ? 's' : ''}</Badge> : null}
          {bad.length ? <Badge tone="rose">−{bad.length} concern{bad.length > 1 ? 's' : ''}</Badge> : null}
        </div>
      </Link>
      <div className="absolute right-2 top-2 flex flex-col items-center">
        <button
          type="button"
          onClick={() => toggle(plot.id)}
          className={`grid h-11 w-11 place-items-center rounded-full ${starred ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
          aria-label={starred ? `Remove ${plot.unit} from shortlist` : `Add ${plot.unit} to shortlist`}
          aria-pressed={starred}
        >
          <Icon name="star" solid={starred} />
        </button>
        {score != null ? (
          <span className="text-center text-xs font-bold tabular-nums text-teal-700 dark:text-teal-300" title="Overall score (Compare weights)">
            {score}
          </span>
        ) : null}
      </div>
    </div>
  )
}

/** Plain clicks open the quick-look sheet; ctrl/cmd/middle clicks still open the full page. */
export const previewClick = (open: () => void) => (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  open()
}
