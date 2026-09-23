import { addDays, addDaysExSundays, parseDmy } from './format'
import type { Plot } from './types'

export const EMD = 200000
export const BID_STEP = 1000
export const AUCTION_FEE_PCT = 0.1
export const GST_ON_FEE_PCT = 18
export const GRACE_INTEREST_PCT = 12
export const HOLDING_CHARGE_PER_SQYD_MONTH = 100
/** Andhra Pradesh estimate: stamp duty 5% + transfer duty 1.5% + registration fee 1%. Not from the RFP. */
export const DEFAULT_STAMP_PCT = 7.5

export interface MoneyInput {
  rate: number
  stampPct: number
  /** date the Letter of Acceptance is issued */
  loaDate: Date
  /** pay the balance inside the 30-day grace window (adds 12% p.a. interest) */
  useGrace: boolean
}

export interface Line {
  label: string
  amount: number
  when: string
  date?: Date
  note?: string
  kind: 'price' | 'fee' | 'tax' | 'interest'
}

export function defaultLoaDate(p: Plot): Date {
  // not fixed by the RFP ("to be conveyed post auction"); assume about a week after the auction
  return addDays(parseDmy(p.auctionDate), 7)
}

export function money(p: Plot, i: MoneyInput) {
  const value = Math.round(i.rate * p.area)
  const first = Math.round(value * 0.1)
  const balance = value - EMD - first
  const fee = Math.round((value * AUCTION_FEE_PCT) / 100)
  const gst = Math.round((fee * GST_ON_FEE_PCT) / 100)
  const stamp = Math.round((value * i.stampPct) / 100)
  const auction = parseDmy(p.auctionDate)
  const firstDue = addDaysExSundays(i.loaDate, 7)
  const balanceDue = addDaysExSundays(i.loaDate, 45)
  const graceDue = addDays(balanceDue, 30)
  const graceDays = Math.round((graceDue.getTime() - i.loaDate.getTime()) / 86400000)
  const interest = i.useGrace ? Math.round((balance * GRACE_INTEREST_PCT * graceDays) / 36500) : 0

  const lines: Line[] = [
    { label: 'EMD (adjusted in price)', amount: EMD, when: `By ${p.emdLastDate}, 17:00`, date: parseDmy(p.emdLastDate), kind: 'price', note: 'Refunded in 7 working days if you do not win' },
    { label: 'Auction processing fee (0.1%)', amount: fee, when: '7 working days after H-1', date: addDaysExSundays(auction, 7), kind: 'fee', note: 'H-1 bidder only; non-refundable' },
    { label: 'GST 18% on processing fee', amount: gst, when: 'With the fee', date: addDaysExSundays(auction, 7), kind: 'tax' },
    { label: '1st instalment (10% of bid value)', amount: first, when: '7 days after LoA (ex. Sundays/holidays)', date: firstDue, kind: 'price' },
    { label: 'Balance (90% minus EMD)', amount: balance, when: i.useGrace ? 'Grace: up to 75 days after LoA' : '45 days after LoA (ex. Sundays/holidays)', date: i.useGrace ? graceDue : balanceDue, kind: 'price' },
  ]
  if (i.useGrace) lines.push({ label: `Grace interest 12% p.a. (${graceDays} days)`, amount: interest, when: 'With the balance', date: graceDue, kind: 'interest', note: 'Charged from the LoA date on the balance' })
  lines.push({ label: `Stamp duty + transfer + registration (~${i.stampPct}%)`, amount: stamp, when: 'At sale-deed registration', kind: 'tax', note: 'Estimate for Andhra Pradesh; the RFP only says these are extra' })

  const total = lines.reduce((a, l) => a + l.amount, 0)
  return {
    value, first, balance, fee, gst, stamp, interest, lines, total,
    toRinl: value + interest,
    extras: fee + gst + stamp,
    dates: { auction, loa: i.loaDate, firstDue, balanceDue, graceDue },
  }
}
