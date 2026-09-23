import { Link } from 'react-router-dom'
import { Icon, Section } from '../components/ui'
import { DOCS } from '../lib/docs'
import { PLOTS } from '../lib/derive'
import { fmtDate, parseDmy, short } from '../lib/format'
import { BANK, CONTACTS, DATA_NOTES, GLOSSARY, LINKS, PROCESS, RFP, RULES, SCENARIOS, SCHEDULE } from '../lib/meta'

const today = new Date()
today.setHours(0, 0, 0, 0)

export default function Info() {
  const d1 = PLOTS.filter((p) => p.day === 1)
  const d2 = PLOTS.filter((p) => p.day === 2)
  const sum = (ps: typeof PLOTS) => ps.reduce((a, p) => a + p.reservePrice, 0)
  const next = SCHEDULE.find((s) => parseDmy(s.date) >= today)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Auction guide</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          RFP {RFP.number} dated {RFP.dated} · {RFP.location}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          ['Day 1 · 12 Oct', d1],
          ['Day 2 · 16 Oct', d2],
        ].map(([l, ps]) => (
          <div key={l as string} className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <div className="text-xs text-slate-500 dark:text-slate-400">{l as string}</div>
            <div className="text-xl font-bold">{(ps as typeof PLOTS).length} plots</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Reserve total {short(sum(ps as typeof PLOTS))}</div>
          </div>
        ))}
      </div>

      <Section title="Source documents">
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {DOCS.map((d) => (
            <li key={d.slug} className="flex items-center gap-2 py-1.5">
              <Link to={`/doc/${d.slug}`} className="flex min-h-11 min-w-0 flex-1 flex-col justify-center rounded-lg px-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="font-medium text-teal-700 dark:text-teal-400">{d.title}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{d.note}</span>
              </Link>
              <a href={d.file} download className="inline-flex h-9 items-center rounded-lg bg-slate-100 px-2.5 text-sm font-medium dark:bg-slate-800">
                Download
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Schedule">
        <ol className="space-y-2.5">
          {SCHEDULE.map((s) => {
            const d = parseDmy(s.date)
            const past = d < today
            const isNext = s === next
            return (
              <li key={s.date + s.label} className={`flex gap-3 ${past ? 'opacity-50' : ''}`}>
                <div className={`w-24 shrink-0 text-sm font-semibold tabular-nums ${isNext ? 'text-teal-700 dark:text-teal-400' : ''}`}>
                  {fmtDate(d).replace(/ \d{4}$/, '')}
                </div>
                <div className="text-sm">
                  {s.label}
                  {isNext ? <span className="ml-2 rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-semibold text-white">Next</span> : null}
                </div>
              </li>
            )
          })}
        </ol>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">RINL may change, postpone or cancel any date. Check the portals for corrigenda.</p>
      </Section>

      <Section title="How the e-auction works">
        <ol className="space-y-3">
          {PROCESS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-xs font-bold text-white">{i + 1}</span>
              <div className="text-sm">
                <div className="font-medium">{s.title}</div>
                <p className="text-slate-600 dark:text-slate-300">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800/60">
          <div className="font-semibold">Example: a 200 sq.yd plot, reserve ₹1,00,000/sq.yd</div>
          <ul className="mt-2 space-y-1.5 text-slate-600 dark:text-slate-300">
            <li><span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">11:05</span> · You bid ₹1,01,000. You are <b>H-1</b>.</li>
            <li><span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">14:30</span> · Someone bids ₹1,02,000. They are H-1; you drop to <b>H-2</b>.</li>
            <li><span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">18:55</span> · You bid ₹1,03,000. You are H-1 again, and because it is the last 10 minutes, closing moves to 19:05.</li>
            <li><span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">19:05</span> · No one bids again. You win at ₹1,03,000 × 200 = <b>₹2.06 crore</b>.</li>
          </ul>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            You then owe a fee of ₹20,600 + ₹3,708 GST, 10% (₹20.6 lakh) after the LoA, and the balance of ₹1.83 crore (₹2.06 crore − 10% − the ₹2 lakh EMD) within 45 days. Stamp duty and registration come on top.
          </p>
        </div>

        <h3 className="mt-4 text-sm font-semibold">More examples</h3>
        <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-800">
          {SCENARIOS.map((sc) => (
            <details key={sc.title} className="group py-2.5">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
                {sc.title}
                <Icon name="back" className="h-4 w-4 -rotate-90 text-slate-400 transition group-open:rotate-90" />
              </summary>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                {sc.steps.map((st) => (
                  <li key={st.time}>
                    <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{st.time}</span> · {st.text}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm font-medium">{sc.result}</p>
            </details>
          ))}
        </div>

        <h3 className="mt-4 text-sm font-semibold">Terms you will see</h3>
        <dl className="mt-2 space-y-2 text-sm">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="grid grid-cols-[5.5rem_1fr] gap-2">
              <dt className="font-semibold text-teal-700 dark:text-teal-400">{g.term}</dt>
              <dd className="text-slate-600 dark:text-slate-300">
                {g.meaning}
                <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">e.g. {g.example}</span>
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
          <b>Can you see other people’s bids?</b> Portals like this usually show the current H-1 rate and whether you are H-1, and hide bidder names. The RFP does not say so explicitly, so confirm it on the mock auction (06.10.2026) or ask at the pre-bid meeting.
        </p>
      </Section>

      <Section title="Rules that affect your money">
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {RULES.map((r) => (
            <details key={r.title} className="group py-2.5">
              <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-2 font-medium">
                {r.title}
                <Icon name="back" className="h-4 w-4 -rotate-90 text-slate-400 transition group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{r.body}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section title="Contacts">
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {CONTACTS.map((c) => (
            <li key={c.org + c.name} className="py-2.5">
              <div className="text-xs text-slate-500 dark:text-slate-400">{c.org}</div>
              <div className="font-medium">
                {c.name}
                {c.role ? <span className="font-normal text-slate-500 dark:text-slate-400"> · {c.role}</span> : null}
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {c.phones.map((ph) => (
                  <a key={ph} href={`tel:${ph.length === 10 ? '+91' + ph : ph}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-teal-50 px-2.5 text-sm font-semibold text-teal-800 dark:bg-teal-500/10 dark:text-teal-300">
                    <Icon name="phone" className="h-4 w-4" /> {ph}
                  </a>
                ))}
                {c.emails.map((em) => (
                  <a key={em} href={`mailto:${em}`} className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-sm dark:bg-slate-800">
                    <Icon name="mail" className="h-4 w-4 shrink-0" /> <span className="truncate">{em}</span>
                  </a>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Where to pay">
        <p className="text-sm text-slate-600 dark:text-slate-300">{BANK.note}</p>
        <div className="mt-3 space-y-3">
          {BANK.accounts.map((a) => (
            <div key={a.number} className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800/60">
              <div className="text-xs text-slate-500 dark:text-slate-400">{a.for}</div>
              <div className="font-semibold">{a.name}</div>
              <div className="flex items-center justify-between gap-2 tabular-nums">
                A/c {a.number}
                <button
                  onClick={() => navigator.clipboard?.writeText(a.number)}
                  className="h-8 rounded-lg px-2 text-xs font-semibold text-teal-700 dark:text-teal-400"
                >
                  Copy
                </button>
              </div>
            </div>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-[5rem_1fr] gap-x-2 gap-y-1 text-sm">
          <dt className="text-slate-500">Bank</dt><dd>{BANK.bank}</dd>
          <dt className="text-slate-500">Branch</dt><dd>{BANK.branch}</dd>
          <dt className="text-slate-500">IFSC</dt><dd className="tabular-nums">{BANK.ifsc}</dd>
          <dt className="text-slate-500">MICR</dt><dd className="tabular-nums">{BANK.micr}</dd>
          <dt className="text-slate-500">SWIFT</dt><dd>{BANK.swift}</dd>
          <dt className="text-slate-500">PAN</dt><dd>{BANK.pan}</dd>
        </dl>
      </Section>

      <Section title="Portals">
        <ul className="space-y-1">
          {LINKS.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-between gap-2 rounded-lg px-1 font-medium text-teal-700 hover:bg-slate-100 dark:text-teal-400 dark:hover:bg-slate-800">
                {l.label} <Icon name="external" className="h-4 w-4" />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="About this data">
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-slate-600 dark:text-slate-300">
          {DATA_NOTES.map((n) => <li key={n}>{n}</li>)}
          <li>{PLOTS.filter((p) => p.conflicts.length).length} plots carry a ⚠ note where the PDFs disagree (Block 9 map pin, Block 11A vs 11B, Block 42 auction day).</li>
        </ul>
      </Section>
    </div>
  )
}
