import { Link, useNavigate, useParams } from 'react-router-dom'
import MoneyCalc from '../components/MoneyCalc'
import SiteSketch from '../components/SiteSketch'
import { Badge, Card, FacingBadge, Icon, Section, Stat, TagPill } from '../components/ui'
import { useShortlist, useWeights } from '../hooks/useApp'
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
  return <Detail plot={plot} onBack={() => (history.length > 1 ? navigate(-1) : navigate('/'))} />
}

function Detail({ plot, onBack }: { plot: Plot; onBack: () => void }) {
  const { has, toggle } = useShortlist()
  const { weights } = useWeights()
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
            {blockLabel(plot.block)} · {plot.zone === 'HB Colony' ? 'HB Colony, Maddilapalem' : 'Autonagar, Gajuwaka'} · {plot.landUse}
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

      <Card className="p-4">
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
            {plot.coords[0].toFixed(5)}, {plot.coords[1].toFixed(5)} · the pin marks the block, not this exact plot
          </p>
        ) : null}
      </Card>

      <Section title="Site & surroundings">
        <SiteSketch plot={plot} />
        <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(['N', 'E', 'S', 'W'] as Dir[]).map((d) => {
            const road = plot.roads.find((r) => r.side === d)
            return (
              <div key={d} className={`flex items-start gap-3 rounded-xl p-2.5 ${road ? 'bg-slate-100 dark:bg-slate-800/70' : 'border border-slate-200 dark:border-slate-800'}`}>
                <dt className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-sm font-bold shadow-sm dark:bg-slate-900">{d}</dt>
                <dd className="min-w-0">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{DIR_NAME[d]}</div>
                  <div className="text-sm font-medium">{plot.surroundings[d]}</div>
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

      <Section title="Vastu & placement">
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
              ['Value (₹/sq.yd vs zone)', f.value],
              ['Area vs zone', f.area],
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

      <Section title="Highlights & concerns">
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

      <MoneyCalc plot={plot} />

      {siblings.length ? (
        <Section title={`Other plots in ${blockLabel(plot.block)} (${siblings.length})`}>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <Link
                key={s.id}
                to={`/plot/${s.id}`}
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
    </article>
  )
}
