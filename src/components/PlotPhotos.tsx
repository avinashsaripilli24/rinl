import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useVisited } from '../hooks/useApp'
import { fmtDate } from '../lib/format'
import { addPhotos, deletePhoto, usePhotos, type PhotoView } from '../lib/photos'
import { Icon } from './ui'

/** Tick a plot as visited on site. */
export function VisitToggle({ id, unit, size = 'full' }: { id: string; unit: string; size?: 'full' | 'icon' }) {
  const { visitedAt, toggle } = useVisited()
  const at = visitedAt(id)
  if (size === 'icon') {
    return (
      <button
        type="button"
        onClick={() => toggle(id)}
        className={`grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 ${at ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        aria-label={at ? `${unit} visited. Tap to unmark` : `Mark ${unit} as visited`}
        aria-pressed={!!at}
        title={at ? `Visited ${fmtDate(new Date(at))}` : 'Mark as visited'}
      >
        <Icon name="checkCircle" strokeWidth={at ? 2.6 : 2} />
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={() => toggle(id)}
      aria-pressed={!!at}
      className={`flex h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold ${
        at
          ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-slate-300 text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-300'
      }`}
    >
      <Icon name="checkCircle" className="h-5 w-5 shrink-0" strokeWidth={at ? 2.6 : 2} />
      <span className="flex-1">{at ? `Visited on ${fmtDate(new Date(at))}` : 'Mark as visited'}</span>
      {at ? <span className="text-xs font-medium opacity-75">Undo</span> : null}
    </button>
  )
}

/** Site photos for a plot: take with the camera or pick several from the gallery. Stored on this device. */
export default function PlotPhotos({ id, unit, compact }: { id: string; unit: string; compact?: boolean }) {
  const photos = usePhotos(id)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    setError('')
    try {
      const n = await addPhotos(id, files)
      if (!n) setError('Only image files can be added.')
    } catch {
      setError('Could not save the photos. The browser may be out of storage or in private mode.')
    } finally {
      setBusy(false)
      if (camera.current) camera.current.value = ''
      if (gallery.current) gallery.current.value = ''
    }
  }

  const btn = 'flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 text-sm font-semibold hover:border-teal-500 disabled:opacity-50 dark:border-slate-700'
  return (
    <div>
      {compact ? (
        <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <Icon name="image" className="h-3.5 w-3.5" /> Photos{photos.length ? ` (${photos.length})` : ''}
        </div>
      ) : null}
      {photos.length ? (
        <ul className={`mb-2 grid gap-1.5 ${compact ? 'grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
          {photos.map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => setViewing(p.id)} className="block aspect-square w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800" aria-label={`Open photo ${i + 1} of ${unit}`}>
                <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => camera.current?.click()} className={btn}>
          <Icon name="camera" className="h-4 w-4" /> Take photo
        </button>
        <button type="button" disabled={busy} onClick={() => gallery.current?.click()} className={btn}>
          <Icon name="image" className="h-4 w-4" /> Upload
        </button>
      </div>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <input ref={gallery} type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {busy ? 'Saving photos…' : error || (photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} saved on this device` : compact ? '' : 'Photos stay on this device and are not uploaded anywhere.')}
        {photos.length && !compact ? (
          <>
            {' · '}
            <Link to="/gallery" className="font-semibold text-teal-700 underline dark:text-teal-400">All site photos</Link>
          </>
        ) : null}
      </p>
      {viewing ? (
        <Lightbox photos={photos} id={viewing} unitOf={() => unit} onShow={setViewing} onClose={() => setViewing(null)} />
      ) : null}
    </div>
  )
}

/** Up to four thumbnails for tight spaces such as the compare table; tapping opens the viewer. */
export function PhotoStrip({ id, unit }: { id: string; unit: string }) {
  const photos = usePhotos(id)
  const [viewing, setViewing] = useState<string | null>(null)
  if (!photos.length) return <span className="text-slate-400">–</span>
  return (
    <>
      <div className="grid grid-cols-2 gap-1">
        {photos.slice(0, 4).map((p, i) => (
          <button key={p.id} type="button" onClick={() => setViewing(p.id)} className="relative aspect-square overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800" aria-label={`Open photo ${i + 1} of ${unit}`}>
            <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
            {i === 3 && photos.length > 4 ? <span className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white">+{photos.length - 4}</span> : null}
          </button>
        ))}
      </div>
      {viewing ? <Lightbox photos={photos} id={viewing} unitOf={() => unit} onShow={setViewing} onClose={() => setViewing(null)} /> : null}
    </>
  )
}

/**
 * Full-screen photo viewer. `unitOf` names the plot of each photo (the gallery mixes plots);
 * `onDetails`, when given, adds a button to open that plot.
 */
export function Lightbox({
  photos,
  id,
  unitOf,
  onShow,
  onClose,
  onDetails,
}: {
  photos: PhotoView[]
  /** photo on screen */
  id: string
  unitOf: (p: PhotoView) => string
  onShow: (id: string) => void
  onClose: () => void
  onDetails?: (p: PhotoView) => void
}) {
  const index = photos.findIndex((x) => x.id === id)
  const p = photos[Math.max(0, index)]
  const unit = unitOf(p)
  // position of this photo among the photos of the same plot
  const ofPlot = photos.filter((x) => x.plotId === p.plotId)
  const nth = ofPlot.indexOf(p) + 1
  const touch = useRef<number | null>(null)
  const go = (d: number) => onShow(photos[(index + d + photos.length) % photos.length].id)

  useEffect(() => {
    // capture phase so Escape closes only the photo, not the quick-look sheet underneath
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
      else return
      e.stopPropagation()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  })

  if (index < 0) return null

  const remove = async () => {
    if (!confirm('Delete this photo from this device?')) return
    const neighbour = photos[index + 1] ?? photos[index - 1]
    if (neighbour) onShow(neighbour.id)
    else onClose()
    await deletePhoto(p.id)
  }

  const share = async () => {
    const file = new File([p.blob], `${unit}-${nth}.jpg`, { type: p.blob.type || 'image/jpeg' })
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: unit })
      else {
        const a = document.createElement('a')
        a.href = p.url
        a.download = file.name
        a.click()
      }
    } catch {
      /* user cancelled */
    }
  }

  const iconBtn = 'grid h-11 w-11 place-items-center rounded-full text-white hover:bg-white/15'
  const stop = (e: TouchEvent) => e.stopPropagation()
  // portal to <body> so the viewer covers the screen even inside the quick-look sheet; touches stay here
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black"
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      role="dialog" aria-modal="true" aria-label={`${unit} photo ${nth} of ${ofPlot.length}`}>
      <div className="flex items-center gap-1 p-2 text-white">
        <button type="button" onClick={onClose} className={iconBtn} aria-label="Close">
          <Icon name="x" />
        </button>
        <span className="min-w-0 flex-1 text-sm leading-tight">
          <b className="block text-base">{unit}</b>
          <span className="block truncate text-white/70">
            {ofPlot.length > 1 ? `Photo ${nth} of ${ofPlot.length} · ` : ''}
            {fmtDate(new Date(p.at))}
            {ofPlot.length !== photos.length ? ` · ${index + 1}/${photos.length} overall` : ''}
          </span>
        </span>
        <button type="button" onClick={share} className={iconBtn} aria-label="Share or save photo">
          <Icon name="share" />
        </button>
        <button type="button" onClick={remove} className={iconBtn} aria-label="Delete photo">
          <Icon name="trash" />
        </button>
      </div>
      <div
        className="relative flex min-h-0 flex-1 items-center justify-center"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return
          const dx = e.changedTouches[0].clientX - touch.current
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1)
          touch.current = null
        }}
      >
        <img src={p.url} alt={`${unit} site photo ${nth}`} className="max-h-full max-w-full object-contain" />
        {photos.length > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} className={`${iconBtn} absolute left-2 top-1/2 -translate-y-1/2 bg-black/40`} aria-label="Previous photo">
              <Icon name="back" />
            </button>
            <button type="button" onClick={() => go(1)} className={`${iconBtn} absolute right-2 top-1/2 -translate-y-1/2 bg-black/40`} aria-label="Next photo">
              <Icon name="next" />
            </button>
          </>
        ) : null}
      </div>
      {onDetails ? (
        <div className="pb-safe flex justify-center p-3">
          <button type="button" onClick={() => onDetails(p)} className="flex h-12 items-center gap-2 rounded-xl bg-white px-5 font-semibold text-slate-900 hover:bg-slate-200">
            View {unit} details <Icon name="next" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
