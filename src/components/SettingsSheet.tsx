import { useEffect, useRef, type ReactNode } from 'react'
import { useLoanProfile, useSettingsDrawer, useStampPct, useWeights } from '../hooks/useApp'
import { maxLoanByIncome, LOAN_PRESETS, type LoanProfile } from '../lib/loan'
import { rupees, short } from '../lib/format'
import type { Weights } from '../lib/types'
import { Chip, Icon } from './ui'

export const WEIGHT_LABELS: Record<keyof Weights, string> = {
  vastu: 'Vastu facing',
  corner: 'Corner / open sides',
  road: 'Road width',
  value: 'Value (lower ₹/sq.yd)',
  area: 'Bigger area',
  features: 'Features vs concerns',
}

function Field({ label, hint, value, onChange, step = 1, suffix, min = 0, max }: { label: string; hint?: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string; min?: number; max?: number }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1">
      <span className="min-w-0 text-sm">
        {label}
        {hint ? <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
      </span>
      <span className="relative shrink-0">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value || ''}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className={`h-10 rounded-lg border border-slate-300 bg-white px-2 text-right tabular-nums dark:border-slate-600 dark:bg-slate-950 ${suffix ? 'w-32 pr-9' : 'w-32'}`}
        />
        {suffix ? <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  )
}

function Group({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={`settings-${id}`} className="scroll-mt-2 border-b border-slate-200 py-4 last:border-0 dark:border-slate-800">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</h3>
      {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      <div className="mt-2 space-y-1">{children}</div>
    </section>
  )
}

export default function SettingsSheet() {
  const { section, close } = useSettingsDrawer()
  const { profile: p, set, reset } = useLoanProfile()
  const [stampPct, setStampPct] = useStampPct()
  const { weights, setWeights, reset: resetWeights } = useWeights()
  const body = useRef<HTMLDivElement>(null)
  const open = section != null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => body.current?.querySelector(`#settings-${section}`)?.scrollIntoView({ block: 'start' }))
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, section])

  if (!open) return null
  const setNum = (k: keyof LoanProfile) => (v: number) => set({ [k]: v } as Partial<LoanProfile>)
  const income = p.netMonthlyIncome + p.coApplicantIncome
  const byIncome = maxLoanByIncome(p)
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Settings">
      <button className="absolute inset-0 bg-slate-950/50" aria-label="Close settings" onClick={close} />
      <div className="relative flex h-full w-[min(26rem,92vw)] flex-col bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold">Settings</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Saved on this device · applies to every plot</p>
          </div>
          <button onClick={close} className="grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div ref={body} className="flex-1 overflow-y-auto px-4 pb-8">
          <Group id="profile" title="Your finances" hint="Used for loan eligibility, own funds and the Insights tab.">
            <Field label="Your net monthly income" value={p.netMonthlyIncome} onChange={setNum('netMonthlyIncome')} step={5000} suffix="₹" />
            <Field label="Co-applicant net income" hint="Spouse/parent, optional" value={p.coApplicantIncome} onChange={setNum('coApplicantIncome')} step={5000} suffix="₹" />
            <Field label="Existing EMIs per month" value={p.existingEmis} onChange={setNum('existingEmis')} step={1000} suffix="₹" />
            <Field label="Savings for this purchase" hint="Own cash you can put in" value={p.savings} onChange={setNum('savings')} step={100000} suffix="₹" />
            <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              {income
                ? <>Combined {rupees(income)}/month · a bank would lend up to about <b>{short(byIncome ?? 0)}</b> on income (before the {p.ltvPct}% LTV cap).</>
                : 'Add your income to see how much a bank would lend.'}
              {p.savings ? <> Savings {short(p.savings)}.</> : null}
            </p>
          </Group>

          <Group id="loan" title="Loan terms">
            <div className="flex flex-wrap gap-2 pb-1">
              {LOAN_PRESETS.map((pr) => (
                <Chip key={pr.label} active={Object.entries(pr.patch).every(([k, v]) => p[k as keyof LoanProfile] === v)} onClick={() => set(pr.patch)}>
                  {pr.label}
                </Chip>
              ))}
            </div>
            <Field label="Loan-to-value" hint="Plot loans: 70–80%. Stamp duty is not financed." value={p.ltvPct} onChange={setNum('ltvPct')} max={90} suffix="%" />
            <Field label="Interest rate" value={p.ratePct} onChange={setNum('ratePct')} step={0.05} max={20} suffix="%" />
            <Field label="Tenure" hint="Plot loans are usually 10–15 yrs" value={p.tenureYears} onChange={setNum('tenureYears')} max={30} suffix="yrs" />
            <Field label="FOIR" hint="Share of income banks allow for all EMIs" value={p.foirPct} onChange={setNum('foirPct')} max={75} suffix="%" />
            <Field label="Processing fee" hint="+18% GST" value={p.processingFeePct} onChange={setNum('processingFeePct')} step={0.05} max={3} suffix="%" />
            <div className="pt-2 text-sm font-medium">How the loan reaches RINL</div>
            <div className="grid gap-2" role="radiogroup">
              {(
                [
                  ['bank-before-deed', 'Bank pays RINL directly', 'Needs RINL’s NOC/tripartite letter before the deed'],
                  ['own-funds-then-loan', 'Own funds first, loan after deed', 'Pay 100% yourself (bridge), then take the loan'],
                ] as const
              ).map(([v, l, h]) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={p.scenario === v}
                  onClick={() => set({ scenario: v })}
                  className={`rounded-xl border p-2.5 text-left ${p.scenario === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  <div className="text-sm font-semibold">{l}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{h}</div>
                </button>
              ))}
            </div>
            <button type="button" onClick={reset} className="pt-2 text-sm font-semibold text-teal-700 underline dark:text-teal-400">
              Reset loan terms (keeps your finances)
            </button>
          </Group>

          <Group id="costs" title="Purchase costs">
            <Field label="Stamp + transfer + registration" hint="AP estimate: 5 + 1.5 + 1" value={stampPct} onChange={setStampPct} step={0.5} max={20} suffix="%" />
          </Group>

          <Group id="weights" title="What matters to you" hint="Weights behind the overall score on every screen.">
            {(Object.keys(WEIGHT_LABELS) as (keyof Weights)[]).map((k) => (
              <label key={k} className="block">
                <div className="flex justify-between text-sm">
                  <span>{WEIGHT_LABELS[k]}</span>
                  <span className="tabular-nums text-slate-500">{Math.round((weights[k] / total) * 100)}%</span>
                </div>
                <input type="range" min={0} max={50} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} className="h-8 w-full" />
              </label>
            ))}
            <button onClick={resetWeights} className="text-sm font-semibold text-teal-700 underline dark:text-teal-400">Reset to defaults</button>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Vastu uses your order NE › E › N › NW › SE › W › S. Value and area are compared across all plots.
            </p>
          </Group>
        </div>
      </div>
    </div>
  )
}
