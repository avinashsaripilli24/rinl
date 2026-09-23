import type { BidPlan } from '../hooks/useBidPlan'
import { openSettings } from '../hooks/useApp'
import { fmtDate, num, rupees, short } from '../lib/format'
import type { Plot } from '../lib/types'
import CashCalendar from './CashCalendar'
import LoanCalc from './LoanCalc'
import { Section } from './ui'

export default function MoneyCalc({ plot, plan }: { plot: Plot; plan: BidPlan }) {
  const { rate, steps, stampPct, useGrace, setUseGrace, loa, setLoa, m, lp, ms, peak } = plan

  return (
    <>
    <Section id="costs" title="Money required">
      <button
        type="button"
        onClick={() => document.getElementById('bid')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 text-left text-sm dark:bg-slate-800/60"
      >
        <span>
          At your bid of <b className="tabular-nums">₹{num(rate, 0)}/sq.yd</b>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{steps ? `Reserve ₹${num(plot.rate, 0)} + ${steps} step${steps === 1 ? '' : 's'}` : 'The reserve rate'}</span>
        </span>
        <span className="shrink-0 font-semibold text-teal-700 dark:text-teal-400">Change bid</span>
      </button>

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
          <p className="flex items-center justify-between gap-3">
            <span>Stamp + transfer + registration <b>{stampPct}%</b></span>
            <button type="button" onClick={() => openSettings('costs')} className="text-sm font-semibold text-teal-700 underline dark:text-teal-400">Change</button>
          </p>
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
    <div id="loan" className="scroll-mt-28">
      <LoanCalc m={m} lp={lp} peak={peak} />
    </div>
    <div id="cash" className="scroll-mt-28">
      <CashCalendar plot={plot} ms={ms} />
    </div>
    </>
  )
}
