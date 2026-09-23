import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { previewClick } from '../components/PlotCard'
import { FacingBadge, Icon, Section, Stat } from '../components/ui'
import { openSettings, useLoanProfile, usePreview, useStampPct } from '../hooks/useApp'
import { useStored } from '../hooks/useStored'
import { incomeNeededFor, maxValueForSavings, ownFundsForValue } from '../lib/afford'
import { PLOTS, VASTU_ORDER, blockAvgRate } from '../lib/derive'
import { blockLabel, num, rupees, short } from '../lib/format'
import { maxLoanByIncome, ownFundsAt, type LoanProfile } from '../lib/loan'
import type { Plot } from '../lib/types'

const LAKH = 1e5
const BANDS = [100, 125, 150, 200, 250, 300].map((l) => l * LAKH)
const RATES = [8.5, 9, 9.5, 10.5]
const TENURES = [10, 15, 20]

/** compact crore label for chart axes: 0.75, 1, 1.25 … */
const cr = (v: number) => String(Math.round((v / 1e7) * 100) / 100)

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

/** Horizontal bar row; `on` marks bars inside the reader's reach. */
function BarRow({ label, value, max, text, on = true, onClick, title }: { label: ReactNode; value: number; max: number; text: ReactNode; on?: boolean; onClick?: () => void; title?: string }) {
  const body = (
    <>
      <span className="truncate text-left text-slate-600 dark:text-slate-300">{label}</span>
      <span className="h-3 overflow-hidden rounded-r bg-slate-100 dark:bg-slate-800">
        <span
          className={`block h-full rounded-r ${on ? 'bg-teal-500 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-600'}`}
          style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }}
        />
      </span>
      <span className="text-right tabular-nums text-slate-700 dark:text-slate-200">{text}</span>
    </>
  )
  const cls = 'grid w-full grid-cols-[5.5rem_1fr_4.5rem] items-center gap-2 py-1 text-xs'
  return onClick ? (
    <button type="button" onClick={onClick} title={title} className={`${cls} rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60`}>
      {body}
    </button>
  ) : (
    <div className={cls} title={title}>
      {body}
    </div>
  )
}

export default function Insights() {
  const { profile } = useLoanProfile()
  const [stampPct] = useStampPct()
  const income = profile.netMonthlyIncome + profile.coApplicantIncome

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Insights</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">What you can afford, and how the {PLOTS.length} plots are priced.</p>
      </div>
      {income || profile.savings ? <BuyingPower profile={profile} stampPct={stampPct} income={income} /> : <SetupCard />}
      {income ? <BorrowingGrid profile={profile} /> : null}
      <BudgetBands profile={profile} stampPct={stampPct} />
      <PriceHistogram profile={profile} stampPct={stampPct} />
      <BlockRates />
      <BestValue />
      <Mix />
    </div>
  )
}

function SetupCard() {
  return (
    <div className="rounded-2xl border border-dashed border-teal-400 bg-teal-50/60 p-4 dark:border-teal-700 dark:bg-teal-500/5">
      <div className="flex items-start gap-3">
        <Icon name="chart" className="mt-0.5 h-6 w-6 shrink-0 text-teal-600" />
        <div>
          <p className="font-semibold">See what you can afford</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Add your monthly income and the savings you can put in. The app then works out your loan, the most you can bid, and which plots are within reach.
          </p>
          <button type="button" onClick={() => openSettings('profile')} className="mt-3 h-11 rounded-xl bg-teal-600 px-4 font-semibold text-white hover:bg-teal-700">
            Add income &amp; savings
          </button>
        </div>
      </div>
    </div>
  )
}

