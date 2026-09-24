import { useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PlotCard, { previewClick } from '../components/PlotCard'
import PlotNote from '../components/PlotNote'
import { PhotoStrip } from '../components/PlotPhotos'
import { WEIGHT_LABELS } from '../components/SettingsSheet'
import { Chip, FacingBadge, Icon, LoadMore } from '../components/ui'
import { openSettings, useCompareExclude, useLoanProfile, useNotes, usePreview, useShortlist, useStampPct, useVisited, useWeights } from '../hooks/useApp'
import { useInfinite } from '../hooks/useInfinite'
import { PLOTS, PLOT_BY_ID, score } from '../lib/derive'
import { blockLabel, fmtDate, num, short } from '../lib/format'
import { ownFundsAt } from '../lib/loan'
import { EMD } from '../lib/money'
import type { Plot, PlotType, Weights } from '../lib/types'

function WeightsPanel() {
  const { weights } = useWeights()
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1
  return (
    <button
      type="button"
      onClick={() => openSettings('weights')}
      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <Icon name="sliders" className="h-5 w-5 shrink-0 text-teal-600" />
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold">What matters to you</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          {(Object.keys(weights) as (keyof Weights)[])
            .filter((k) => weights[k] > 0)
            .map((k) => `${WEIGHT_LABELS[k]} ${Math.round((weights[k] / total) * 100)}%`)
            .join(' · ')}
        </span>
      </span>
      <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Adjust</span>
    </button>
  )
}

type Row = { label: string; get: (p: Plot) => ReactNode; best?: (ps: Plot[]) => (p: Plot) => boolean }
const bestBy = (fn: (p: Plot) => number, dir: 'max' | 'min') => (ps: Plot[]) => {
  const vals = ps.map(fn)
  const target = dir === 'max' ? Math.max(...vals) : Math.min(...vals)
  return (p: Plot) => ps.length > 1 && fn(p) === target
}

