import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import BidSimulator, { BidBar } from '../components/BidSimulator'
import MoneyCalc from '../components/MoneyCalc'
import NeighbourText from '../components/NeighbourText'
import { previewClick } from '../components/PlotCard'
import SiteSketch from '../components/SiteSketch'
import { Badge, Card, FacingBadge, Icon, Section, Stat, TagPill } from '../components/ui'
import { usePreview, useShortlist, useWeights } from '../hooks/useApp'
import { useBidPlan } from '../hooks/useBidPlan'
import { DIR_NAME, FACING_NAME, PLOTS, PLOT_BY_ID, VASTU_ORDER, blockAvgRate, factors, score } from '../lib/derive'
import { blockLabel, fmtDate, num, parseDmy, rupees, short } from '../lib/format'
import type { Dir, Plot } from '../lib/types'

const VASTU_NOTE: Record<string, string> = {
  NE: 'Most preferred in your vastu order: roads on the North and East.',
  E: 'Second in your vastu order. East-facing main entrance.',
  N: 'Third in your vastu order. North-facing main entrance.',
  NW: 'Fourth in your vastu order: roads on the North and West.',
  SE: 'Fifth in your vastu order: roads on the South and East.',
  W: 'Sixth in your vastu order. West-facing main entrance.',
  S: 'Seventh (last) in your vastu order. South-facing main entrance.',
  SW: 'Not in your preferred list: roads on the South and West.',
}

const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'bid', label: 'Bid simulator' },
  { id: 'site', label: 'Site' },
  { id: 'vastu', label: 'Vastu' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'costs', label: 'Costs' },
  { id: 'loan', label: 'Loan' },
  { id: 'cash', label: 'Cash plan' },
  { id: 'block', label: 'Same block' },
]

export default function PlotDetail() {
  const { id = '' } = useParams()
  const plot = PLOT_BY_ID.get(id)
  const navigate = useNavigate()
  if (!plot) {
    return (
      <div className="mt-10 text-center">
        <p className="font-semibold">Plot not found.</p>
        <Link to="/" className="mt-3 inline-block font-semibold text-teal-700 underline dark:text-teal-400">Back to all plots</Link>
      </div>
    )
  }
  return <Detail key={plot.id} plot={plot} onBack={() => (history.length > 1 ? navigate(-1) : navigate('/'))} />
}

