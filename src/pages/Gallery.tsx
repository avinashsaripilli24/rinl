import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { previewClick } from '../components/PlotCard'
import { Lightbox, VisitToggle } from '../components/PlotPhotos'
import { Chip, Icon } from '../components/ui'
import { usePreview, useShortlist, useVisited } from '../hooks/useApp'
import { PLOT_BY_ID } from '../lib/derive'
import { blockLabel, fmtDate, short } from '../lib/format'
import { usePhotoState, type PhotoView } from '../lib/photos'

type Show = 'all' | 'starred' | 'visited'

/** Every site photo on this device, grouped by plot, newest plot first. */
export default function Gallery() {
  const { photos: all, loaded } = usePhotoState(null)
  const [sp, setSp] = useSearchParams()
  const navigate = useNavigate()
  const { open } = usePreview()
  const { ids: starred, has } = useShortlist()
  const { visited } = useVisited()
  const [show, setShow] = useState<Show>('all')

  const groups = useMemo(() => {
    const by = new Map<string, PhotoView[]>()
    for (const p of all) {
      if (!PLOT_BY_ID.has(p.plotId)) continue
      if (show === 'starred' && !starred.includes(p.plotId)) continue
      if (show === 'visited' && !visited[p.plotId]) continue
      by.set(p.plotId, [...(by.get(p.plotId) ?? []), p])
    }
    return [...by.entries()]
      .map(([plotId, photos]) => ({ plot: PLOT_BY_ID.get(plotId)!, photos, latest: photos[photos.length - 1].at }))
      .sort((a, b) => b.latest - a.latest)
  }, [all, show, starred, visited])

  // the viewer steps through the photos in the order shown: one plot's photos, then the next plot
  const flat = useMemo(() => groups.flatMap((g) => g.photos), [groups])
  const viewing = sp.get('photo')
  const showPhoto = (id: string) => setSp({ photo: id }, { replace: !!viewing })
  const closeViewer = () => ((history.state?.idx ?? 0) > 0 ? history.back() : setSp({}, { replace: true }))

  if (!loaded) return <p className="mt-10 text-center text-sm text-slate-500">Loading photos…</p>

  if (!all.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
        <Icon name="camera" className="mx-auto h-8 w-8 text-teal-600" />
        <p className="mt-2 font-semibold">No site photos yet</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Open a plot and use <b>Take photo</b> or <b>Upload</b> under “My visit &amp; notes”. All your photos, from every plot, show up here.
        </p>
        <Link to="/" className="mt-4 inline-flex h-11 items-center rounded-xl bg-teal-600 px-4 font-semibold text-white">Browse plots</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Site photos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {flat.length} photo{flat.length === 1 ? '' : 's'} of {groups.length} plot{groups.length === 1 ? '' : 's'} · stored on this device
        </p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={show === 'all'} onClick={() => setShow('all')}>All plots</Chip>
        <Chip active={show === 'starred'} onClick={() => setShow('starred')}>
          <Icon name="star" className="h-4 w-4" /> Starred
        </Chip>
        <Chip active={show === 'visited'} onClick={() => setShow('visited')}>
          <Icon name="checkCircle" className="h-4 w-4" /> Visited
        </Chip>
      </div>

      {groups.length ? (
        groups.map(({ plot, photos, latest }) => (
          <section key={plot.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900" aria-label={plot.unit}>
            <div className="mb-2 flex items-center gap-2">
              <Link to={`/plot/${plot.id}`} onClick={previewClick(() => open(plot.id))} className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-teal-700 dark:text-teal-400">{plot.unit}</span>
                  <span className="truncate text-sm text-slate-500 dark:text-slate-400">{blockLabel(plot.block)} · {short(plot.reservePrice)} · {plot.facing ?? '–'}</span>
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {photos.length} photo{photos.length === 1 ? '' : 's'} · last added {fmtDate(new Date(latest))}
                </span>
              </Link>
              {has(plot.id) ? <Icon name="star" solid className="h-5 w-5 shrink-0 text-amber-500" /> : null}
              <VisitToggle id={plot.id} unit={plot.unit} size="icon" />
            </div>
            <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {photos.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => showPhoto(p.id)}
                    className="block aspect-square w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800"
                    aria-label={`Open photo ${i + 1} of ${plot.unit}`}
                  >
                    <img src={p.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">
          None of your {show} plots have photos yet.
        </p>
      )}

      {viewing && flat.some((p) => p.id === viewing) ? (
        <Lightbox
          photos={flat}
          id={viewing}
          unitOf={(p) => PLOT_BY_ID.get(p.plotId)?.unit ?? 'Plot'}
          onShow={showPhoto}
          onClose={closeViewer}
          // a normal push, so Back from the plot page returns to this photo
          onDetails={(p) => navigate(`/plot/${p.plotId}`)}
        />
      ) : null}
    </div>
  )
}
