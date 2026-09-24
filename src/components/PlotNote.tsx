import { useEffect, useRef, useState } from 'react'
import { useNotes } from '../hooks/useApp'
import { Icon } from './ui'

/** Personal note for a plot, saved on this device as you type. */
export default function PlotNote({ id, unit, compact }: { id: string; unit: string; compact?: boolean }) {
  const { noteFor, setNote } = useNotes()
  const saved = noteFor(id)
  const [text, setText] = useState(saved)
  const [status, setStatus] = useState<'' | 'saving' | 'saved'>('')
  const editing = useRef(false)

  // pick up edits made elsewhere (another sheet, another tab) while not typing here
  useEffect(() => {
    if (!editing.current) setText(saved)
  }, [saved])

  useEffect(() => {
    if (text === saved) return
    setStatus('saving')
    const t = setTimeout(() => {
      setNote(id, text)
      setStatus('saved')
    }, 400)
    return () => clearTimeout(t)
  }, [text])

  return (
    <div>
      <label htmlFor={`note-${id}`} className={compact ? 'mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400' : 'sr-only'}>
        <Icon name="note" className="h-3.5 w-3.5" /> My notes
      </label>
      <textarea
        id={`note-${id}`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => (editing.current = true)}
        onBlur={() => {
          editing.current = false
          if (text !== saved) setNote(id, text)
        }}
        rows={compact ? 2 : 4}
        placeholder={`Site visit, neighbours, what you'd bid for ${unit}…`}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white p-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-950"
      />
      <p className="mt-1 h-4 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {status === 'saving' ? 'Saving…' : status === 'saved' ? (text.trim() ? 'Saved on this device' : 'Note removed') : ''}
      </p>
    </div>
  )
}
