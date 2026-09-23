import type { Milestone } from './loan'

const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** iCalendar text with one all-day event per milestone and a reminder 2 days before. */
export function buildIcs(title: string, ms: Milestone[], fmtAmount: (n: number) => string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//RINL Plot Explorer//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  ms.forEach((x, i) => {
    const end = new Date(x.date)
    end.setDate(end.getDate() + 1)
    const money = [x.own > 0 ? `Own money: ${fmtAmount(x.own)}` : '', x.bank > 0 ? `Bank: ${fmtAmount(x.bank)}` : '', x.runningOwn > 0 ? `Own money paid so far: ${fmtAmount(x.runningOwn)}` : '']
      .filter(Boolean)
      .join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${title.replace(/\W+/g, '-')}-${x.key}-${i}@rinl-plot-explorer`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(x.date)}`,
      `DTEND;VALUE=DATE:${ymd(end)}`,
      `SUMMARY:${esc(`${title}: ${x.label}${x.own > 0 ? ` (${fmtAmount(x.own)})` : ''}`)}`,
      `DESCRIPTION:${esc([x.detail ?? '', money].filter(Boolean).join('\n'))}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(`${title}: ${x.label}`)}`,
      'TRIGGER:-P2D',
      'END:VALARM',
      'END:VEVENT',
    )
  })
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

export function downloadIcs(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
