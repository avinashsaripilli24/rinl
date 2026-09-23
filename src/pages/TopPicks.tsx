import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { previewClick } from '../components/PlotCard'
import { Badge, Chip, FacingBadge, Icon, LoadMore, Section } from '../components/ui'
import { openSettings, useEmi, useLoanProfile, usePreview, useShortlist, useStampPct, useWeights } from '../hooks/useApp'
import { useInfinite } from '../hooks/useInfinite'
import { useStored } from '../hooks/useStored'
import { allInFactor, costAt as cost, maxRateFor as maxRate, type Basis } from '../lib/afford'
import { PLOTS, factors, score } from '../lib/derive'
import { blockLabel, num, short } from '../lib/format'
import type { Plot } from '../lib/types'

const PAGE = 25

type RankKey = 'overall' | 'vastu' | 'corner' | 'road' | 'value' | 'area' | 'features' | 'headroom'
const RANKS: { key: RankKey; label: string; hint: string }[] = [
  { key: 'overall', label: 'Overall', hint: 'Weighted score (weights set in Settings)' },
  { key: 'vastu', label: 'Vastu', hint: 'NE › E › N › NW › SE › W › S, then more road sides' },
  { key: 'corner', label: 'Corner', hint: '3-side open › corner › two opposite roads › one road' },
  { key: 'road', label: 'Road width', hint: 'Widest road on the plot: 60′ › 40′ › 30′ › 24′' },
  { key: 'value', label: 'Cheapest ₹/sq.yd', hint: 'Lowest reserve rate per sq.yd' },
  { key: 'area', label: 'Biggest', hint: 'Largest area that fits the budget' },
  { key: 'features', label: 'Features', hint: 'Most highlights, fewest concerns' },
  { key: 'headroom', label: 'Bid headroom', hint: 'Most room to bid above reserve within budget' },
]

