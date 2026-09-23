/** Sanity checks for derived plot data and search. Run: npx tsx scripts/check.ts */
import { DEFAULT_WEIGHTS, PLOTS, score } from '../src/lib/derive'
import { buildIcs } from '../src/lib/ics'
import { DEFAULT_LOAN, cashMilestones, emi, loanPlan, peakCash } from '../src/lib/loan'
import { money } from '../src/lib/money'
import { EMPTY, applyFilters } from '../src/lib/search'

let failed = 0
function expect(label: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failed++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}: ${JSON.stringify(got)}${ok ? '' : `  (want ${JSON.stringify(want)})`}`)
}
const u = (unit: string) => PLOTS.find((p) => p.unit === unit)!
const q = (text: string) => applyFilters(PLOTS, { ...EMPTY, q: text }, DEFAULT_WEIGHTS).map((p) => p.unit)

expect('total plots', PLOTS.length, 459)
expect('LIG-358 facing/sides', [u('LIG-358').facing, u('LIG-358').roadSides, u('LIG-358').maxRoad], ['NE', 2, 30])
expect('MIG-150 facing/road', [u('MIG-150').facing, u('MIG-150').maxRoad], ['NE', 60])
expect('MIG-130 roads', u('MIG-130').roads.map((r) => r.label), ["24' road", 'Krishna Road'])
expect('MIG-130 drain concern', u('MIG-130').tags.some((t) => t.key === 'drain'), true)
expect('LIG-565 narrow', [u('LIG-565').facing, u('LIG-565').tags.some((t) => t.key === 'narrow')], ['SE', true])
expect('Autonagar B2 industrial', [u('Autonagar B2').landUse, u('Autonagar B2').roadSides], ['Industrial', 3])
expect('MIG-82 conflict + day', [u('MIG-82').day, u('MIG-82').conflicts.length > 0], [2, true])
expect('LIG-549 11A/11B conflict', u('LIG-549').conflicts.some((c) => c.includes('11B')), true)
expect('LIG-586 block (merged cell fix)', u('LIG-586').block, '19')
expect('LIG-295 single south road', [u('LIG-295').facing, u('LIG-295').roadSides], ['S', 1])
expect('LIG-237 unknown width road east', u('LIG-237').roads.map((r) => [r.side, r.width]), [['E', null], ['S', 30]])
expect('LIG-544 corner N+E, flagged', [u('LIG-544').facing, u('LIG-544').roadSides, u('LIG-544').tags.some((t) => t.key === 'approachmismatch')], ['NE', 2, true])
expect('LIG-541 east facing', u('LIG-541').facing, 'E')
expect('MIG-130 not a corner', [u('MIG-130').isCorner, u('MIG-130').facing], [false, 'N'])
expect('every plot has a facing', PLOTS.filter((p) => !p.facing).map((p) => p.unit), [])
expect('every plot has a map url', PLOTS.filter((p) => !p.mapUrl).length, 0)

expect('search "40" (no block 40)', q('40'), [])
expect('search "39" all block 39', q('39').length, PLOTS.filter((p) => p.block === '39').length)
expect('search "block 11a"', q('block 11a').length, 14)
expect('search "LIG-358"', q('LIG-358'), ['LIG-358'])
expect('search "lig358"', q('lig358'), ['LIG-358'])
expect('search "LIG-111"', q('LIG-111'), [])
expect('search "open space"', q('open space').sort(), ['MIG-130', 'MIG-190', 'MIG-207'])

const m = money(u('LIG-358'), { rate: 110000, stampPct: 7.5, loaDate: new Date(2026, 9, 19), useGrace: false })
expect('LIG-358 money value', m.value, 16132600)
expect('LIG-358 10%', m.first, 1613260)
expect('LIG-358 balance', m.balance, 16132600 - 200000 - 1613260)
expect('LIG-358 fee+gst', [m.fee, m.gst], [16133, 2904])
expect('score range', PLOTS.every((p) => { const s = score(p, DEFAULT_WEIGHTS); return s >= 0 && s <= 100 }), true)

// ---- loan & cash calendar
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol
expect('EMI 10L @9% 15y ≈ 10143', near(emi(1e6, 9, 180), 10143, 1), true)
const p632 = u('LIG-632')
const m632 = money(p632, { rate: p632.rate, stampPct: 7.5, loaDate: new Date(2026, 9, 23), useGrace: false })
const lpLtv = loanPlan(m632, DEFAULT_LOAN)
expect('LIG-632 LTV limit ≈ 91.4L', near(lpLtv.ltvLimit, 9142500, 1000), true)
const withIncome = { ...DEFAULT_LOAN, netMonthlyIncome: 150000 }
const lpInc = loanPlan(m632, withIncome)
expect('income limit ≈ 73.9L and binds', [near(lpInc.incomeLimit!, 7394000, 5000), lpInc.bindingLimit], [true, 'income'])
expect('own + loan = total + proc fee', lpInc.ownFunds + lpInc.loanUsed, m632.total + lpInc.processingFee)
const msA = cashMilestones(p632, m632, lpInc, withIncome, false)
expect('EMD & 10% own-funded', msA.filter((x) => x.key === 'emd' || x.key === 'first').every((x) => x.bank === 0 && x.own > 0), true)
expect('last running own = ownFunds (A)', msA[msA.length - 1].runningOwn, lpInc.ownFunds)
const msB = cashMilestones(p632, m632, lpInc, { ...withIncome, scenario: 'own-funds-then-loan' }, false)
expect('last running own = ownFunds (B)', msB[msB.length - 1].runningOwn, lpInc.ownFunds)
expect('peak B > peak A', peakCash(msB) > peakCash(msA), true)
const d1 = u('LIG-358')
const md1 = money(d1, { rate: d1.rate, stampPct: 7.5, loaDate: new Date(2026, 9, 19), useGrace: false })
const iso = (d: Date) => d.toLocaleDateString('en-CA')
expect('10% due 7 days ex-Sundays after LoA 19.10', iso(md1.dates.firstDue), '2026-10-27')
expect('grace = balance + 30 days', (md1.dates.graceDue.getTime() - md1.dates.balanceDue.getTime()) / 86400000, 30)
const ics = buildIcs('LIG-632', msA, (n) => String(n))
expect('ics events = milestones', (ics.match(/BEGIN:VEVENT/g) ?? []).length, msA.length)
expect('ics dates valid', /DTSTART;VALUE=DATE:\d{8}\r\n/.test(ics), true)
console.log('LIG-632 own funds', lpInc.ownFunds, 'loan', lpInc.loanUsed, 'emi', lpInc.emi, 'peakA', peakCash(msA), 'peakB', peakCash(msB))

const byFacing: Record<string, number> = {}
for (const p of PLOTS) byFacing[p.facing ?? '-'] = (byFacing[p.facing ?? '-'] ?? 0) + 1
console.log('facing distribution', byFacing, 'corner plots', PLOTS.filter((p) => p.isCorner).length)
process.exit(failed ? 1 : 0)
