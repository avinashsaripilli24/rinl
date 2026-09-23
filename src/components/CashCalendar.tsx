import { fmtDate, rupees, short } from '../lib/format'
import { buildIcs, downloadIcs } from '../lib/ics'
import type { Milestone } from '../lib/loan'
import type { Plot } from '../lib/types'
import { Icon, Section } from './ui'

const DAY = 86400000

export default function CashCalendar({ plot, ms }: { plot: Plot; ms: Milestone[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pays = ms.filter((x) => x.own > 0)
  const biggest = pays.reduce((a, b) => (b.own > a.own ? b : a), pays[0])
  const nextPay = pays.find((x) => x.date >= today)
  const peak = ms.reduce((a, b) => (b.runningOwn > a.runningOwn ? b : a), ms[0])

  const exportIcs = () => downloadIcs(`${plot.unit}-cash-plan.ics`, buildIcs(plot.unit, ms, short))

  return (
    <Section
      title="Arrange cash by"
      right={
        <button onClick={exportIcs} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-teal-700 dark:text-teal-400">
          <Icon name="calendar" className="h-4 w-4" /> Add to calendar
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {nextPay ? (
          <div className="rounded-xl bg-teal-50 p-3 text-sm dark:bg-teal-500/10">
            <div className="text-xs text-teal-800 dark:text-teal-300">Next payment</div>
            <div className="font-bold">
              {short(nextPay.own)} by {fmtDate(nextPay.date)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">{nextPay.label}</div>
          </div>
        ) : null}
        {biggest ? (
          <div className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-500/10">
            <div className="text-xs text-amber-800 dark:text-amber-300">Biggest payment</div>
            <div className="font-bold">
              {short(biggest.own)} by {fmtDate(biggest.date)}
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400">
              {biggest.label} · have {short(peak.runningOwn)} of your own money out by {fmtDate(peak.date)}
            </div>
          </div>
        ) : null}
      </div>

      <ol className="mt-4 space-y-0">
        {ms.map((x) => {
          const days = Math.round((x.date.getTime() - today.getTime()) / DAY)
          const past = days < 0
          const urgent = !past && days <= 3
          return (
            <li key={x.key} className={`relative flex gap-3 border-l-2 pb-4 pl-4 last:pb-0 ${x.kind === 'pay' ? 'border-teal-500' : x.kind === 'refund' ? 'border-emerald-500' : 'border-slate-200 dark:border-slate-700'} ${past ? 'opacity-50' : ''}`}>
              <span
                className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                  x.kind === 'pay' ? 'bg-teal-500' : x.kind === 'refund' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold tabular-nums">{fmtDate(x.date)}</span>
                  <span className={`text-xs font-semibold ${urgent ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {past ? 'passed' : days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}
                  </span>
                </div>
                <div className="text-sm font-medium">{x.label}</div>
                {x.detail ? <div className="text-xs text-slate-500 dark:text-slate-400">{x.detail}</div> : null}
                {x.own || x.bank ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    {x.own > 0 ? <span className="rounded-md bg-teal-100 px-2 py-0.5 font-semibold text-teal-900 dark:bg-teal-500/15 dark:text-teal-200">You pay {rupees(x.own)}</span> : null}
                    {x.own < 0 ? <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-200">You get back {rupees(-x.own)}</span> : null}
                    {x.bank > 0 && x.own >= 0 ? <span className="rounded-md bg-sky-100 px-2 py-0.5 font-semibold text-sky-900 dark:bg-sky-500/15 dark:text-sky-200">Bank pays {rupees(x.bank)}</span> : null}
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Own money so far {short(x.runningOwn)}</span>
                  </div>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Pay to {plot.day === 1 ? 'ESCROW-RINL-VSP-PHASE-1 · A/c 095511010000083' : 'ESCROW-RINL-VSP-PHASE-2 · A/c 095511010000084'} · Union Bank of India · IFSC UBIN0809551 by RTGS/NEFT. EMD
        and the auction fee are paid on eauction.enivida.com.
        {plot.listedInDayTable !== plot.day ? ' Confirm the account with RINL, because the PDFs disagree on this plot’s annexure.' : ''} Dates after the auction depend on the
        LoA date you assume above, and skip Sundays but not bank holidays. Keep a few days’ margin.
      </p>
    </Section>
  )
}
