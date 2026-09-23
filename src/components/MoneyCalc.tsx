import { useMemo, useState } from 'react'
import { useLoanProfile, useStampPct } from '../hooks/useApp'
import { fmtDate, isoDate, num, rupees, short } from '../lib/format'
import { BID_STEP, defaultLoaDate, money } from '../lib/money'
import type { Plot } from '../lib/types'
import { cashMilestones, loanPlan, peakCash } from '../lib/loan'
import CashCalendar from './CashCalendar'
import LoanCalc from './LoanCalc'
import { Section } from './ui'

export default function MoneyCalc({ plot }: { plot: Plot }) {
  const [steps, setSteps] = useState(0)
  const [stampPct, setStampPct] = useStampPct()
  const [useGrace, setUseGrace] = useState(false)
  const [loa, setLoa] = useState(() => isoDate(defaultLoaDate(plot)))
  const rate = plot.rate + steps * BID_STEP
  const loaDate = useMemo(() => {
    const [y, m, d] = loa.split('-').map(Number)
    return y ? new Date(y, m - 1, d) : defaultLoaDate(plot)
  }, [loa, plot])
  const m = money(plot, { rate, stampPct, loaDate, useGrace })
  const maxSteps = Math.max(20, Math.round(plot.rate / BID_STEP / 2))
  const { profile } = useLoanProfile()
  const lp = loanPlan(m, profile)
  const ms = cashMilestones(plot, m, lp, profile, useGrace)

  return (
    <>
    <Section title="Money required">
      <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800/60">
        <div className="flex items-center justify-between text-sm">
          <label htmlFor="bid" className="font-medium">Your bid rate</label>
          <span className="font-bold tabular-nums">₹{num(rate, 0)}/sq.yd</span>
        </div>
        <input
          id="bid"
          type="range"
          min={0}
          max={maxSteps}
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
          className="mt-2 h-8 w-full"
          aria-valuetext={`₹${rate} per sq.yd`}
        />
        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Reserve ₹{num(plot.rate, 0)}</span>
          <div className="flex gap-1">
            {[-1, 1, 5].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setSteps((s) => Math.max(0, Math.min(maxSteps, s + d)))}
                className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                {d > 0 ? '+' : '−'}₹{Math.abs(d)}k
              </button>
            ))}
          </div>
          <span>+{steps} step{steps === 1 ? '' : 's'}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">Sale value ({plot.area} sq.yd)</div>
          <div className="text-lg font-bold tabular-nums">{short(m.value)}</div>
        </div>
        <div className="rounded-xl border border-teal-300 bg-teal-50 p-3 dark:border-teal-700 dark:bg-teal-500/10">
          <div className="text-xs text-teal-800 dark:text-teal-300">Total cash needed</div>
          <div className="text-lg font-bold tabular-nums text-teal-900 dark:text-teal-200">{short(m.total)}</div>
        </div>
      </div>

      <ol className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
        {m.lines.map((l) => (
          <li key={l.label} className="flex items-start justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <div className="text-sm font-medium">{l.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {l.when}
                {l.date ? ` · ${fmtDate(l.date)}` : ''}
              </div>
              {l.note ? <div className="text-xs text-slate-400 dark:text-slate-500">{l.note}</div> : null}
            </div>
            <div className="shrink-0 text-right text-sm font-semibold tabular-nums">{rupees(l.amount)}</div>
          </li>
        ))}
        <li className="flex justify-between py-2.5 text-sm font-bold">
          <span>Total</span>
          <span className="tabular-nums">{rupees(m.total)}</span>
        </li>
      </ol>

      <details className="mt-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/40">
        <summary className="cursor-pointer font-medium">Assumptions</summary>
        <div className="mt-3 space-y-3">
          <label className="flex items-center justify-between gap-3">
            <span>Letter of Acceptance date <span className="block text-xs text-slate-500">Not fixed in the RFP; default is auction + 7 days</span></span>
            <input type="date" value={loa} onChange={(e) => setLoa(e.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-2 dark:border-slate-600 dark:bg-slate-900" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Stamp + transfer + registration % <span className="block text-xs text-slate-500">AP estimate: 5 + 1.5 + 1</span></span>
            <input type="number" step={0.5} min={0} max={20} value={stampPct} onChange={(e) => setStampPct(Number(e.target.value) || 0)} className="h-10 w-20 rounded-lg border border-slate-300 bg-white px-2 text-right tabular-nums dark:border-slate-600 dark:bg-slate-900" />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span>Use the 30-day grace period <span className="block text-xs text-slate-500">12% p.a. interest from the LoA date</span></span>
            <input type="checkbox" checked={useGrace} onChange={(e) => setUseGrace(e.target.checked)} className="h-6 w-6 accent-teal-600" />
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Due dates skip Sundays but not bank holidays. Betterment/development levies, utility connections and property tax are extra and not included.
          </p>
        </div>
      </details>
    </Section>
    <LoanCalc m={m} lp={lp} peak={peakCash(ms)} />
    <CashCalendar plot={plot} ms={ms} />
    </>
  )
}
