import { emi, maxLoanByIncome, ownFundsAt, type LoanProfile } from './loan'
import { AUCTION_FEE_PCT, BID_STEP, EMD, GST_ON_FEE_PCT } from './money'
import type { Plot } from './types'

export type Basis = 'allin' | 'reserve' | 'own'

/** multiplier from sale value to all-in cash (stamp etc. + processing fee + GST on fee) */
export const allInFactor = (stampPct: number) => 1 + stampPct / 100 + (AUCTION_FEE_PCT / 100) * (1 + GST_ON_FEE_PCT / 100)

/** what has to fit the budget for a plot at a given bid rate */
export function costAt(p: Plot, rate: number, basis: Basis, stampPct: number, profile: LoanProfile) {
  if (basis === 'own') return ownFundsAt(p, rate, stampPct, profile).lp.ownFunds
  return basis === 'allin' ? rate * p.area * allInFactor(stampPct) : rate * p.area
}

/** highest bid rate (₹1,000 steps) whose cost still fits; binary search, since cost rises with the rate */
export function maxRateFor(p: Plot, budget: number, basis: Basis, stampPct: number, profile: LoanProfile) {
  let lo = 0
  let hi = 400
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (costAt(p, p.rate + mid * BID_STEP, basis, stampPct, profile) <= budget) lo = mid
    else hi = mid - 1
  }
  return p.rate + lo * BID_STEP
}

/**
 * Own money needed to buy a plot of sale value `v`, independent of any particular plot.
 * Mirrors loanPlan: the loan can only fund the balance (90% minus EMD) and is capped by LTV and income.
 */
export function ownFundsForValue(v: number, stampPct: number, p: LoanProfile) {
  const incomeLimit = maxLoanByIncome(p)
  const ltv = (v * p.ltvPct) / 100
  const balance = Math.max(0, v * 0.9 - EMD)
  const loan = Math.max(0, Math.min(ltv, balance, incomeLimit ?? Infinity))
  const fee = ((loan * p.processingFeePct) / 100) * 1.18
  return { own: v * allInFactor(stampPct) + fee - loan, loan, emi: emi(loan, p.ratePct, p.tenureYears * 12) }
}

/** Largest sale value whose own-funds need fits `savings` (binary search to the nearest ₹10k). */
export function maxValueForSavings(savings: number, stampPct: number, p: LoanProfile) {
  if (savings <= 0) return 0
  let lo = 0
  let hi = 50e7
  while (hi - lo > 1e4) {
    const mid = (lo + hi) / 2
    if (ownFundsForValue(mid, stampPct, p).own <= savings) lo = mid
    else hi = mid
  }
  return lo
}

/** Net monthly income needed for a bank to lend `loan` at the profile's rate, tenure and FOIR. */
export const incomeNeededFor = (loan: number, p: LoanProfile) =>
  (emi(loan, p.ratePct, p.tenureYears * 12) + (p.existingEmis || 0)) / (p.foirPct / 100)
