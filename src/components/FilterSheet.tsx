import { useEffect, type ReactNode } from 'react'
import { BLOCKS, FACING_NAME } from '../lib/derive'
import { EMPTY, FACING_OPTIONS, type Filters } from '../lib/search'
import type { PlotType } from '../lib/types'
import { Chip, Icon } from './ui'

const TYPES: PlotType[] = ['LIG', 'MIG', 'Pump House', 'Autonagar']

function Group({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <fieldset className="border-b border-slate-200 py-4 last:border-0 dark:border-slate-800">
      <legend className="float-left mb-2 w-full text-sm font-semibold">
        {title}
        {hint ? <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">{hint}</span> : null}
      </legend>
      <div className="clear-both flex flex-wrap gap-2">{children}</div>
    </fieldset>
  )
}

function Range({ min, max, onMin, onMax, unit, step = 1 }: { min: number | null; max: number | null; onMin: (v: number | null) => void; onMax: (v: number | null) => void; unit: string; step?: number }) {
  const cls = 'h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base tabular-nums dark:border-slate-700 dark:bg-slate-950'
  const parse = (s: string) => (s === '' ? null : Number(s))
  return (
    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
      <input type="number" inputMode="decimal" step={step} placeholder={`Min ${unit}`} value={min ?? ''} onChange={(e) => onMin(parse(e.target.value))} className={cls} />
      <span className="text-slate-400">–</span>
      <input type="number" inputMode="decimal" step={step} placeholder={`Max ${unit}`} value={max ?? ''} onChange={(e) => onMax(parse(e.target.value))} className={cls} />
    </div>
  )
}

export default function FilterSheet({ open, onClose, filters, onChange, count }: { open: boolean; onClose: () => void; filters: Filters; onChange: (f: Filters) => void; count: number }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null

  const f = filters
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch })
  const toggleIn = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label="Filters">
      <button className="absolute inset-0 bg-slate-950/50" aria-label="Close filters" onClick={onClose} />
      <div className="relative flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl md:rounded-3xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <h2 className="text-lg font-bold">Filters</h2>
          <button onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="overflow-y-auto px-4">
          <Group title="Auction day">
            {([['', 'Both'], ['1', '12 Oct (Day 1)'], ['2', '16 Oct (Day 2)']] as const).map(([v, l]) => (
              <Chip key={v} active={f.day === v} onClick={() => set({ day: v })}>{l}</Chip>
            ))}
          </Group>

          <Group title="Facing" hint="(vastu order, best first)">
            {FACING_OPTIONS.map((fc) => (
              <Chip key={fc} active={f.facing.includes(fc)} onClick={() => set({ facing: toggleIn(f.facing, fc) })}>
                <span title={FACING_NAME[fc]}>{fc}</span>
              </Chip>
            ))}
          </Group>

          <Group title="Placement">
            <Chip active={f.corner} onClick={() => set({ corner: !f.corner })}>Corner only</Chip>
            <Chip active={f.minSides === 3} onClick={() => set({ minSides: f.minSides === 3 ? 0 : 3 })}>3-side open</Chip>
          </Group>

          <Group title="Widest road at least">
            {[0, 24, 30, 40, 60].map((w) => (
              <Chip key={w} active={f.minRoad === w} onClick={() => set({ minRoad: w })}>{w ? `${w}′` : 'Any'}</Chip>
            ))}
          </Group>

          <Group title="Plot type">
            {TYPES.map((t) => (
              <Chip key={t} active={f.types.includes(t)} onClick={() => set({ types: toggleIn(f.types, t) })}>{t}</Chip>
            ))}
          </Group>

          <Group title="Features">
            <Chip active={f.good} onClick={() => set({ good: !f.good })}>Has a highlight</Chip>
            <Chip active={f.noBad} onClick={() => set({ noBad: !f.noBad })}>No concerns (drain, pump house…)</Chip>
          </Group>

          <Group title="Area" hint="(sq.yd)">
            <Range min={f.areaMin} max={f.areaMax} onMin={(v) => set({ areaMin: v })} onMax={(v) => set({ areaMax: v })} unit="sq.yd" />
          </Group>

          <Group title="Reserve price" hint="(₹ lakh)">
            <Range min={f.priceMin} max={f.priceMax} onMin={(v) => set({ priceMin: v })} onMax={(v) => set({ priceMax: v })} unit="lakh" />
          </Group>

          <Group title="Reserve rate" hint="(₹ per sq.yd)">
            <Range min={f.rateMin} max={f.rateMax} onMin={(v) => set({ rateMin: v })} onMax={(v) => set({ rateMax: v })} unit="₹" step={1000} />
          </Group>

          <Group title="Location">
            {([['', 'All'], ['HB Colony', 'HB Colony, Maddilapalem'], ['Autonagar', 'Autonagar, Gajuwaka']] as const).map(([v, l]) => (
              <Chip key={v} active={f.zone === v} onClick={() => set({ zone: v })}>{l}</Chip>
            ))}
          </Group>

          <Group title="Blocks" hint={f.blocks.length ? `(${f.blocks.length} selected)` : ''}>
            {BLOCKS.map((b) => (
              <Chip key={b} active={f.blocks.includes(b)} onClick={() => set({ blocks: toggleIn(f.blocks, b) })}>
                {b.replace('Autonagar ', 'Auto ')}
              </Chip>
            ))}
          </Group>
        </div>

        <div className="pb-safe flex gap-3 border-t border-slate-200 p-3 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onChange({ ...EMPTY, q: f.q, sort: f.sort })}
            className="h-12 flex-1 rounded-xl border border-slate-300 font-semibold dark:border-slate-700"
          >
            Reset
          </button>
          <button type="button" onClick={onClose} className="h-12 flex-[2] rounded-xl bg-teal-600 font-semibold text-white hover:bg-teal-700">
            Show {count} plot{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}
