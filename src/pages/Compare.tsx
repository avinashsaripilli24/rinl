import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PlotCard from '../components/PlotCard'
import { Chip, FacingBadge, Icon, Section } from '../components/ui'
import { useLoanProfile, useShortlist, useStampPct, useWeights } from '../hooks/useApp'
import { PLOTS, PLOT_BY_ID, score } from '../lib/derive'
import { blockLabel, num, short } from '../lib/format'
import { ownFundsAt } from '../lib/loan'
import { EMD } from '../lib/money'
import type { Plot, PlotType, Weights } from '../lib/types'

const WEIGHT_LABELS: Record<keyof Weights, string> = {
  vastu: 'Vastu facing',
  corner: 'Corner / open sides',
  road: 'Road width',
  value: 'Value (lower ₹/sq.yd)',
  area: 'Bigger area',
  features: 'Features vs concerns',
}

function WeightsPanel() {
  const { weights, setWeights, reset } = useWeights()
  const [open, setOpen] = useState(false)
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  return (
    <Section
      title="What matters to you"
      right={
        <button onClick={() => setOpen((o) => !o)} className="h-9 rounded-lg px-2 text-sm font-semibold text-teal-700 dark:text-teal-400" aria-expanded={open}>
          {open ? 'Hide' : 'Adjust weights'}
        </button>
      }
    >
      {!open ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {(Object.keys(weights) as (keyof Weights)[])
            .filter((k) => weights[k] > 0)
            .map((k) => `${WEIGHT_LABELS[k]} ${Math.round((weights[k] / total) * 100)}%`)
            .join(' · ')}
        </p>
      ) : (
        <div className="space-y-3">
          {(Object.keys(WEIGHT_LABELS) as (keyof Weights)[]).map((k) => (
            <label key={k} className="block">
              <div className="flex justify-between text-sm">
                <span>{WEIGHT_LABELS[k]}</span>
                <span className="tabular-nums text-slate-500">{Math.round((weights[k] / total) * 100)}%</span>
              </div>
              <input type="range" min={0} max={50} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} className="h-8 w-full" />
            </label>
          ))}
          <button onClick={reset} className="text-sm font-semibold text-teal-700 underline dark:text-teal-400">Reset to defaults</button>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Vastu uses your order NE › E › N › NW › SE › W › S. Value and area are compared within the same zone (HB Colony or Autonagar).
          </p>
        </div>
      )}
    </Section>
  )
}

type Row = { label: string; get: (p: Plot) => ReactNode; best?: (ps: Plot[]) => (p: Plot) => boolean }
const bestBy = (fn: (p: Plot) => number, dir: 'max' | 'min') => (ps: Plot[]) => {
  const vals = ps.map(fn)
  const target = dir === 'max' ? Math.max(...vals) : Math.min(...vals)
  return (p: Plot) => ps.length > 1 && fn(p) === target
}

