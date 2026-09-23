import { useCallback, useMemo, useState } from 'react'
import { isoDate } from '../lib/format'
import { cashMilestones, loanPlan, peakCash } from '../lib/loan'
import { BID_STEP, defaultLoaDate, money } from '../lib/money'
import type { Plot } from '../lib/types'
import { useLoanProfile, useStampPct } from './useApp'
import { useStored } from './useStored'

/**
 * One bid for a plot, shared by the simulator, costs, loan and cash plan on the plot page.
 * The bid is kept per plot as ₹1,000 steps above the reserve rate, so it survives reloads.
 */
export function useBidPlan(plot: Plot) {
  const [allSteps, setAllSteps] = useStored<Record<string, number>>('bidSteps', {})
  const steps = allSteps[plot.id] ?? 0
  const setSteps = useCallback(
    (next: number | ((s: number) => number)) =>
      setAllSteps((all) => {
        const cur = all[plot.id] ?? 0
        const v = Math.max(0, Math.round(typeof next === 'function' ? next(cur) : next))
        const { [plot.id]: _, ...rest } = all
        return v ? { ...rest, [plot.id]: v } : rest
      }),
    [setAllSteps, plot.id],
  )
  const [stampPct] = useStampPct()
  const { profile } = useLoanProfile()
  const [useGrace, setUseGrace] = useState(false)
  const [loa, setLoa] = useState(() => isoDate(defaultLoaDate(plot)))

  const rate = plot.rate + steps * BID_STEP
  const loaDate = useMemo(() => {
    const [y, m, d] = loa.split('-').map(Number)
    return y ? new Date(y, m - 1, d) : defaultLoaDate(plot)
  }, [loa, plot])

  const m = money(plot, { rate, stampPct, loaDate, useGrace })
  const lp = loanPlan(m, profile)
  const ms = cashMilestones(plot, m, lp, profile, useGrace)
  // the same plan at the reserve rate, to show what the extra bid costs
  const base = money(plot, { rate: plot.rate, stampPct, loaDate, useGrace })
  const baseLp = loanPlan(base, profile)

  return {
    rate, steps, setSteps, stampPct, profile,
    useGrace, setUseGrace, loa, setLoa,
    m, lp, ms, peak: peakCash(ms),
    base, baseLp,
  }
}
export type BidPlan = ReturnType<typeof useBidPlan>
