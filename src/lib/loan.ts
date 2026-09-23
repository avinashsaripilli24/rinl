import { addDays, addDaysExSundays, parseDmy } from './format'
import { EMD, defaultLoaDate, money } from './money'
import type { Plot } from './types'

/** move a suggested (not RFP-mandated) date off a Sunday */
const weekday = (d: Date) => (d.getDay() === 0 ? addDays(d, 1) : d)

export type Scenario = 'bank-before-deed' | 'own-funds-then-loan'

export interface LoanProfile {
  ltvPct: number
  ratePct: number
  tenureYears: number
  netMonthlyIncome: number
  coApplicantIncome: number
  existingEmis: number
  foirPct: number
  processingFeePct: number
  scenario: Scenario
}

/** Typical Indian plot-loan terms; every field is editable in the app. */
export const DEFAULT_LOAN: LoanProfile = {
  ltvPct: 75, // RBI caps loans above ₹75L at 75% LTV; plot loans are commonly 70–80%
  ratePct: 9,
  tenureYears: 15, // plot loans usually max out at 10–15 years
  netMonthlyIncome: 0,
  coApplicantIncome: 0,
  existingEmis: 0,
  foirPct: 50,
  processingFeePct: 0.5,
  scenario: 'bank-before-deed',
}

export const LOAN_PRESETS: { label: string; patch: Partial<LoanProfile> }[] = [
  { label: 'PSU bank (~8.75%)', patch: { ratePct: 8.75, processingFeePct: 0.35, ltvPct: 75 } },
  { label: 'Private bank (~9.75%)', patch: { ratePct: 9.75, processingFeePct: 0.5, ltvPct: 75 } },
  { label: 'HFC (~10.5%)', patch: { ratePct: 10.5, processingFeePct: 1, ltvPct: 70 } },
]

/** Reducing-balance EMI. */
export function emi(principal: number, ratePct: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0
  const r = ratePct / 1200
  if (r === 0) return principal / months
  const f = Math.pow(1 + r, months)
  return (principal * r * f) / (f - 1)
}

/** Loan amount that a given EMI services (inverse of `emi`). */
export function principalFor(emiAmount: number, ratePct: number, months: number): number {
  if (emiAmount <= 0 || months <= 0) return 0
  const r = ratePct / 1200
  if (r === 0) return emiAmount * months
  return (emiAmount * (1 - Math.pow(1 + r, -months))) / r
}

export function maxLoanByIncome(p: LoanProfile): number | null {
  const income = (p.netMonthlyIncome || 0) + (p.coApplicantIncome || 0)
  if (!income) return null
  const capacity = Math.max(0, (income * p.foirPct) / 100 - (p.existingEmis || 0))
  return principalFor(capacity, p.ratePct, p.tenureYears * 12)
}

export type MoneyResult = ReturnType<typeof money>

export function loanPlan(m: MoneyResult, p: LoanProfile) {
  const months = Math.round(p.tenureYears * 12)
  const ltvLimit = Math.round((m.value * p.ltvPct) / 100)
  const incomeLimit = maxLoanByIncome(p)
  const eligible = Math.round(incomeLimit == null ? ltvLimit : Math.min(ltvLimit, incomeLimit))
  const bindingLimit: 'ltv' | 'income' = incomeLimit != null && incomeLimit < ltvLimit ? 'income' : 'ltv'
  // The loan can only fund the balance instalment: EMD and the 10% instalment fall due before any
  // lender could disburse, and stamp duty/fees are not financed.
  const loanUsed = Math.max(0, Math.min(eligible, m.balance))
  const processingFee = Math.round(((loanUsed * p.processingFeePct) / 100) * 1.18)
  const monthlyEmi = Math.round(emi(loanUsed, p.ratePct, months))
  const totalRepay = monthlyEmi * months
  const ownFunds = m.total + processingFee - loanUsed
  const fullLoan = Math.min(ltvLimit, m.balance)
  const minIncomeForFullLoan = Math.ceil((emi(fullLoan, p.ratePct, months) + (p.existingEmis || 0)) / (p.foirPct / 100))
  return {
    months, ltvLimit, incomeLimit, eligible, bindingLimit, loanUsed, processingFee,
    emi: monthlyEmi, totalRepay, totalInterest: totalRepay - loanUsed, ownFunds, fullLoan, minIncomeForFullLoan,
  }
}
export type LoanPlanResult = ReturnType<typeof loanPlan>

export interface Milestone {
  key: string
  date: Date
  label: string
  detail?: string
  own: number
  bank: number
  kind: 'pay' | 'task' | 'refund'
  /** running total of own money paid out up to and including this milestone */
  runningOwn: number
}