function ShortlistTable({ plots, weights, stampPct }: { plots: Plot[]; weights: Weights; stampPct: number }) {
  const { toggle } = useShortlist()
  const { profile } = useLoanProfile()
  const loan = (p: Plot) => ownFundsAt(p, p.rate, stampPct, profile).lp
  const cash = (p: Plot) => p.reservePrice * (1 + stampPct / 100 + 0.001 * 1.18)
  const rows: Row[] = [
    { label: 'Score', get: (p) => <b className="text-teal-700 dark:text-teal-300">{score(p, weights)}</b>, best: bestBy((p) => score(p, weights), 'max') },
    { label: 'Facing (vastu #)', get: (p) => <FacingBadge facing={p.facing} rank={p.vastuRank <= 8 ? p.vastuRank : undefined} />, best: bestBy((p) => -p.vastuRank, 'max') },
    { label: 'Road sides', get: (p) => (p.roadSides >= 3 ? '3-side open' : p.isCorner ? 'Corner' : p.roadSides === 2 ? 'Front & back roads' : '1 side'), best: bestBy((p) => p.roadSides, 'max') },
    { label: 'Roads', get: (p) => p.roads.map((r) => `${r.side}: ${r.width ? r.width + '′' : r.label}`).join(', ') },
    { label: 'Widest road', get: (p) => (p.maxRoad ? `${p.maxRoad} ft` : 'n/a'), best: bestBy((p) => p.maxRoad, 'max') },
    { label: 'Area', get: (p) => `${num(p.area)} sq.yd`, best: bestBy((p) => p.area, 'max') },
    { label: 'Sq.ft / est. size', get: (p) => `${num(p.sqft, 0)} · ${p.estDims.front}′×${p.estDims.depth}′` },
    { label: 'Reserve ₹/sq.yd', get: (p) => `₹${num(p.rate, 0)}`, best: bestBy((p) => p.rate, 'min') },
    { label: 'Reserve price', get: (p) => short(p.reservePrice), best: bestBy((p) => p.reservePrice, 'min') },
    { label: `Cash at reserve (+${stampPct}% stamp, fee)`, get: (p) => short(cash(p)), best: bestBy(cash, 'min') },
    { label: 'Eligible bank loan', get: (p) => short(loan(p).loanUsed), best: bestBy((p) => loan(p).loanUsed, 'max') },
    { label: 'Own funds needed (with loan)', get: (p) => short(loan(p).ownFunds), best: bestBy((p) => loan(p).ownFunds, 'min') },
    { label: 'EMI', get: (p) => `${short(loan(p).emi)}/mo` },
    { label: '10% instalment', get: (p) => short(p.reservePrice * 0.1) },
    { label: 'EMD', get: () => short(EMD) },
    { label: 'Auction', get: (p) => `${p.auctionDate} (Day ${p.day})` },
    { label: 'EMD deadline', get: (p) => `${p.emdLastDate} 17:00` },
    { label: 'Highlights', get: (p) => list(p, 'good'), best: bestBy((p) => p.tags.filter((t) => t.kind === 'good').length, 'max') },
    { label: 'Concerns', get: (p) => list(p, 'bad') || 'None', best: bestBy((p) => -p.tags.filter((t) => t.kind === 'bad').length, 'max') },
    { label: 'North', get: (p) => p.surroundings.N },
    { label: 'East', get: (p) => p.surroundings.E },
    { label: 'South', get: (p) => p.surroundings.S },
    { label: 'West', get: (p) => p.surroundings.W },
    { label: 'Map', get: (p) => (p.mapUrl ? <a href={p.mapUrl} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 underline dark:text-teal-400">Open</a> : '') },
  ]
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-28 bg-slate-50 dark:bg-slate-950" />
            {plots.map((p) => (
              <th key={p.id} className="min-w-[9.5rem] max-w-[12rem] border-b border-slate-200 px-2 pb-2 text-left align-bottom dark:border-slate-800">
                <div className="flex items-start justify-between gap-1">
                  <Link to={`/plot/${p.id}`} className="text-base font-bold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">{p.unit}</Link>
                  <button onClick={() => toggle(p.id)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Remove ${p.unit}`}>
                    <Icon name="x" className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs font-normal text-slate-500">{blockLabel(p.block)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const isBest = r.best?.(plots)
            return (
              <tr key={r.label}>
                <th scope="row" className="sticky left-0 z-10 w-28 border-b border-slate-200 bg-slate-50 py-2 pr-2 text-left align-top text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  {r.label}
                </th>
                {plots.map((p) => (
                  <td
                    key={p.id}
                    className={`max-w-[12rem] border-b border-slate-200 px-2 py-2 align-top dark:border-slate-800 ${isBest?.(p) ? 'bg-emerald-50 font-semibold dark:bg-emerald-500/10' : ''}`}
                  >
                    {r.get(p)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Green cells mark the best value in each row. Swipe sideways to see more plots.</p>
    </div>
  )
}

const list = (p: Plot, kind: 'good' | 'bad') =>
  p.tags
    .filter((t) => t.kind === kind)
    .map((t) => t.label)
    .join('; ')

export default function Compare() {
  const { ids, clear } = useShortlist()
  const { weights } = useWeights()
  const [stampPct] = useStampPct()
  const [mode, setMode] = useState<'shortlist' | 'rank'>(ids.length ? 'shortlist' : 'rank')
  const [day, setDay] = useState<'' | 1 | 2>('')
  const [type, setType] = useState<PlotType | ''>('')
  const [limit, setLimit] = useState(30)
  const shortlisted = ids.map((id) => PLOT_BY_ID.get(id)).filter((p): p is Plot => !!p)

  const ranked = useMemo(
    () =>
      PLOTS.filter((p) => (!day || p.day === day) && (!type || p.type === type))
        .map((p) => ({ p, s: score(p, weights) }))
        .sort((a, b) => b.s - a.s || a.p.rate - b.p.rate),
    [weights, day, type],
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl bg-slate-200 p-1 dark:bg-slate-800" role="tablist">
        {(
          [
            ['shortlist', `Shortlist (${shortlisted.length})`],
            ['rank', 'Rank all plots'],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            aria-selected={mode === k}
            onClick={() => setMode(k)}
            className={`h-10 rounded-lg text-sm font-semibold ${mode === k ? 'bg-white shadow dark:bg-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <WeightsPanel />

      {mode === 'shortlist' ? (
        shortlisted.length ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Side by side</h2>
              <button onClick={clear} className="h-9 text-sm font-semibold text-rose-600 dark:text-rose-400">Clear shortlist</button>
            </div>
            <ShortlistTable plots={[...shortlisted].sort((a, b) => score(b, weights) - score(a, weights))} weights={weights} stampPct={stampPct} />
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
            <Icon name="star" className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-2 font-semibold">Your shortlist is empty</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tap ☆ on any plot to add it, then compare the plots here side by side.</p>
            <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-xl bg-teal-600 px-4 font-semibold text-white">Browse plots</Link>
          </div>
        )
      ) : (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Chip active={day === ''} onClick={() => setDay('')}>Both days</Chip>
            <Chip active={day === 1} onClick={() => setDay(1)}>12 Oct</Chip>
            <Chip active={day === 2} onClick={() => setDay(2)}>16 Oct</Chip>
            <span className="mx-1 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
            {(['', 'LIG', 'MIG', 'Pump House', 'Autonagar'] as const).map((t) => (
              <Chip key={t || 'all'} active={type === t} onClick={() => setType(t)}>{t || 'All types'}</Chip>
            ))}
          </div>
          <ol className="grid gap-3 sm:grid-cols-2">
            {ranked.slice(0, limit).map(({ p, s }, i) => (
              <li key={p.id}>
                <PlotCard plot={p} score={s} rank={i + 1} />
              </li>
            ))}
          </ol>
          {ranked.length > limit ? (
            <button onClick={() => setLimit((l) => l + 60)} className="h-12 w-full rounded-xl border border-slate-300 font-semibold dark:border-slate-700">
              Show more ({ranked.length - limit} left)
            </button>
          ) : null}
        </>
      )}
    </div>
  )
}
