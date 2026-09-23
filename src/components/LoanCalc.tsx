import { openSettings, useLoanProfile } from '../hooks/useApp'
import { rupees, short } from '../lib/format'
import type { LoanPlanResult, MoneyResult } from '../lib/loan'
import { Icon, Section } from './ui'

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
  const { profile: p } = useLoanProfile()
  const income = p.netMonthlyIncome + p.coApplicantIncome
  const shortOfFull = lp.fullLoan - lp.loanUsed

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
          Add your monthly income in <button type="button" onClick={() => openSettings('profile')} className="font-semibold text-teal-700 underline dark:text-teal-400">Settings</button> to check whether a bank will lend the full amount. The full {p.ltvPct}% loan needs about{' '}
          <b>{rupees(lp.minIncomeForFullLoan)}/month</b> net income (at {p.foirPct}% FOIR).
        </p>
      )}

      <button
        type="button"
        onClick={() => openSettings('loan')}
        className="mt-3 flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left text-sm dark:border-slate-800"
      >
        <Icon name="gear" className="h-5 w-5 shrink-0 text-slate-500" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">
            {p.ratePct}% · {p.tenureYears} yrs · {p.ltvPct}% LTV · {p.scenario === 'bank-before-deed' ? 'bank pays RINL' : 'own funds, loan after deed'}
          </span>
          <span className="block text-xs text-slate-500 dark:text-slate-400">{income ? `Income ${rupees(income)}/month` : 'Income not set'} · change in Settings</span>
        </span>
        <span className="font-semibold text-teal-700 dark:text-teal-400">Edit</span>
      </button>
      {p.scenario === 'bank-before-deed' ? (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          RFP clause 5.6 bars any mortgage on the plot until the sale deed is registered. Confirm with RINL and your bank that a loan can pay RINL before the deed; if not, plan for the peak cash shown above.
        </p>
      ) : null}

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

      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        Indicative figures only. Actual eligibility depends on the bank, your credit score and its valuation of the plot.
      </p>
    </Section>
  )
}
