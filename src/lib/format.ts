const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ₹1,61,32,600 */
export const rupees = (n: number) => `₹${inr.format(Math.round(n))}`

/** ₹1.61 Cr / ₹98.4 L / ₹75,000 */
export function short(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(a >= 1e8 ? 1 : 2)} Cr`
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(a >= 1e6 ? 1 : 2)} L`
  return rupees(n)
}

/** "13" -> "Block 13", "Autonagar B2" stays as is */
export const blockLabel = (b: string) => (/^auto/i.test(b) ? b : `Block ${b}`)

export const num =(n: number, d = 2) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: d }).format(n)

/** "12.10.2026" -> Date */
export function parseDmy(s: string): Date {
  const [d, m, y] = s.split('.').map(Number)
  return new Date(y, m - 1, d)
}

export const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** add n days skipping Sundays (the RFP excludes Sundays & holidays; holidays are not modelled) */
export function addDaysExSundays(d: Date, n: number): Date {
  const r = new Date(d)
  let left = n
  while (left > 0) {
    r.setDate(r.getDate() + 1)
    if (r.getDay() !== 0) left--
  }
  return r
}