function ShortlistTable({ plots, weights, stampPct }: { plots: Plot[]; weights: Weights; stampPct: number }) {
  const { toggle } = useCompareExclude()
  const { noteFor } = useNotes()
  const { visitedAt } = useVisited()
  const { open } = usePreview()
  const { profile } = useLoanProfile()
  const loan = (p: Plot) => ownFundsAt(p, p.rate, stampPct, profile).lp
  const cash = (p: Plot) => p.reservePrice * (1 + stampPct / 100 + 0.001 * 1.18)
  const rows: Row[] = [
    { label: 'Score', get: (p) => <b className="text-teal-700 dark:text-teal-300">{score(p, weights)}</b>, best: bestBy((p) => score(p, weights), 'max') },
    { label: 'My notes', get: (p) => <span className="whitespace-pre-line text-slate-700 dark:text-slate-300">{noteFor(p.id) || <span className="text-slate-400">–</span>}</span> },
    { label: 'Visited', get: (p) => (visitedAt(p.id) ? <span className="text-emerald-700 dark:text-emerald-400">✓ {fmtDate(new Date(visitedAt(p.id)))}</span> : <span className="text-slate-400">Not yet</span>) },
    { label: 'Photos', get: (p) => <PhotoStrip id={p.id} unit={p.unit} /> },
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
    // no side padding on the scroller: the sticky label column carries it, so nothing scrolls past on its left
    <div className="-mx-4 overflow-x-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-32 border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950" />
            {plots.map((p) => (
              <th key={p.id} className="min-w-[9.5rem] max-w-[12rem] border-b border-slate-200 px-2 pb-2 text-left align-bottom last:pr-4 dark:border-slate-800">
                <div className="flex items-start justify-between gap-1">
                  <Link to={`/plot/${p.id}`} onClick={previewClick(() => open(p.id))} className="text-base font-bold text-teal-700 underline-offset-2 hover:underline dark:text-teal-400">{p.unit}</Link>
                  <button onClick={() => toggle(p.id)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label={`Remove ${p.unit} from comparison`}>
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
                <th scope="row" className="sticky left-0 z-10 w-32 border-b border-r border-slate-200 bg-slate-50 py-2 pl-4 pr-2 text-left align-top text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  {r.label}
                </th>
                {plots.map((p) => (
                  <td
                    key={p.id}
                    className={`max-w-[12rem] border-b border-slate-200 px-2 py-2 align-top last:pr-4 dark:border-slate-800 ${isBest?.(p) ? 'bg-emerald-50 font-semibold dark:bg-emerald-500/10' : ''}`}
                  >
                    {r.get(p)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 px-4 text-xs text-slate-500 dark:text-slate-400">Green cells mark the best value in each row. Swipe sideways to see more plots.</p>
    </div>
  )
}

const list = (p: Plot, kind: 'good' | 'bad') =>
  p.tags
    .filter((t) => t.kind === kind)
    .map((t) => t.label)
    .join('; ')

function StarredPanel({ plots, weights, stampPct, onClear }: { plots: Plot[]; weights: Weights; stampPct: number; onClear: () => void }) {
  const { isSelected, toggle, setExcluded } = useCompareExclude()
  const [sp, setSp] = useSearchParams()
  const [noteOpen, setNoteOpen] = useState<string | null>(null)
  const { noteFor } = useNotes()
  const sorted = useMemo(() => [...plots].sort((a, b) => score(b, weights) - score(a, weights)), [plots, weights])
  const selected = sorted.filter((p) => isSelected(p.id))
  // the table is its own history entry so the back gesture returns to the list
  const showTable = sp.get('view') === 'table' && selected.length > 0
  const setTable = (on: boolean) => {
    if (on) setSp({ view: 'table' })
    else if ((history.state?.idx ?? 0) > 0) history.back()
    else setSp({}, { replace: true })
  }

  if (!plots.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        <Icon name="star" className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-2 font-semibold">No starred plots yet</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Tap ☆ on any plot to star it. Your starred plots, with your notes, show up here and you can compare them side by side.</p>
        <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-xl bg-teal-600 px-4 font-semibold text-white">Browse plots</Link>
      </div>
    )
  }

  if (showTable) {
    return (
      <>
        <div className="flex items-center gap-1">
          <button onClick={() => setTable(false)} className="-ml-2 grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back to starred plots">
            <Icon name="back" />
          </button>
          <h2 className="flex-1 font-semibold">Comparing {selected.length} of {plots.length} starred</h2>
        </div>
        <ShortlistTable plots={selected} weights={weights} stampPct={stampPct} />
      </>
    )
  }

  const allSelected = selected.length === sorted.length
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Pick plots to compare</h2>
        <div className="flex gap-3 text-sm font-semibold">
          <button onClick={() => setExcluded(allSelected ? sorted.map((p) => p.id) : [])} className="h-9 text-teal-700 dark:text-teal-400">
            {allSelected ? 'Select none' : 'Select all'}
          </button>
          <button onClick={() => confirm(`Unstar all ${plots.length} plots? Your notes are kept.`) && onClear()} className="h-9 text-rose-600 dark:text-rose-400">
            Unstar all
          </button>
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {sorted.map((p) => {
          const on = isSelected(p.id)
          const note = noteFor(p.id)
          return (
            <li key={p.id} className={`rounded-3xl p-1.5 ${on ? 'bg-teal-50 ring-2 ring-teal-500 dark:bg-teal-500/10' : 'ring-1 ring-slate-200 dark:ring-slate-800'}`}>
              <div className="flex items-center gap-2 px-1 pb-1 text-sm font-medium">
                <label className="flex h-9 flex-1 cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="h-5 w-5 accent-teal-600" />
                  {on ? 'In comparison' : 'Add to comparison'}
                </label>
                <button
                  type="button"
                  onClick={() => setNoteOpen(noteOpen === p.id ? null : p.id)}
                  className="flex h-9 items-center gap-1 rounded-lg px-2 text-teal-700 hover:bg-slate-100 dark:text-teal-400 dark:hover:bg-slate-800"
                  aria-expanded={noteOpen === p.id}
                >
                  <Icon name="note" className="h-4 w-4" />
                  {noteOpen === p.id ? 'Done' : note ? 'Edit note' : 'Add note'}
                </button>
              </div>
              <PlotCard plot={p} score={score(p, weights)} />
              {noteOpen === p.id ? (
                <div className="px-1 pt-2">
                  <PlotNote id={p.id} unit={p.unit} />
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      {/* room for the floating compare bar */}
      <div className="h-16" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 px-4 pb-3 md:bottom-0">
        <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-2 pl-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <span className="flex-1 text-sm">
            <b>{selected.length}</b> of {sorted.length} selected
            {selected.length === 1 ? <span className="block text-xs text-slate-500 dark:text-slate-400">Pick at least one more</span> : null}
          </span>
          <button
            type="button"
            disabled={selected.length < 2}
            onClick={() => setTable(true)}
            className="flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700 disabled:opacity-40"
          >
            <Icon name="columns" className="h-4 w-4" /> Compare side by side
          </button>
        </div>
      </div>
    </>
  )
}

export default function Compare() {
  const { ids, clear } = useShortlist()
  const { weights } = useWeights()
  const [stampPct] = useStampPct()
  const [mode, setMode] = useState<'shortlist' | 'rank'>(ids.length ? 'shortlist' : 'rank')
  const [day, setDay] = useState<'' | 1 | 2>('')
  const [type, setType] = useState<PlotType | ''>('')
  const shortlisted = ids.map((id) => PLOT_BY_ID.get(id)).filter((p): p is Plot => !!p)

  const ranked = useMemo(
    () =>
      PLOTS.filter((p) => (!day || p.day === day) && (!type || p.type === type))
        .map((p) => ({ p, s: score(p, weights) }))
        .sort((a, b) => b.s - a.s || a.p.rate - b.p.rate),
    [weights, day, type],
  )
  const { limit, sentinel, more } = useInfinite(ranked.length, 30, `${day}|${type}|${mode}`)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl bg-slate-200 p-1 dark:bg-slate-800" role="tablist">
        {(
          [
            ['shortlist', `Starred (${shortlisted.length})`],
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
        <StarredPanel plots={shortlisted} weights={weights} stampPct={stampPct} onClear={clear} />
      ) : (
        <>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            <Chip active={day === ''} onClick={() => setDay('')}>Both days</Chip>
            <Chip active={day === 1} onClick={() => setDay(1)}>12 Oct</Chip>
            <Chip active={day === 2} onClick={() => setDay(2)}>16 Oct</Chip>
            <span className="mx-1 w-px shrink-0 bg-slate-300 dark:bg-slate-700" />
            {(['', 'LIG', 'MIG', 'Pump House'] as const).map((t) => (
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
          <LoadMore sentinel={sentinel} more={more} left={ranked.length - limit} />
        </>
      )}
    </div>
  )
}
