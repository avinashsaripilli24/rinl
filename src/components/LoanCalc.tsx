import { useLoanProfile } from '../hooks/useApp'
import { rupees, short } from '../lib/format'
import { LOAN_PRESETS, type LoanPlanResult, type LoanProfile, type MoneyResult } from '../lib/loan'
import { Chip, Icon, Section } from './ui'

function Field({ label, hint, value, onChange, step = 1, suffix, min = 0, max }: { label: string; hint?: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string; min?: number; max?: number }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="min-w-0">
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
          className={`h-10 rounded-lg border border-slate-300 bg-white px-2 text-right tabular-nums dark:border-slate-600 dark:bg-slate-900 ${suffix ? 'w-28 pr-9' : 'w-32'}`}
        />
        {suffix ? <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span> : null}
      </span>
    </label>
  )
}

function Card({ label, value, sub, tone = 'plain' }: { label: string; value: string; sub?: string; tone?: 'plain' | 'teal' | 'amber' }) {
  const tones = {
    plain: 'border-slate-200 dark:border-slate-800',
    teal: 'border-teal-300 bg-teal-50 dark:border-teal-700 dark:bg-teal-500/10',
    amber: 'border-amber-300 bg-amber-50 dark:border-amber-600/60 dark:bg-amber-500/10',
  }
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      {sub ? <div className="text-xs text-slate-500 dark:text-slate-400">{sub}</div> : null}
    </div>
  )
}

export default function LoanCalc({ m, lp, peak }: { m: MoneyResult; lp: LoanPlanResult; peak: number }) {
  const { profile: p, set, reset } = useLoanProfile()
  const income = p.netMonthlyIncome + p.coApplicantIncome
  const shortOfFull = lp.fullLoan - lp.loanUsed
  const setNum = (k: keyof LoanProfile) => (v: number) => set({ [k]: v } as Partial<LoanProfile>)

  return (
    <Section title="Bank loan & cash in hand">
      <div className="grid grid-cols-2 gap-3">
        <Card
          label="Eligible loan"
          value={short(lp.eligible)}
          sub={lp.bindingLimit === 'income' ? 'Limited by your income' : income ? `Limited by ${p.ltvPct}% LTV` : `${p.ltvPct}% LTV · add income below`}
        />
        <Card label="Loan used (pays the balance)" value={short(lp.loanUsed)} sub={`EMI ${rupees(lp.emi)}/month · ${p.tenureYears} yrs @ ${p.ratePct}%`} />
        <Card label="Own funds needed (net)" value={short(lp.ownFunds)} sub={`${Math.round((lp.ownFunds / (m.total + lp.processingFee)) * 100)}% of the all-in cost`} tone="teal" />
        <Card
          label="Peak cash in hand"
          value={short(peak)}
          sub={p.scenario === 'own-funds-then-loan' ? 'Own money out before the loan reimburses you' : 'Highest own money out at any time'}
          tone={peak > lp.ownFunds ? 'amber' : 'plain'}
        />
      </div>

      {income ? (
        shortOfFull > 1000 ? (
          <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <Icon name="alert" className="h-5 w-5 shrink-0" />
            <span>
              Your income supports {short(lp.loanUsed)}, which is {short(shortOfFull)} less than the full {p.ltvPct}% loan. To borrow the full amount you'd need about{' '}
              <b>{rupees(lp.minIncomeForFullLoan)}/month</b> combined net income, or {short(shortOfFull)} more of your own money.
            </span>
          </p>
        ) : (
          <p className="mt-3 flex gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
            <Icon name="check" className="h-5 w-5 shrink-0" />
            <span>
              Your income supports the full {p.ltvPct}% loan. The EMI of {rupees(lp.emi)} is {Math.round(((lp.emi + p.existingEmis) / income) * 100)}% of your income, including existing EMIs.
            </span>
          </p>
        )
      ) : (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Add your monthly income under <b>Customise</b> to check whether a bank will lend the full amount. The full {p.ltvPct}% loan needs about{' '}
          <b>{rupees(lp.minIncomeForFullLoan)}/month</b> net income (at {p.foirPct}% FOIR).
        </p>
      )}

      <div className="mt-4">
        <div className="mb-1.5 text-sm font-semibold">How the loan reaches RINL</div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
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
              className={`rounded-xl border p-3 text-left ${p.scenario === v ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10' : 'border-slate-200 dark:border-slate-800'}`}
            >
              <div className="text-sm font-semibold">{l}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{h}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          RFP clause 5.6 bars any mortgage or charge on the plot until the sale deed is registered, and 100% of the price is due within 45 days of the LoA (75 with interest). Confirm with RINL and your bank that a loan can pay RINL before the deed. If not, plan for the peak cash shown above.
        </p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500 dark:text-slate-400">Loan limit by LTV</dt>
        <dd className="text-right tabular-nums">{rupees(lp.ltvLimit)}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Loan limit by income</dt>
        <dd className="text-right tabular-nums">{lp.incomeLimit == null ? 'Not entered' : rupees(lp.incomeLimit)}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Balance the loan can fund</dt>
        <dd className="text-right tabular-nums">{rupees(m.balance)}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Loan processing fee + GST</dt>
        <dd className="text-right tabular-nums">{rupees(lp.processingFee)}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Total interest ({p.tenureYears} yrs)</dt>
        <dd className="text-right tabular-nums">{rupees(lp.totalInterest)}</dd>
        <dt className="text-slate-500 dark:text-slate-400">Total repaid to the bank</dt>
        <dd className="text-right tabular-nums">{rupees(lp.totalRepay)}</dd>
      </dl>

      <details className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/40">
        <summary className="cursor-pointer font-medium">Customise loan &amp; income (applies to all plots)</summary>
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {LOAN_PRESETS.map((pr) => (
              <Chip key={pr.label} active={Object.entries(pr.patch).every(([k, v]) => p[k as keyof LoanProfile] === v)} onClick={() => set(pr.patch)}>
                {pr.label}
              </Chip>
            ))}
          </div>
          <Field label="Your net monthly income" value={p.netMonthlyIncome} onChange={setNum('netMonthlyIncome')} step={5000} suffix="₹" />
          <Field label="Co-applicant net income" hint="Spouse/parent, optional" value={p.coApplicantIncome} onChange={setNum('coApplicantIncome')} step={5000} suffix="₹" />
          <Field label="Existing EMIs per month" value={p.existingEmis} onChange={setNum('existingEmis')} step={1000} suffix="₹" />
          <Field label="Loan-to-value" hint="Plot loans: 70–80%. Stamp duty is not financed." value={p.ltvPct} onChange={setNum('ltvPct')} max={90} suffix="%" />
          <Field label="Interest rate" value={p.ratePct} onChange={setNum('ratePct')} step={0.05} max={20} suffix="%" />
          <Field label="Tenure" hint="Plot loans are usually 10–15 yrs" value={p.tenureYears} onChange={setNum('tenureYears')} max={30} suffix="yrs" />
          <Field label="FOIR" hint="Share of income banks allow for all EMIs" value={p.foirPct} onChange={setNum('foirPct')} max={75} suffix="%" />
          <Field label="Processing fee" hint="+18% GST" value={p.processingFeePct} onChange={setNum('processingFeePct')} step={0.05} max={3} suffix="%" />
          <button type="button" onClick={reset} className="text-sm font-semibold text-teal-700 underline dark:text-teal-400">
            Reset loan terms (keeps your income)
          </button>
        </div>
      </details>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Indicative figures only. Actual eligibility depends on the bank, your credit score and its valuation of the plot.
      </p>
    </Section>
  )
}
