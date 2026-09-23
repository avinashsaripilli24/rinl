import { useEffect, useState } from 'react'
import { openSettings } from '../hooks/useApp'
import type { BidPlan } from '../hooks/useBidPlan'
import { maxRateFor } from '../lib/afford'
import { fmtDate, num, rupees, short } from '../lib/format'
import { BID_STEP } from '../lib/money'
import type { Plot } from '../lib/types'
import { Section } from './ui'

const delta = (n: number) => (Math.round(n) === 0 ? null : `${n > 0 ? '+' : '−'}${short(Math.abs(n))}`)

/** Bid rate, with the reserve as the floor and ₹1,000/sq.yd steps above it. */
function stepsFor(plot: Plot, rate: number) {
  return Math.max(0, Math.ceil((rate - plot.rate) / BID_STEP))
}

function Result({ label, value, sub, change, tone = 'plain' }: { label: string; value: string; sub?: string; change?: string | null; tone?: 'plain' | 'teal' }) {
  return (
    <div className={`rounded-xl border p-3 ${tone === 'teal' ? 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="flex flex-wrap gap-x-2 text-xs">
        {change ? <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-400">{change} vs reserve</span> : null}
        {sub ? <span className="text-slate-500 dark:text-slate-400">{sub}</span> : null}
      </div>
    </div>
  )
}

export default function BidSimulator({ plot, plan }: { plot: Plot; plan: BidPlan }) {
  const { rate, steps, setSteps, m, lp, ms, peak, base, baseLp, profile, stampPct } = plan
  const [draft, setDraft] = useState(num(rate, 0))
  useEffect(() => setDraft(num(rate, 0)), [rate])
  const commit = () => {
    const v = Number(draft.replace(/[^\d.]/g, ''))
    if (v) setSteps(stepsFor(plot, v))
    else setDraft(num(rate, 0))
  }

  const maxSteps = Math.max(50, Math.ceil((plot.rate * 0.5) / BID_STEP), steps + 10)
  const pct = ((rate - plot.rate) / plot.rate) * 100
  const savings = profile.savings
  const maxForSavings = savings ? maxRateFor(plot, savings, 'own', stampPct, profile) : null
  const affordable = maxForSavings != null && maxForSavings >= plot.rate
  const fits = savings ? lp.ownFunds <= savings : null
  const pays = ms.filter((x) => x.own > 0 || x.bank > 0)

  return (
    <Section
      id="bid"
      title="Bid simulator"
      right={
        steps ? (
          <button type="button" onClick={() => setSteps(0)} className="h-9 rounded-lg px-2 text-sm font-semibold text-teal-700 dark:text-teal-400">
            Reset to reserve
          </button>
        ) : null
      }
    >
      <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800/60">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSteps((s) => s - 1)}
            disabled={!steps}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-slate-300 bg-white text-xl font-bold disabled:opacity-40 dark:border-slate-600 dark:bg-slate-900"
            aria-label={`Lower bid by ₹${num(BID_STEP, 0)} per sq.yd`}
          >
            −
          </button>
          <label className="min-w-0 flex-1 text-center">
            <span className="block text-xs text-slate-500 dark:text-slate-400">Your bid rate (₹/sq.yd)</span>
            <input
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget.blur())}
              className="w-full bg-transparent text-center text-2xl font-bold tabular-nums outline-none focus:underline"
              aria-describedby="bid-note"
            />
          </label>
          <button
            type="button"
            onClick={() => setSteps((s) => s + 1)}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-600 text-xl font-bold text-white hover:bg-teal-700"
            aria-label={`Raise bid by ₹${num(BID_STEP, 0)} per sq.yd`}
          >
            +
          </button>
        </div>
        <p id="bid-note" className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
          Reserve ₹{num(plot.rate, 0)} · {steps ? `+${steps} step${steps === 1 ? '' : 's'} of ₹1,000 (+${pct.toFixed(1)}%)` : 'bids rise in ₹1,000 steps'}
        </p>

        <input
          type="range"
          min={0}
          max={maxSteps}
          value={steps}
          onChange={(e) => setSteps(Number(e.target.value))}
          className="mt-2 h-8 w-full accent-teal-600"
          aria-label="Bid rate"
          aria-valuetext={`₹${rate} per sq.yd`}
        />

        <div className="mt-1 flex flex-wrap justify-center gap-1.5">
          {[1, 5, 10, 25].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSteps((s) => s + d)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              +₹{d}k
            </button>
          ))}
          {[5, 10, 20].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSteps(stepsFor(plot, plot.rate * (1 + p / 100)))}
              className="h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              Reserve +{p}%
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Result label={`Bid value (${num(plot.area)} sq.yd)`} value={short(m.value)} change={delta(m.value - base.value)} sub={rupees(m.value)} />
        <Result label="Total cost (all-in)" value={short(m.total)} change={delta(m.total - base.total)} sub="Price + fee + GST + stamp" tone="teal" />
        <Result label="Your own money" value={short(lp.ownFunds)} change={delta(lp.ownFunds - baseLp.ownFunds)} sub={`Peak ${short(peak)} out at once`} tone="teal" />
        <Result
          label="Bank loan"
          value={lp.loanUsed ? short(lp.loanUsed) : 'None'}
          change={delta(lp.loanUsed - baseLp.loanUsed)}
          sub={lp.emi ? `EMI ${rupees(lp.emi)}/mo${lp.emi !== baseLp.emi ? ` (${delta(lp.emi - baseLp.emi)})` : ''}` : undefined}
        />
      </div>

      {savings ? (
        <div className={`mt-3 rounded-xl p-3 text-sm ${fits ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200' : 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200'}`}>
          <div className="flex justify-between gap-2 text-xs">
            <span>Own money needed {short(lp.ownFunds)}</span>
            <span>Your savings {short(savings)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-slate-900/60">
            <div className={`h-full rounded-full ${fits ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${Math.min(100, (lp.ownFunds / savings) * 100)}%` }} />
          </div>
          <p className="mt-2">
            {fits ? `✓ Fits, with ${short(savings - lp.ownFunds)} to spare.` : `Short by ${short(lp.ownFunds - savings)}.`}{' '}
            {affordable ? (
              <>
                Your savings stretch to <b>₹{num(maxForSavings!, 0)}/sq.yd</b>.{' '}
                {maxForSavings !== rate ? (
                  <button type="button" onClick={() => setSteps(stepsFor(plot, maxForSavings!))} className="font-semibold underline">
                    Set bid to this
                  </button>
                ) : null}
              </>
            ) : (
              'Your savings don’t cover this plot even at the reserve price.'
            )}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          <button type="button" onClick={() => openSettings('profile')} className="font-semibold text-teal-700 underline dark:text-teal-400">
            Add your savings
          </button>{' '}
          to see whether this bid fits and the highest bid you can afford.
        </p>
      )}

      <h3 className="mt-4 text-sm font-semibold">Money to arrange at this bid</h3>
      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">By</th>
              <th className="px-2 py-2 text-right font-medium">You pay</th>
              <th className="px-3 py-2 text-right font-medium">Total so far</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {pays.map((x) => (
              <tr key={x.key}>
                <td className="px-3 py-2">
                  <div className="font-medium">{x.label}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {fmtDate(x.date)}
                    {x.bank > 0 ? ` · bank pays ${short(x.bank)}` : ''}
                  </div>
                </td>
                <td className={`px-2 py-2 text-right font-semibold tabular-nums ${x.own < 0 ? 'text-emerald-700 dark:text-emerald-400' : ''}`}>
                  {x.own < 0 ? `+${short(-x.own)} back` : short(x.own)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{short(x.runningOwn)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-200 font-bold dark:border-slate-800">
            <tr>
              <td className="px-3 py-2">Your own money in total</td>
              <td colSpan={2} className="px-3 py-2 text-right tabular-nums">{rupees(lp.ownFunds)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Costs, Loan and Cash plan below all use this bid. Dates assume the LoA date and grace choice in Costs → Assumptions.
      </p>
    </Section>
  )
}

/** Compact bid control pinned to the bottom of the screen while the simulator is scrolled away. */
export function BidBar({ plan }: { plan: BidPlan }) {
  const { rate, steps, setSteps, m, lp } = plan
  const [hidden, setHidden] = useState(true)
  useEffect(() => {
    const el = document.getElementById('bid')
    if (!el) return
    const io = new IntersectionObserver(([e]) => setHidden(e.isIntersecting || e.boundingClientRect.top > 0), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  if (hidden) return null
  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 px-3 pb-2 md:bottom-4">
      <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <button
          type="button"
          onClick={() => setSteps((s) => s - 1)}
          disabled={!steps}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-300 text-lg font-bold disabled:opacity-40 dark:border-slate-600"
          aria-label="Lower bid by ₹1,000 per sq.yd"
        >
          −
        </button>
        <button type="button" onClick={() => document.getElementById('bid')?.scrollIntoView({ behavior: 'smooth' })} className="min-w-0 flex-1 text-center leading-tight">
          <span className="block text-sm font-bold tabular-nums">₹{num(rate, 0)}/sq.yd{steps ? <span className="font-normal text-amber-700 dark:text-amber-400"> +{steps}k</span> : null}</span>
          <span className="block truncate text-xs tabular-nums text-slate-500 dark:text-slate-400">
            Total {short(m.total)} · own {short(lp.ownFunds)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setSteps((s) => s + 1)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-600 text-lg font-bold text-white"
          aria-label="Raise bid by ₹1,000 per sq.yd"
        >
          +
        </button>
      </div>
    </div>
  )
}
