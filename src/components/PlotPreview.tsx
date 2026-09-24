import { useEffect, useRef, useState, type RefObject } from 'react'
import { openSettings, useLoanProfile, usePreview, useShortlist, useStampPct, useWeights } from '../hooks/useApp'
import { allInFactor } from '../lib/afford'
import { DIR_NAME, PLOT_BY_ID, blockAvgRate, neighbours, score } from '../lib/derive'
import { blockLabel, num, rupees, short } from '../lib/format'
import { ownFundsAt } from '../lib/loan'
import type { Plot } from '../lib/types'
import PlotNote from './PlotNote'
import SiteSketch from './SiteSketch'
import { Badge, FacingBadge, Icon, Stat, TagPill } from './ui'

/** Bottom sheet with the essentials of a plot; "View full details" goes to the plot page. */
export default function PlotPreview() {
  const { id, open, close, openFull } = usePreview()
  const plot = id ? PLOT_BY_ID.get(id) : undefined
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!plot) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    scroller.current?.scrollTo(0, 0)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [plot, close])

  if (!plot) return null

  // swipe down to dismiss, but only while the content is scrolled to the top
  const onStart = (y: number) => {
    start.current = (scroller.current?.scrollTop ?? 0) <= 0 ? y : null
  }
  const onMove = (y: number) => {
    if ((scroller.current?.scrollTop ?? 0) > 0) start.current = null
    if (start.current != null) setDrag(Math.max(0, y - start.current))
  }
  const onEnd = () => {
    if (drag > 110) close()
    setDrag(0)
    start.current = null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`${plot.unit} preview`}>
      <button className="absolute inset-0 bg-slate-950/50" aria-label="Close preview" onClick={close} />
      <div
        className="relative flex max-h-[85dvh] w-full max-w-2xl flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-slate-900"
        style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: drag ? 'none' : 'transform .2s' }}
        onTouchStart={(e) => onStart(e.touches[0].clientY)}
        onTouchMove={(e) => onMove(e.touches[0].clientY)}
        onTouchEnd={onEnd}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700" aria-hidden />
        <Body plot={plot} scroller={scroller} onClose={close} onFull={() => openFull(plot.id)} onPlot={open} />
      </div>
    </div>
  )
}