/** Every date to act on, with how much own money / bank money each needs. */
export function cashMilestones(plot: Plot, m: MoneyResult, lp: LoanPlanResult, p: LoanProfile, useGrace: boolean): Milestone[] {
  const emdDate = parseDmy(plot.emdLastDate)
  const auction = m.dates.auction
  const loa = m.dates.loa
  const payDate = useGrace ? m.dates.graceDue : m.dates.balanceDue
  const deed = addDays(payDate, 90)
  const bankNow = p.scenario === 'bank-before-deed' ? lp.loanUsed : 0
  const hasLoan = lp.loanUsed > 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const idealStart = weekday(addDays(emdDate, -21))
  const loanStart = idealStart < today ? today : idealStart
  const raw: Omit<Milestone, 'runningOwn'>[] = [
    { key: 'queries', date: parseDmy('23.09.2026'), label: 'Email pre-bid queries', detail: 'Last day (2 days before the pre-bid meeting on 25.09.2026, 11:00)', own: 0, bank: 0, kind: 'task' },
    ...(hasLoan
      ? [{ key: 'loanstart', date: loanStart, label: idealStart < today ? 'Start the loan process now' : 'Start the loan process', detail: 'Ideally 3 weeks before the EMD deadline. In-principle sanction, KYC, income papers. Ask about disbursing to RINL before the sale deed (RFP clause 5.6).', own: 0, bank: 0, kind: 'task' as const }]
      : []),
    { key: 'mock', date: parseDmy('06.10.2026'), label: 'Mock e-auction opens', detail: 'Practice on eauction.enivida.com (RailTel helpdesk 8448288987)', own: 0, bank: 0, kind: 'task' },
    { key: 'emd', date: emdDate, label: 'Register + pay EMD', detail: `By ${plot.emdLastDate}, 17:00, online on eauction.enivida.com. Adjusted in the price; refunded if you lose.`, own: EMD, bank: 0, kind: 'pay' },
    { key: 'auction', date: auction, label: 'e-Auction', detail: `${plot.auctionDate}, 11:00 to 19:00, with a 10-minute auto-extension on late bids`, own: 0, bank: 0, kind: 'task' },
    { key: 'docs', date: addDays(auction, 7), label: 'Email Annex V–VIII documents', detail: 'To rinl_landm1/landm2@vizagsteel.com, within 7 days of H-1. Post hard copies within 15 days.', own: 0, bank: 0, kind: 'task' },
    { key: 'fee', date: addDaysExSundays(auction, 7), label: 'Pay auction fee + GST', detail: '0.1% of the bid value + 18% GST, within 7 working days of H-1, or the EMD may be forfeited', own: m.fee + m.gst, bank: 0, kind: 'pay' },
    { key: 'loa', date: loa, label: 'Letter of Acceptance (assumed date)', detail: 'Not fixed in the RFP. Change it in the money assumptions.', own: 0, bank: 0, kind: 'task' },
    { key: 'first', date: m.dates.firstDue, label: 'Pay the 10% instalment', detail: 'Within 7 days of the LoA (Sundays/holidays excluded), by RTGS/NEFT to the escrow account', own: m.first, bank: 0, kind: 'pay' },
    ...(hasLoan
      ? [{ key: 'sanction', date: weekday(addDays(loa, 30)), label: 'Final loan sanction + processing fee', detail: p.scenario === 'bank-before-deed' ? 'Get the bank to pay RINL directly, with RINL’s NOC/tripartite letter' : 'Arrange a bridge for the balance; the plot loan comes after the deed', own: lp.processingFee, bank: 0, kind: 'pay' as const }]
      : []),
    {
      key: 'balance',
      date: payDate,
      label: useGrace ? 'Pay the balance + 12% interest (grace)' : 'Pay the balance',
      detail: useGrace ? `Final date inside the 30-day grace period (normal deadline ${m.dates.balanceDue.toLocaleDateString('en-IN')})` : `Within 45 days of the LoA. Grace until ${m.dates.graceDue.toLocaleDateString('en-IN')} at 12% p.a.`,
      own: m.balance + m.interest - bankNow,
      bank: bankNow,
      kind: 'pay',
    },
    { key: 'deed', date: deed, label: 'Stamp duty + registration', detail: `About ${Math.round((m.stamp / m.value) * 1000) / 10}% (estimate). RINL intends to register within ~90 days of full payment.`, own: m.stamp, bank: 0, kind: 'pay' },
    ...(hasLoan && p.scenario === 'own-funds-then-loan'
      ? [{ key: 'lap', date: weekday(addDays(deed, 21)), label: 'Plot loan disbursed after the deed', detail: 'Pays back your bridge/own money (estimated timing)', own: -lp.loanUsed, bank: lp.loanUsed, kind: 'refund' as const }]
      : []),
    { key: 'possession', date: addDays(deed, 15), label: 'Take possession', detail: 'Within ~15 days of the deed. Delay costs ₹100/sq.yd/month in holding charges.', own: 0, bank: 0, kind: 'task' },
  ]
  let run = 0
  return raw
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((x) => {
      run += x.own
      return { ...x, runningOwn: run }
    })
}

export const peakCash = (ms: Milestone[]) => Math.max(0, ...ms.map((x) => x.runningOwn))

/** Own funds needed for a plot at a given bid rate, using default dates (used by Top picks & Compare). */
export function ownFundsAt(plot: Plot, rate: number, stampPct: number, p: LoanProfile) {
  const m = money(plot, { rate, stampPct, loaDate: defaultLoaDate(plot), useGrace: false })
  const lp = loanPlan(m, p)
  return { m, lp }
}
