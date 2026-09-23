import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import FilterSheet from '../components/FilterSheet'
import PlotCard from '../components/PlotCard'
import { Chip, Icon } from '../components/ui'
import { useWeights } from '../hooks/useApp'
import { PLOTS, score } from '../lib/derive'
import { short } from '../lib/format'
import { SORTS, activeCount, applyFilters, fromParams, nearbyBlocks, toParams, type Filters } from '../lib/search'

const PAGE = 40

export default function Plots() {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo(() => fromParams(sp), [sp])
  const setFilters = (f: Filters) => setSp(toParams(f), { replace: true })
  const [q, setQ] = useState(filters.q)
  const [sheet, setSheet] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const { weights } = useWeights()
  const navigate = useNavigate()

  // debounce typing into the URL
  useEffect(() => {
    if (q === filters.q) return
    const t = setTimeout(() => setFilters({ ...filters, q }), 200)
    return () => clearTimeout(t)
  }, [q])
  useEffect(() => {
    setQ(filters.q)
  }, [filters.q])

  const results = useMemo(() => applyFilters(PLOTS, filters, weights), [filters, weights])
  useEffect(() => {
    setLimit(PAGE)
  }, [filters])

  const total = results.reduce((a, p) => a + p.reservePrice, 0)
  const n = activeCount(filters)
  const quick = (patch: Partial<Filters>) => setFilters({ ...filters, ...patch })

  const submit = () => {
    // Enter on an exact unit jumps straight to it
    if (results.length === 1) navigate(`/plot/${results[0].id}`)
  }

  return (
    <div>
      <div className="sticky top-[57px] z-20 -mx-4 bg-slate-50/95 px-4 pb-2 pt-1 backdrop-blur dark:bg-slate-950/95">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          role="search"
        >
          <label className="relative flex-1">
            <span className="sr-only">Search plots</span>
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Block 39, LIG-358, 111, open space…"
              enterKeyHint="search"
              className="h-12 w-full rounded-2xl border border-slate-300 bg-white pl-10 pr-3 text-base shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="relative grid h-12 w-12 place-items-center rounded-2xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
            aria-label={`Filters${n ? `, ${n} active` : ''}`}
          >
            <Icon name="sliders" />
            {n ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-teal-600 px-1 text-center text-[11px] font-bold leading-5 text-white">{n}</span> : null}
          </button>
        </form>

        <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
          <Chip active={filters.day === '1'} onClick={() => quick({ day: filters.day === '1' ? '' : '1' })}>12 Oct</Chip>
          <Chip active={filters.day === '2'} onClick={() => quick({ day: filters.day === '2' ? '' : '2' })}>16 Oct</Chip>
          <Chip active={filters.corner} onClick={() => quick({ corner: !filters.corner })}>Corner</Chip>
          <Chip
            active={filters.facing.length === 2 && filters.facing.includes('NE') && filters.facing.includes('E')}
            onClick={() => quick({ facing: filters.facing.length === 2 && filters.facing.includes('NE') ? [] : ['NE', 'E'] })}
          >
            NE / E facing
          </Chip>
          <Chip active={filters.minRoad === 60} onClick={() => quick({ minRoad: filters.minRoad === 60 ? 0 : 60 })}>60′ road</Chip>
          <Chip active={filters.types.length === 1 && filters.types[0] === 'LIG'} onClick={() => quick({ types: filters.types[0] === 'LIG' && filters.types.length === 1 ? [] : ['LIG'] })}>LIG</Chip>
          <Chip active={filters.types.length === 1 && filters.types[0] === 'MIG'} onClick={() => quick({ types: filters.types[0] === 'MIG' && filters.types.length === 1 ? [] : ['MIG'] })}>MIG</Chip>
          <Chip active={filters.noBad} onClick={() => quick({ noBad: !filters.noBad })}>No concerns</Chip>
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            <b className="text-slate-900 dark:text-slate-100">{results.length}</b> of {PLOTS.length} plots
            {results.length ? <span className="hidden sm:inline"> · reserve total {short(total)}</span> : null}
          </span>
          <label className="flex items-center gap-1">
            <span className="sr-only">Sort by</span>
            <select
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value as Filters['sort'] })}
              className="h-9 max-w-[11rem] rounded-lg border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState q={filters.q} filtered={n > 0} onPick={(v) => { setQ(v); setFilters({ ...filters, q: v }) }} onReset={() => setFilters({ ...filters, q: '', ...clearAll })} />
      ) : (
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">
          {results.slice(0, limit).map((p) => (
            <li key={p.id}>
              <PlotCard plot={p} score={score(p, weights)} />
            </li>
          ))}
        </ul>
      )}
      {results.length > limit ? (
        <button type="button" onClick={() => setLimit((l) => l + PAGE * 2)} className="mt-4 h-12 w-full rounded-xl border border-slate-300 font-semibold dark:border-slate-700">
          Show more ({results.length - limit} left)
        </button>
      ) : null}

      <FilterSheet open={sheet} onClose={() => setSheet(false)} filters={filters} onChange={setFilters} count={results.length} />
    </div>
  )
}

const clearAll: Partial<Filters> = {
  day: '', blocks: [], types: [], facing: [], corner: false, minRoad: 0, minSides: 0,
  areaMin: null, areaMax: null, priceMin: null, priceMax: null, rateMin: null, rateMax: null, good: false, noBad: false, zone: '',
}

function EmptyState({ q, filtered, onPick, onReset }: { q: string; filtered: boolean; onPick: (v: string) => void; onReset: () => void }) {
  const near = nearbyBlocks(q)
  const unit = q.trim().match(/^(lig|mig)\s*-?\s*(\d+)$/i)
  const unitNear = unit
    ? PLOTS.filter((p) => p.type === unit[1].toUpperCase())
        .sort((a, b) => Math.abs(parseInt(a.unit.slice(4)) - Number(unit[2])) - Math.abs(parseInt(b.unit.slice(4)) - Number(unit[2])))
        .slice(0, 4)
        .map((p) => p.unit)
    : []
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
      <p className="font-semibold">No plots match{q ? ` “${q}”` : ''}.</p>
      {near.length && !unit ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          There is no Block {q.replace(/\D/g, '')} in this auction. Nearest blocks:
        </p>
      ) : null}
      {unit ? <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{unit[1].toUpperCase()}-{unit[2]} is not in this auction. Closest numbers on sale:</p> : null}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {(unit ? unitNear : near).map((v) => (
          <Chip key={v} active={false} onClick={() => onPick(unit ? v : `block ${v}`)}>
            {unit ? v : `Block ${v}`}
          </Chip>
        ))}
      </div>
      {filtered ? (
        <button type="button" onClick={onReset} className="mt-4 text-sm font-semibold text-teal-700 underline dark:text-teal-400">
          Clear search and all filters
        </button>
      ) : null}
    </div>
  )
}