function Body({ plot, scroller, onClose, onFull, onPlot }: { plot: Plot; scroller: RefObject<HTMLDivElement | null>; onClose: () => void; onFull: () => void; onPlot: (id: string) => void }) {
  const { has, toggle } = useShortlist()
  const { weights } = useWeights()
  const [stampPct] = useStampPct()
  const { profile } = useLoanProfile()
  const starred = has(plot.id)
  const avg = blockAvgRate[plot.block]
  const vsAvg = ((plot.rate - avg) / avg) * 100
  const { lp } = ownFundsAt(plot, plot.rate, stampPct, profile)
  const income = profile.netMonthlyIncome + profile.coApplicantIncome
  const fits = profile.savings ? lp.ownFunds <= profile.savings : null
  const nextDoor = neighbours(plot)

  return (
    <>
      <div className="flex items-start gap-2 px-4 pb-2 pt-1">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold leading-tight">{plot.unit}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {blockLabel(plot.block)} · {plot.day === 1 ? '12 Oct' : '16 Oct'}
          </p>
        </div>
        <button
          onClick={() => toggle(plot.id)}
          className={`grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 ${starred ? 'text-amber-500' : 'text-slate-500'}`}
          aria-label={starred ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-pressed={starred}
        >
          <Icon name="star" solid={starred} />
        </button>
        <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
          <Icon name="x" />
        </button>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-3">
        <div className="flex flex-wrap gap-1.5">
          <FacingBadge facing={plot.facing} rank={plot.vastuRank <= 8 ? plot.vastuRank : undefined} />
          {plot.roadSides >= 2 ? <Badge tone="violet">{plot.roadSides >= 3 ? '3-side open' : plot.isCorner ? 'Corner' : 'Front & back roads'}</Badge> : <Badge>Single road</Badge>}
          {plot.maxRoad ? <Badge tone={plot.maxRoad >= 60 ? 'teal' : plot.maxRoad >= 40 ? 'sky' : 'slate'}>{plot.maxRoad}′ road</Badge> : null}
          <Badge tone="teal">Score {score(plot, weights)}</Badge>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Stat label="Reserve price" value={short(plot.reservePrice)} />
          <Stat label="Rate" value={`₹${num(plot.rate, 0)}`} sub={`${vsAvg >= 0 ? '+' : ''}${vsAvg.toFixed(1)}% vs block`} />
          <Stat label="Area" value={`${num(plot.area)} sq.yd`} sub={`${num(plot.sqft, 0)} sq.ft`} />
          <Stat label="Size (est.)" value={`${plot.estDims.front}′×${plot.estDims.depth}′`} />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-800/50">
          <div>
            <div className="text-slate-500 dark:text-slate-400">All-in at reserve</div>
            <div className="text-sm font-semibold tabular-nums">{short(plot.reservePrice * allInFactor(stampPct))}</div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400">Own funds (loan)</div>
            <div className={`text-sm font-semibold tabular-nums ${fits === false ? 'text-rose-600 dark:text-rose-400' : ''}`}>{short(lp.ownFunds)}</div>
          </div>
          <div>
            <div className="text-slate-500 dark:text-slate-400">EMI</div>
            <div className="text-sm font-semibold tabular-nums">{lp.emi ? `${rupees(lp.emi)}` : '–'}</div>
          </div>
          <p className="col-span-3 text-slate-500 dark:text-slate-400">
            {fits == null ? (
              <button type="button" onClick={() => openSettings('profile')} className="font-semibold text-teal-700 underline dark:text-teal-400">
                {income ? 'Add your savings' : 'Add income & savings'} to check if this fits
              </button>
            ) : fits ? (
              <span className="text-emerald-700 dark:text-emerald-400">✓ Fits your savings with {short(profile.savings - lp.ownFunds)} to spare at reserve.</span>
            ) : (
              <span className="text-rose-700 dark:text-rose-400">Needs {short(lp.ownFunds - profile.savings)} more than your savings at reserve.</span>
            )}
          </p>
        </div>

        <div className="mt-3">
          <PlotNote key={plot.id} id={plot.id} unit={plot.unit} compact />
        </div>

        {plot.tags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[...plot.tags].sort((a, b) => ['good', 'bad', 'info'].indexOf(a.kind) - ['good', 'bad', 'info'].indexOf(b.kind)).map((t) => <TagPill key={t.key} tag={t} />)}
          </div>
        ) : null}

        <div className="mx-auto mt-3 max-w-xs">
          <SiteSketch plot={plot} onPlot={onPlot} />
        </div>

        {nextDoor.length ? (
          <div className="mt-3">
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Next door</div>
            <div className="flex flex-wrap gap-2">
              {nextDoor.map(({ side, id: nid }) => {
                const n = PLOT_BY_ID.get(nid)!
                return (
                  <button
                    key={nid}
                    type="button"
                    onClick={() => onPlot(nid)}
                    className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-left text-sm hover:border-teal-500 dark:border-slate-700"
                    aria-label={`Quick look at ${n.unit}, ${DIR_NAME[side]} side`}
                  >
                    <span className="text-xs text-slate-500 dark:text-slate-400">{side} · </span>
                    <b>{n.unit}</b> <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{short(n.reservePrice)} · {n.facing ?? '–'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="pb-safe flex gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
        {plot.mapUrl ? (
          <a href={plot.mapUrl} target="_blank" rel="noreferrer" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-300 dark:border-slate-700" aria-label="Open in Google Maps">
            <Icon name="pin" />
          </a>
        ) : null}
        <button type="button" onClick={onFull} className="h-12 flex-1 rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-700">
          View full details
        </button>
      </div>
    </>
  )
}