function Detail({ plot, onBack }: { plot: Plot; onBack: () => void }) {
  const { has, toggle } = useShortlist()
  const { weights } = useWeights()
  const { open } = usePreview()
  const plan = useBidPlan(plot)
  const starred = has(plot.id)
  const avg = blockAvgRate[plot.block]
  const vsAvg = ((plot.rate - avg) / avg) * 100
  const f = factors(plot)
  const siblings = PLOTS.filter((p) => p.block === plot.block && p.id !== plot.id)

  const share = async () => {
    const url = location.href
    const text = `${plot.unit} (${blockLabel(plot.block)}), ${plot.area} sq.yd, reserve ${short(plot.reservePrice)}, ${plot.facing ?? ''} facing. RINL e-auction ${plot.auctionDate}`
    try {
      if (navigator.share) await navigator.share({ title: plot.unit, text, url })
      else await navigator.clipboard.writeText(`${text}\n${url}`)
    } catch {
      /* user cancelled */
    }
  }

  return (
    <article className="space-y-4">
      <div className="flex items-center gap-1">
        <button onClick={onBack} className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back">
          <Icon name="back" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight">{plot.unit}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {blockLabel(plot.block)} · HB Colony, Maddilapalem · {plot.landUse}
          </p>
        </div>
        <button onClick={share} className="grid h-11 w-11 place-items-center rounded-full text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Share">
          <Icon name="share" />
        </button>
        <button
          onClick={() => toggle(plot.id)}
          className={`grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 ${starred ? 'text-amber-500' : 'text-slate-500'}`}
          aria-label={starred ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-pressed={starred}
        >
          <Icon name="star" solid={starred} />
        </button>
      </div>

      {plot.conflicts.length ? (
        <div className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" role="note">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <b>The two PDFs disagree about this plot. The Main List is used here.</b>
            <ul className="mt-1 list-disc pl-4">
              {plot.conflicts.map((c) => <li key={c}>{c}</li>)}
            </ul>
          </div>
        </div>
      ) : null}

      <SectionNav sections={SECTIONS.filter((x) => x.id !== 'block' || siblings.length)} resetKey={plot.id} />

      <Card id="overview" className="scroll-mt-28 p-4">
        <div className="flex flex-wrap gap-1.5">
          <FacingBadge facing={plot.facing} rank={plot.vastuRank <= 8 ? plot.vastuRank : undefined} />
          {plot.roadSides >= 2 ? <Badge tone="violet">{plot.roadSides >= 3 ? '3-side open' : plot.isCorner ? 'Corner plot' : 'Front & back roads'}</Badge> : <Badge>Single road</Badge>}
          <Badge tone={plot.day === 1 ? 'sky' : 'amber'}>Auction {plot.day === 1 ? 'Day 1 · 12 Oct' : 'Day 2 · 16 Oct'}</Badge>
          <Badge tone="teal">Score {score(plot, weights)}/100</Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Stat label="Reserve price" value={short(plot.reservePrice)} sub={rupees(plot.reservePrice)} />
          <Stat label="Reserve rate" value={`₹${num(plot.rate, 0)}/sq.yd`} sub={`${vsAvg >= 0 ? '+' : ''}${vsAvg.toFixed(1)}% vs block avg`} />
          <Stat label="Area" value={`${num(plot.area)} sq.yd`} sub={`${num(plot.sqft, 0)} sq.ft · ${num(plot.area * 0.836127, 1)} m²`} />
          <Stat label="Size (est.)" value={`${plot.estDims.front}′ × ${plot.estDims.depth}′`} sub="Not published; estimated" />
          <Stat label="EMD" value={rupees(plot.emd)} sub={`by ${plot.emdLastDate}, 17:00`} />
          <Stat label="e-Auction" value={fmtDate(parseDmy(plot.auctionDate))} sub="11:00 to 19:00 + extensions" />
        </div>
        <button
          type="button"
          onClick={() => document.getElementById('bid')?.scrollIntoView({ behavior: 'smooth' })}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-xl border border-teal-300 bg-teal-50 p-3 text-left dark:border-teal-700 dark:bg-teal-500/10"
        >
          <span className="min-w-0">
            <span className="block text-xs text-teal-800 dark:text-teal-300">{plan.steps ? `Your bid · ₹${num(plan.rate, 0)}/sq.yd` : 'At reserve · simulate a higher bid'}</span>
            <span className="block text-base font-bold tabular-nums">
              {short(plan.m.value)} bid · {short(plan.m.total)} all-in
            </span>
            <span className="block text-xs text-slate-600 dark:text-slate-300">Your own money {short(plan.lp.ownFunds)}{plan.lp.emi ? ` · EMI ${rupees(plan.lp.emi)}/mo` : ''}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-teal-700 dark:text-teal-400">{plan.steps ? 'Adjust' : 'Simulate'}</span>
        </button>
        {plot.mapUrl ? (
          <a
            href={plot.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-700"
          >
            <Icon name="pin" /> Open in Google Maps
          </a>
        ) : null}
        {plot.coords ? (
          <p className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">
            {plot.coords[0].toFixed(5)}, {plot.coords[1].toFixed(5)} · the pin marks the block, not this exact plot ·{' '}
            <Link to={`/?view=map&focus=${encodeURIComponent(plot.block)}`} className="font-semibold text-teal-700 underline dark:text-teal-400">
              See the block on the map
            </Link>
          </p>
        ) : null}
      </Card>

      <BidSimulator plot={plot} plan={plan} />

      <Section id="site" title="Site & surroundings">
        <SiteSketch plot={plot} onPlot={open} />
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['N', 'E', 'S', 'W'] as Dir[]).map((d) => {
            const road = plot.roads.find((r) => r.side === d)
            return (
              <div key={d} className={`flex items-start gap-3 rounded-xl p-2.5 ${road ? 'bg-slate-100 dark:bg-slate-800/70' : 'border border-slate-200 dark:border-slate-800'}`}>
                <dt className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold shadow-sm dark:bg-slate-900">{d}</dt>
                <dd className="min-w-0">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{DIR_NAME[d]}</div>
                  <div className="text-sm font-medium"><NeighbourText text={plot.surroundings[d]} /></div>
                  {road ? <div className="text-xs text-teal-700 dark:text-teal-400">Road frontage · {road.label}</div> : null}
                </dd>
              </div>
            )
          })}
        </dl>
        <p className="mt-3 text-sm">
          <span className="text-slate-500 dark:text-slate-400">Approach road (RFP): </span>
          <b>{plot.approach}</b>
        </p>
      </Section>

      <Section id="vastu" title="Vastu & placement">
        {plot.facing ? (
          <>
            <p className="text-sm">
              <b>{FACING_NAME[plot.facing]}</b> ({plot.facing}), rank <b>#{plot.vastuRank}</b> of 8. {VASTU_NOTE[plot.facing]}
            </p>
            <div className="mt-3 flex gap-1" aria-label="Vastu order">
              {VASTU_ORDER.map((fc) => (
                <div
                  key={fc}
                  className={`flex-1 rounded-md py-1 text-center text-xs font-semibold ${fc === plot.facing ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}
                >
                  {fc}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm">No road side is recorded, so facing cannot be derived.</p>
        )}
        <ul className="mt-4 space-y-1.5 text-sm">
          <li>
            <b>{plot.roadSides}</b> side{plot.roadSides === 1 ? '' : 's'} on a road: {plot.roads.map((r) => `${DIR_NAME[r.side]} (${r.label})`).join(', ') || 'none recorded'}
          </li>
          <li>Widest road: <b>{plot.maxRoad ? `${plot.maxRoad} ft` : 'not stated'}</b> ({plot.roadClass})</li>
        </ul>
        <div className="mt-4 space-y-2">
          {(
            [
              ['Vastu', f.vastu],
              ['Corner / open sides', f.corner],
              ['Road width', f.road],
              ['Value (₹/sq.yd vs all plots)', f.value],
              ['Area vs all plots', f.area],
              ['Features − concerns', f.features],
            ] as const
          ).map(([l, v]) => (
            <div key={l} className="grid grid-cols-[9.5rem_1fr_2.5rem] items-center gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-300">{l}</span>
              <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.round(v * 100)}%` }} />
              </div>
              <span className="text-right tabular-nums">{Math.round(v * 100)}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="highlights" title="Highlights & concerns">
        {plot.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {[...plot.tags].sort((a, b) => ['good', 'bad', 'info'].indexOf(a.kind) - ['good', 'bad', 'info'].indexOf(b.kind)).map((t) => (
              <TagPill key={t.key} tag={t} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Nothing notable recorded.</p>
        )}
      </Section>

      <MoneyCalc plot={plot} plan={plan} />

      {siblings.length ? (
        <Section id="block" title={`Other plots in ${blockLabel(plot.block)} (${siblings.length})`}>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <Link
                key={s.id}
                to={`/plot/${s.id}`}
                onClick={previewClick(() => open(s.id))}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm hover:border-teal-500 dark:border-slate-700"
              >
                {s.unit} <span className="text-xs text-slate-500">{s.facing}</span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
        Source: Main List (Day {plot.listedInDayTable} table, Sl {plot.sl}) and RFP Annexure page {plot.rfpPage}. All details are indicative: verify on site and with RINL before bidding.
      </p>
      {/* room for the floating bid bar */}
      <div className="h-16" aria-hidden />
      <BidBar plan={plan} />
    </article>
  )
}

/** Sticky jump bar: tap to scroll to a section; the section in view stays highlighted. */
function SectionNav({ sections, resetKey }: { sections: { id: string; label: string }[]; resetKey: string }) {
  const [active, setActive] = useState(sections[0].id)
  const bar = useRef<HTMLDivElement>(null)
  const jumping = useRef(false)

  useEffect(() => {
    setActive(sections[0].id)
    const els = sections.map((x) => document.getElementById(x.id)).filter((el): el is HTMLElement => !!el)
    const onScroll = () => {
      if (jumping.current) return
      // the last section whose top has passed the bar; the final one wins at the bottom of the page
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4
      let cur = els[0]
      for (const el of els) if (el.getBoundingClientRect().top <= 140) cur = el
      setActive((atEnd ? els[els.length - 1] : cur).id)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [resetKey, sections.length])

  // keep the highlighted chip visible inside the horizontally scrolling bar
  useEffect(() => {
    const chip = bar.current?.querySelector<HTMLElement>(`[data-id="${active}"]`)
    if (chip && bar.current) bar.current.scrollTo({ left: chip.offsetLeft - bar.current.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' })
  }, [active])

  const jump = (id: string) => {
    setActive(id)
    jumping.current = true
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => (jumping.current = false), 700)
  }

  return (
    <nav aria-label="Sections" className="sticky top-[52px] z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div ref={bar} className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 py-2">
        {sections.map((x) => (
          <button
            key={x.id}
            data-id={x.id}
            type="button"
            onClick={() => jump(x.id)}
            aria-current={active === x.id ? 'true' : undefined}
            className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-medium transition ${
              active === x.id
                ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:text-slate-900 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-800 dark:hover:text-white'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