export default function TopPicks() {
  const [budgetLakh, setBudgetLakh] = useStored<number>('budgetLakh', 150)
  const [basis, setBasis] = useStored<Basis>('budgetBasis', 'allin')
  const [rankBy, setRankBy] = useState<RankKey>('overall')
  const [day, setDay] = useState<0 | 1 | 2>(0)
  const [cornerOnly, setCornerOnly] = useState(false)
  const [noBad, setNoBad] = useState(false)
  const [stampPct] = useStampPct()
  const { weights } = useWeights()
  const { has, toggle } = useShortlist()
  const { profile } = useLoanProfile()
  const { open } = usePreview()
  const { emiFor, cappedFor, hint } = useEmi()

  const budget = (budgetLakh || 0) * 1e5
  const savingsLakh = Math.floor(profile.savings / 1e3) / 100
  const k = allInFactor(stampPct)
  const costAt = (p: Plot, rate: number) => cost(p, rate, basis, stampPct, profile)
  const maxRateFor = (p: Plot) => maxRate(p, budget, basis, stampPct, profile)

  const { fitting, picks } = useMemo(() => {
    const rows = PLOTS.filter((p) => costAt(p, p.rate) <= budget)
      .filter((p) => (!day || p.day === day) && (!cornerOnly || p.isCorner || p.roadSides >= 3))
      .filter((p) => !noBad || !p.tags.some((t) => t.kind === 'bad'))
      .map((p) => {
        const maxRate = maxRateFor(p)
        return { p, s: score(p, weights), f: factors(p), maxRate, headroom: Math.max(0, maxRate - p.rate) }
      })
    const bad = (p: Plot) => p.tags.filter((t) => t.kind === 'bad').length
    const good = (p: Plot) => p.tags.filter((t) => t.kind === 'good').length
    const key: Record<RankKey, (r: (typeof rows)[number]) => number[]> = {
      overall: (r) => [-r.s],
      vastu: (r) => [r.p.vastuRank, -r.p.roadSides, -r.s],
      corner: (r) => [-r.f.corner, r.p.vastuRank, -r.s],
      road: (r) => [-r.p.maxRoad, -r.p.roadSides, -r.s],
      value: (r) => [r.p.rate, -r.s],
      area: (r) => [-r.p.area, -r.s],
      features: (r) => [bad(r.p) - good(r.p), -r.s],
      headroom: (r) => [-r.headroom / r.p.rate, -r.s],
    }
    const cmp = (a: number[], b: number[]) => {
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
      return 0
    }
    const sorted = [...rows].sort((a, b) => cmp(key[rankBy](a), key[rankBy](b)))
    return { fitting: rows.length, picks: sorted }
  }, [budget, k, basis, profile, day, cornerOnly, noBad, rankBy, weights])
  const { limit, sentinel, more } = useInfinite(picks.length, PAGE, `${budget}|${basis}|${day}|${cornerOnly}|${noBad}|${rankBy}`)

  const rank = RANKS.find((r) => r.key === rankBy)!

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Top picks for your budget</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Every plot you can afford at reserve price, ranked your way.</p>
      </div>

      <Section title="Budget">
        <div className="flex items-center gap-3">
          <label className="relative flex-1">
            <span className="sr-only">Budget in lakh</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={5}
              value={budgetLakh || ''}
              onChange={(e) => setBudgetLakh(Number(e.target.value))}
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-7 pr-16 text-lg font-semibold tabular-nums dark:border-slate-700 dark:bg-slate-950"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">lakh</span>
          </label>
          <div className="text-right text-sm">
            <div className="font-semibold">{short(budget)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{fitting} plots fit</div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {profile.savings ? (
            <Chip active={budgetLakh === savingsLakh && basis === 'own'} onClick={() => { setBudgetLakh(savingsLakh); setBasis('own') }}>
              My savings
            </Chip>
          ) : null}
          {[100, 125, 150, 200, 300].map((v) => (
            <Chip key={v} active={budgetLakh === v} onClick={() => setBudgetLakh(v)}>
              {v >= 100 ? `${v / 100} Cr` : `${v} L`}
            </Chip>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 rounded-xl bg-slate-100 p-1 text-sm dark:bg-slate-800" role="radiogroup" aria-label="Budget covers">
          {(
            [
              ['allin', 'All-in cost'],
              ['own', 'Own funds (with loan)'],
              ['reserve', 'Reserve only'],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              role="radio"
              aria-checked={basis === v}
              onClick={() => setBasis(v)}
              className={`min-h-10 rounded-lg px-1 text-xs font-semibold leading-tight sm:text-sm ${basis === v ? 'bg-white shadow dark:bg-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {basis === 'allin'
            ? `All-in = reserve price + ~${stampPct}% stamp/transfer/registration + 0.1% auction fee + GST. A plot fits if all of that is within your budget.`
            : basis === 'own'
              ? `Own funds = all-in cost + loan processing fee − the bank loan (${profile.ltvPct}% LTV${profile.netMonthlyIncome ? ', capped by your income' : ''} at ${profile.ratePct}%). The loan can only pay the balance instalment.`
              : 'Only the reserve price has to fit. Stamp duty (~7.5%) and fees come on top.'}{' '}
          The auction starts at reserve, so bidding pushes the price up.{' '}
          <button type="button" onClick={() => openSettings(basis === 'own' ? 'profile' : 'costs')} className="font-semibold text-teal-700 underline dark:text-teal-400">
            Edit assumptions
          </button>
        </p>
      </Section>

      <div>
        <div className="mb-2 text-sm font-semibold">Rank by</div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {RANKS.map((r) => (
            <Chip key={r.key} active={rankBy === r.key} onClick={() => setRankBy(r.key)}>
              {r.label}
            </Chip>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{rank.hint}</p>
        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip active={day === 0} onClick={() => setDay(0)}>Both days</Chip>
          <Chip active={day === 1} onClick={() => setDay(1)}>12 Oct</Chip>
          <Chip active={day === 2} onClick={() => setDay(2)}>16 Oct</Chip>
          <Chip active={cornerOnly} onClick={() => setCornerOnly(!cornerOnly)}>Corner only</Chip>
          <Chip active={noBad} onClick={() => setNoBad(!noBad)}>No concerns</Chip>
        </div>
      </div>

      {picks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm dark:border-slate-700">
          No plot fits {short(budget)}{basis === 'allin' ? ' all-in' : ''} with these options. The cheapest plot's reserve is{' '}
          {short(Math.min(...PLOTS.map((p) => p.reservePrice)))}.
        </div>
      ) : (
        <ol className="space-y-3">
          {picks.slice(0, limit).map(({ p, s, maxRate, headroom }, i) => {
            const allIn = p.reservePrice * allInFactor(stampPct)
            const good = p.tags.filter((t) => t.kind === 'good' && !['corner', 'open3', 'frontback', 'road60', 'road40'].includes(t.key))
            const bad = p.tags.filter((t) => t.kind === 'bad')
            return (
              <li key={p.id} className="relative rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Link to={`/plot/${p.id}`} onClick={previewClick(() => open(p.id))} className="flex gap-3 p-3.5 pr-14">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-bold ${
                      i < 3 ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                    aria-label={`Rank ${i + 1}`}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-lg font-bold leading-tight">{p.unit}</h3>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{blockLabel(p.block)}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-sm tabular-nums">
                      <span className="font-semibold">{short(p.reservePrice)}</span>
                      <span className="text-slate-600 dark:text-slate-300">₹{num(p.rate, 0)}/sq.yd</span>
                      <span className="text-slate-600 dark:text-slate-300">{num(p.area)} sq.yd</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <FacingBadge facing={p.facing} rank={p.vastuRank <= 8 ? p.vastuRank : undefined} />
                      {p.roadSides >= 2 ? <Badge tone="violet">{p.roadSides >= 3 ? '3-side open' : p.isCorner ? 'Corner' : 'Front & back roads'}</Badge> : null}
                      {p.maxRoad ? <Badge tone={p.maxRoad >= 60 ? 'teal' : p.maxRoad >= 40 ? 'sky' : 'slate'}>{p.maxRoad}′ road</Badge> : null}
                      <Badge tone={p.day === 1 ? 'sky' : 'amber'}>{p.day === 1 ? '12 Oct' : '16 Oct'}</Badge>
                      {good.map((t) => <Badge key={t.key} tone="emerald">＋ {t.label}</Badge>)}
                      {bad.map((t) => <Badge key={t.key} tone="rose">− {t.label.split('.')[0]}</Badge>)}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-2 text-xs sm:grid-cols-3 dark:bg-slate-800/50">
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">{basis === 'own' ? 'Own funds at reserve' : 'All-in at reserve'}</div>
                        <div className="font-semibold tabular-nums">{short(basis === 'own' ? costAt(p, p.rate) : allIn)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 dark:text-slate-400">Max bid in budget</div>
                        <div className="font-semibold tabular-nums">
                          ₹{num(maxRate, 0)}/sq.yd{' '}
                          <span className="font-normal text-emerald-700 dark:text-emerald-400">(+₹{num(headroom / 1000, 0)}k)</span>
                        </div>
                      </div>
                      <div title={hint}>
                        <div className="text-slate-500 dark:text-slate-400">EMI at reserve</div>
                        <div className="font-semibold tabular-nums">{emiFor(p) ? `${short(emiFor(p))}/mo` : 'No loan'}{cappedFor(p) ? <span className="font-normal text-slate-500 dark:text-slate-400"> · income max</span> : null}</div>
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="absolute right-2 top-2 flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={`grid h-11 w-11 place-items-center rounded-full ${has(p.id) ? 'text-amber-500' : 'text-slate-400'}`}
                    aria-label={has(p.id) ? `Remove ${p.unit} from shortlist` : `Add ${p.unit} to shortlist`}
                    aria-pressed={has(p.id)}
                  >
                    <Icon name="star" solid={has(p.id)} />
                  </button>
                  <span className="text-xs font-bold tabular-nums text-teal-700 dark:text-teal-300" title="Overall score">{s}</span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
      <LoadMore sentinel={sentinel} more={more} left={picks.length - limit} />
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Tap ☆ to add a plot to your shortlist, then compare the shortlisted plots side by side on the Compare tab. "Max bid in budget" is the highest bid per sq.yd that keeps your{' '}
        {basis === 'allin' ? 'all-in cost' : basis === 'own' ? 'own funds' : 'sale price'} within budget, in ₹1,000 steps.
      </p>
    </div>
  )
}