function BuyingPower({ profile: p, stampPct, income }: { profile: LoanProfile; stampPct: number; income: number }) {
  const navigate = useNavigate()
  const [, setBudgetLakh] = useStored<number>('budgetLakh', 150)
  const [, setBasis] = useStored<string>('budgetBasis', 'allin')
  const byIncome = maxLoanByIncome(p)
  const capacity = income ? Math.max(0, (income * p.foirPct) / 100 - p.existingEmis) : 0
  const maxValue = p.savings ? maxValueForSavings(p.savings, stampPct, p) : 0
  const at = maxValue ? ownFundsForValue(maxValue, stampPct, p) : null

  const reach = useMemo(() => {
    if (!p.savings) return null
    const ok = PLOTS.filter((x) => ownFundsAt(x, x.rate, stampPct, p).lp.ownFunds <= p.savings)
    return { all: ok.length, d1: ok.filter((x) => x.day === 1).length, d2: ok.filter((x) => x.day === 2).length }
  }, [p, stampPct])

  // what limits the purchase at the top of the range
  const ltvLoan = (maxValue * p.ltvPct) / 100
  const limit = !at ? null : byIncome != null && at.loan >= byIncome - 1 && byIncome < ltvLoan ? 'income' : 'savings'

  const existingPct = income ? (p.existingEmis / income) * 100 : 0
  const newPct = income && at ? (at.emi / income) * 100 : 0

  return (
    <Section title="Your buying power" right={<button onClick={() => openSettings('profile')} className="h-9 text-sm font-semibold text-teal-700 dark:text-teal-400">Edit</button>}>
      {maxValue ? (
        <div className="rounded-xl bg-teal-50 p-3 dark:bg-teal-500/10">
          <div className="text-xs text-teal-800 dark:text-teal-300">Highest plot price you can pay</div>
          <div className="text-3xl font-bold tabular-nums text-teal-900 dark:text-teal-100">{short(maxValue)}</div>
          <div className="mt-1 text-xs text-teal-900/80 dark:text-teal-200/80">
            {short(p.savings)} savings + {short(at!.loan)} loan, after ~{stampPct}% stamp duty and fees.{' '}
            {limit === 'income' ? 'Your income caps the loan; more income or a co-applicant raises this.' : 'Your savings are the limit; the loan is within your income.'}
          </div>
        </div>
      ) : (
        <p className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">
          <button type="button" onClick={() => openSettings('profile')} className="font-semibold text-teal-700 underline dark:text-teal-400">Add your savings</button> to see the highest plot price you can pay and which plots are within reach.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Combined income" value={income ? `${short(income)}/mo` : '–'} />
        <Stat label="EMI you can take" value={income ? `${short(capacity)}/mo` : '–'} sub={`${p.foirPct}% FOIR − existing`} />
        <Stat label="Loan on income" value={byIncome != null ? short(byIncome) : '–'} sub={`${p.ratePct}% · ${p.tenureYears} yrs`} />
        <Stat label="Savings" value={p.savings ? short(p.savings) : '–'} />
      </div>

      {income && at ? (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Monthly income used for EMIs at the top plot</span>
            <span className="tabular-nums">{Math.round(existingPct + newPct)}%</span>
          </div>
          <div className="relative flex h-4 gap-0.5 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800" role="img" aria-label={`Existing EMIs ${Math.round(existingPct)}%, new EMI ${Math.round(newPct)}% of income`}>
            {existingPct ? <span className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${existingPct}%` }} /> : null}
            <span className="h-full rounded-r bg-teal-500 dark:bg-teal-400" style={{ width: `${Math.min(100, newPct)}%` }} />
            <span className="absolute inset-y-0 w-0.5 bg-slate-900 dark:bg-white" style={{ left: `${p.foirPct}%` }} title={`Bank limit ${p.foirPct}%`} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
            {existingPct ? <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-400" />Existing {rupees(p.existingEmis)}</span> : null}
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-teal-500" />New EMI {rupees(at.emi)}</span>
            <span>▏Bank limit {p.foirPct}%</span>
            <span>Left each month {rupees(Math.max(0, income - p.existingEmis - at.emi))}</span>
          </div>
        </div>
      ) : null}

      {reach ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <div className="text-sm">
            <b className="text-lg">{reach.all}</b> plots within reach at reserve
            <span className="block text-xs text-slate-500 dark:text-slate-400">{reach.d1} on 12 Oct · {reach.d2} on 16 Oct</span>
          </div>
          {reach.all ? (
            <button
              type="button"
              onClick={() => {
                setBudgetLakh(Math.floor(p.savings / 1e3) / 100)
                setBasis('own')
                navigate('/top')
              }}
              className="h-10 rounded-xl bg-teal-600 px-3 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Rank them in Top picks
            </button>
          ) : null}
        </div>
      ) : null}
    </Section>
  )
}

function BorrowingGrid({ profile: p }: { profile: LoanProfile }) {
  const grid = TENURES.map((t) => RATES.map((r) => maxLoanByIncome({ ...p, ratePct: r, tenureYears: t }) ?? 0))
  const max = Math.max(...grid.flat())
  return (
    <Section title="Loan on your income">
      <p className="-mt-1 mb-3 text-xs text-slate-500 dark:text-slate-400">How much a bank would lend at {p.foirPct}% FOIR, by interest rate and tenure. Darker = more. Your current terms are outlined.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] border-separate border-spacing-1 text-center text-sm tabular-nums">
          <thead>
            <tr className="text-xs text-slate-500 dark:text-slate-400">
              <th className="text-left font-medium">Tenure</th>
              {RATES.map((r) => <th key={r} className="font-medium">{r}%</th>)}
            </tr>
          </thead>
          <tbody>
            {TENURES.map((t, i) => (
              <tr key={t}>
                <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400">{t} yrs</th>
                {RATES.map((r, j) => {
                  const v = grid[i][j]
                  const mine = r === p.ratePct && t === p.tenureYears
                  const a = 0.12 + 0.6 * (v / max)
                  return (
                    <td
                      key={r}
                      className={`rounded-md py-2 ${mine ? 'ring-2 ring-slate-900 dark:ring-white' : ''} ${a > 0.5 ? 'text-white' : ''}`}
                      style={{ backgroundColor: `color-mix(in oklab, var(--color-teal-600) ${Math.round(a * 100)}%, transparent)` }}
                    >
                      {short(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">The bank also caps the loan at {p.ltvPct}% of the plot's value, and it can only pay the balance instalment.</p>
    </Section>
  )
}

function BudgetBands({ profile, stampPct }: { profile: LoanProfile; stampPct: number }) {
  // full LTV loan regardless of income, to show the income each price needs
  const full: LoanProfile = { ...profile, netMonthlyIncome: 0, coApplicantIncome: 0 }
  const income = profile.netMonthlyIncome + profile.coApplicantIncome
  return (
    <Section title="What each plot price needs">
      <p className="-mt-1 mb-3 text-xs text-slate-500 dark:text-slate-400">
        Plots = how many have a reserve at or below that price. With a {profile.ltvPct}% loan at {profile.ratePct}% for {profile.tenureYears} yrs, plus ~{stampPct}% stamp duty and fees.
      </p>
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full text-xs tabular-nums sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="py-1.5 font-medium">Price</th>
              <th className="py-1.5 text-right font-medium">Own cash</th>
              <th className="py-1.5 text-right font-medium">EMI</th>
              <th className="py-1.5 text-right font-medium">Income/mo</th>
              <th className="py-1.5 text-right font-medium">Plots</th>
            </tr>
          </thead>
          <tbody>
            {BANDS.map((v) => {
              const f = ownFundsForValue(v, stampPct, full)
              const need = incomeNeededFor(f.loan, profile)
              const count = PLOTS.filter((p) => p.reservePrice <= v).length
              const okIncome = income ? income >= need : null
              const okCash = profile.savings ? profile.savings >= f.own : null
              return (
                <tr key={v} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                  <td className="py-2 font-semibold">{short(v)}</td>
                  <td className={`py-2 text-right ${okCash === false ? 'text-rose-600 dark:text-rose-400' : ''}`}>{okCash ? '✓ ' : ''}{short(f.own)}</td>
                  <td className="py-2 text-right">{short(f.emi)}</td>
                  <td className={`py-2 text-right ${okIncome === false ? 'text-rose-600 dark:text-rose-400' : ''}`}>{okIncome ? '✓ ' : ''}{short(need)}</td>
                  <td className="py-2 text-right">
                    <Link to={`/?priceMax=${v / LAKH}`} className="font-semibold text-teal-700 underline dark:text-teal-400">{count}</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {income || profile.savings ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">✓ = your income / savings cover it. Red = short.</p>
      ) : null}
    </Section>
  )
}

function PriceHistogram({ profile, stampPct }: { profile: LoanProfile; stampPct: number }) {
  const navigate = useNavigate()
  const maxValue = profile.savings ? maxValueForSavings(profile.savings, stampPct, profile) : 0
  const bins = useMemo(() => {
    const edges = Array.from({ length: 10 }, (_, i) => (75 + i * 25) * LAKH) // 75L … 300L
    return edges.map((lo, i) => {
      const hi = i === edges.length - 1 ? Infinity : edges[i + 1]
      return { lo, hi, n: PLOTS.filter((p) => p.reservePrice >= lo && p.reservePrice < hi).length }
    }).filter((b) => b.n)
  }, [])
  const max = Math.max(...bins.map((b) => b.n))
  return (
    <Section title="Reserve prices">
      <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">
        Number of plots in each price range{maxValue ? <>. <span className="font-semibold text-teal-700 dark:text-teal-400">Teal</span> = within your reach ({short(maxValue)})</> : ''}. Tap a bar to list those plots.
      </p>
      {bins.map((b) => (
        <BarRow
          key={b.lo}
          label={b.hi === Infinity ? `${cr(b.lo)} Cr +` : `${cr(b.lo)}–${cr(b.hi)} Cr`}
          value={b.n}
          max={max}
          text={`${b.n}`}
          on={!maxValue || b.lo < maxValue}
          title={`${b.n} plots`}
          onClick={() => navigate(`/?priceMin=${b.lo / LAKH}${b.hi === Infinity ? '' : `&priceMax=${b.hi / LAKH}`}&sort=price`)}
        />
      ))}
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Median reserve {short(median(PLOTS.map((p) => p.reservePrice)))} · median rate ₹{num(median(PLOTS.map((p) => p.rate)), 0)}/sq.yd
      </p>
    </Section>
  )
}

function BlockRates() {
  const navigate = useNavigate()
  const [all, setAll] = useState(false)
  const rows = useMemo(
    () =>
      Object.entries(blockAvgRate)
        .map(([b, r]) => ({ b, r, n: PLOTS.filter((p) => p.block === b).length }))
        .sort((a, b) => a.r - b.r),
    [],
  )
  const max = Math.max(...rows.map((r) => r.r))
  const shown = all ? rows : rows.slice(0, 8)
  return (
    <Section title="Average rate by block" right={<button onClick={() => setAll((a) => !a)} className="h-9 text-sm font-semibold text-teal-700 dark:text-teal-400">{all ? 'Cheapest 8' : `All ${rows.length}`}</button>}>
      <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">Reserve ₹/sq.yd, cheapest first. Tap a block to see its plots.</p>
      {shown.map((r) => (
        <BarRow
          key={r.b}
          label={<>{blockLabel(r.b)} <span className="text-slate-400">·{r.n}</span></>}
          value={r.r}
          max={max}
          text={`₹${num(r.r / 1000, 1)}k`}
          title={`${blockLabel(r.b)}: ${r.n} plots, avg ₹${num(r.r, 0)}/sq.yd`}
          onClick={() => navigate(`/?blocks=${encodeURIComponent(r.b)}`)}
        />
      ))}
    </Section>
  )
}

function BestValue() {
  const { open } = usePreview()
  const picks = useMemo(
    () =>
      PLOTS.map((p) => ({ p, d: (p.rate - blockAvgRate[p.block]) / blockAvgRate[p.block] }))
        .filter((x) => x.d < 0)
        .sort((a, b) => a.d - b.d || a.p.vastuRank - b.p.vastuRank)
        .slice(0, 8),
    [],
  )
  return (
    <Section title="Priced below their block">
      <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">Plots whose reserve rate is furthest under their block's average. Check why before bidding: a drain or odd shape often explains it.</p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {picks.map(({ p, d }) => (
          <li key={p.id}>
            <Link to={`/plot/${p.id}`} onClick={previewClick(() => open(p.id))} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{p.unit}</span> <span className="text-xs text-slate-500 dark:text-slate-400">{blockLabel(p.block)} · {short(p.reservePrice)}</span>
              </span>
              <FacingBadge facing={p.facing} />
              <span className="w-14 text-right text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{(d * 100).toFixed(0)}%</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

function Mix() {
  const navigate = useNavigate()
  const count = (fn: (p: Plot) => boolean) => PLOTS.filter(fn).length
  const facing = VASTU_ORDER.map((f) => ({ f, n: count((p) => p.facing === f) }))
  const fmax = Math.max(...facing.map((x) => x.n))
  const roads = [60, 40, 30, 24].map((w, i, a) => ({ w, n: count((p) => p.maxRoad >= w && (i === 0 || p.maxRoad < a[i - 1])) }))
  const rmax = Math.max(...roads.map((x) => x.n))
  const days = ([1, 2] as const).map((d) => {
    const ps = PLOTS.filter((p) => p.day === d)
    return { d, n: ps.length, rate: ps.reduce((a, p) => a + p.rate, 0) / ps.length, med: median(ps.map((p) => p.reservePrice)), corner: ps.filter((p) => p.isCorner || p.roadSides >= 3).length }
  })
  return (
    <Section title="What's on offer">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Facing (vastu order)</div>
          {facing.map((x) => (
            <BarRow key={x.f} label={x.f} value={x.n} max={fmax} text={x.n} onClick={() => navigate(`/?facing=${x.f}`)} title={`${x.n} ${x.f}-facing plots`} />
          ))}
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Widest road</div>
          {roads.map((x) => (
            <BarRow key={x.w} label={`${x.w}′`} value={x.n} max={rmax} text={x.n} onClick={() => navigate(`/?minRoad=${x.w}`)} title={`${x.n} plots with a ${x.w}′ road as the widest`} />
          ))}
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-300">
            <b>{count((p) => p.isCorner || p.roadSides >= 3)}</b> corner or 3-side-open plots · <b>{count((p) => !p.tags.some((t) => t.kind === 'bad'))}</b> with no recorded concerns
          </div>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {days.map((x) => (
          <div key={x.d} className="rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
            <div className="font-semibold">{x.d === 1 ? 'Day 1 · 12 Oct' : 'Day 2 · 16 Oct'}</div>
            <div className="mt-1 text-lg font-bold">{x.n} plots</div>
            <div className="text-slate-500 dark:text-slate-400">Avg ₹{num(x.rate, 0)}/sq.yd</div>
            <div className="text-slate-500 dark:text-slate-400">Median {short(x.med)}</div>
            <div className="text-slate-500 dark:text-slate-400">{x.corner} corner / 3-side</div>
          </div>
        ))}
      </div>
    </Section>
  )
}
