import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useEmi, usePreview, useShortlist } from '../hooks/useApp'
import { PLOTS } from '../lib/derive'
import { plotBounds } from '../lib/layout'
import { blockLabel, num, short } from '../lib/format'
import type { Plot } from '../lib/types'
import { previewClick } from './PlotCard'
import { FacingBadge, Icon } from './ui'

interface Pin {
  block: string
  at: [number, number]
}

/** One pin per block. A few blocks have two slightly different pins in the PDFs; use the one most plots carry. */
const PINS: Pin[] = (() => {
  const byBlock = new Map<string, Map<string, number>>()
  for (const p of PLOTS) {
    if (!p.coords) continue
    const m = byBlock.get(p.block) ?? new Map<string, number>()
    const k = p.coords.join(',')
    m.set(k, (m.get(k) ?? 0) + 1)
    byBlock.set(p.block, m)
  }
  return [...byBlock].map(([block, m]) => {
    const k = [...m].sort((a, b) => b[1] - a[1])[0][0]
    return { block, at: k.split(',').map(Number) as [number, number] }
  })
})()

const TILES = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 19,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    maxNativeZoom: 18,
  },
}

const pinHtml = (label: string, n: number, active: boolean, starred: boolean) =>
  `<div class="plot-pin${active ? ' is-active' : ''}${n ? '' : ' is-empty'}">${starred ? '<span class="plot-pin-star">★</span>' : ''}${label}<b>${n}</b></div>`

export type MapLayer = 'blocks' | 'plots'

/** zoom at which plot tiles show their unit numbers */
const LABEL_ZOOM = 19

export default function PlotsMap({
  plots,
  focus,
  onFocus,
  layer: mode,
  onLayer,
}: {
  plots: Plot[]
  focus: string
  onFocus: (block: string) => void
  layer: MapLayer
  onLayer: (l: MapLayer) => void
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const me = useRef<L.CircleMarker | null>(null)
  const [base, setBase] = useState<keyof typeof TILES>('street')
  const [locating, setLocating] = useState(false)
  const { ids } = useShortlist()
  const { open } = usePreview()
  const { emiFor } = useEmi()

  const byBlock = useMemo(() => {
    const m = new Map<string, Plot[]>()
    for (const p of plots) m.set(p.block, [...(m.get(p.block) ?? []), p])
    return m
  }, [plots])
  const matched = useMemo(() => new Set(plots.map((p) => p.id)), [plots])

  const fitAll = () => {
    const pts = PINS.filter((p) => byBlock.has(p.block)).map((p) => p.at)
    const all = pts.length ? pts : PINS.map((p) => p.at)
    map.current?.fitBounds(L.latLngBounds(all), { padding: [40, 40], maxZoom: 17 })
  }

  // create the map once
  useEffect(() => {
    if (!el.current) return
    const m = L.map(el.current, { zoomControl: false, attributionControl: true })
    L.control.zoom({ position: 'topright' }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    m.on('locationfound', (e) => {
      setLocating(false)
      me.current?.remove()
      me.current = L.circleMarker(e.latlng, { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(m)
    })
    m.on('locationerror', () => setLocating(false))
    const labels = () => el.current?.classList.toggle('show-plot-labels', m.getZoom() >= LABEL_ZOOM)
    m.on('zoomend', labels)
    // start on the matching blocks, or on the focused block
    const pin = PINS.find((p) => p.block === focus)
    if (pin) m.setView(pin.at, mode === 'plots' ? LABEL_ZOOM : 17)
    else fitAll()
    labels()
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current
    if (!m) return
    tiles.current?.remove()
    const t = TILES[base]
    tiles.current = L.tileLayer(t.url, { attribution: t.attribution, maxZoom: 20, maxNativeZoom: t.maxNativeZoom, className: `tiles-${base}` }).addTo(m)
  }, [base])

  // redraw pins (or plot tiles) when the filtered plots, focus, shortlist or layer change
  useEffect(() => {
    const g = layer.current
    if (!g) return
    g.clearLayers()
    for (const pin of PINS) {
      const list = byBlock.get(pin.block) ?? []
      const starred = list.some((p) => ids.includes(p.id))
      let at = pin.at
      if (mode === 'plots') {
        const tiles = plotBounds(pin.block, pin.at)
        // the block label sits just above its tiles instead of on top of them
        if (tiles.length) at = [Math.max(...tiles.map((t) => t.bounds[1][0])), pin.at[1]]
        for (const { plot: p, bounds } of tiles) {
          const hit = matched.has(p.id)
          const star = ids.includes(p.id)
          const rect = L.rectangle(bounds, {
            className: 'plot-tile',
            color: star ? '#f59e0b' : hit ? '#0f766e' : '#64748b',
            weight: star || pin.block === focus ? 3 : 1,
            fillColor: hit ? '#14b8a6' : '#94a3b8',
            fillOpacity: hit ? 0.45 : 0.15,
            opacity: hit || star ? 1 : 0.5,
          })
          rect.bindTooltip(p.unit.replace(/^(LIG|MIG)-/, ''), { permanent: true, direction: 'center', className: `plot-tile-label${hit ? '' : ' is-empty'}` })
          rect.on('click', () => {
            if (pin.block !== focus) onFocus(pin.block)
            open(p.id)
          })
          g.addLayer(rect)
        }
      }
      const marker = L.marker(at, {
        icon: L.divIcon({ className: 'plot-pin-anchor', html: pinHtml(pin.block, list.length, pin.block === focus, starred), iconSize: [0, 0] }),
        zIndexOffset: pin.block === focus ? 1000 : list.length ? 100 : 0,
        keyboard: true,
        title: `${blockLabel(pin.block)}: ${list.length} matching plot${list.length === 1 ? '' : 's'}`,
      })
      marker.on('click', () => onFocus(pin.block === focus ? '' : pin.block))
      g.addLayer(marker)
    }
  }, [byBlock, matched, focus, ids, onFocus, open, mode])

  // plot tiles are only readable close in: zoom to the focused block, or the matching plots
  useEffect(() => {
    const m = map.current
    if (!m || mode !== 'plots' || m.getZoom() >= 17) return
    const pin = PINS.find((p) => p.block === focus)
    if (pin) return void m.setView(pin.at, LABEL_ZOOM)
    const pts = PINS.filter((p) => byBlock.has(p.block)).map((p) => p.at)
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: LABEL_ZOOM })
  }, [mode])

  useEffect(() => {
    const pin = PINS.find((p) => p.block === focus)
    if (pin && map.current && !map.current.getBounds().pad(-0.2).contains(pin.at)) map.current.panTo(pin.at)
  }, [focus])

  const selected = focus ? byBlock.get(focus) ?? [] : []

  return (
    <div className="relative isolate -mx-4 mt-2 h-[calc(100dvh-16.5rem)] min-h-[22rem] overflow-hidden md:mx-0 md:h-[calc(100dvh-12rem)] md:rounded-2xl md:border md:border-slate-200 md:dark:border-slate-800">
      <div ref={el} className="absolute inset-0 z-0 bg-slate-200 dark:bg-slate-800" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-wrap gap-2 p-2">
        <div className="pointer-events-auto flex rounded-full bg-white p-0.5 shadow dark:bg-slate-900" role="radiogroup" aria-label="Map shows">
          {(['blocks', 'plots'] as const).map((l) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={mode === l}
              onClick={() => onLayer(l)}
              className={`h-8 rounded-full px-3 text-sm font-medium ${mode === l ? 'bg-teal-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}
            >
              {l === 'blocks' ? 'Blocks' : 'Plots'}
            </button>
          ))}
        </div>
        {mode === 'plots' ? (
          <span className="basis-full">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs text-slate-600 shadow dark:bg-slate-900/90 dark:text-slate-300">
              Approximate layout · from each plot's listed neighbours
            </span>
          </span>
        ) : null}
      </div>

      <div className="absolute bottom-3 right-2 z-[500] flex flex-col gap-2" style={{ bottom: focus ? (selected.length ? '9.5rem' : '6.5rem') : undefined }}>
        <button
          type="button"
          onClick={() => setBase((b) => (b === 'street' ? 'satellite' : 'street'))}
          className="h-10 rounded-xl bg-white px-3 text-xs font-semibold shadow-md dark:bg-slate-900"
          aria-label={`Switch to ${base === 'street' ? 'satellite' : 'street'} view`}
        >
          {base === 'street' ? 'Satellite' : 'Street'}
        </button>
        <button
          type="button"
          onClick={() => {
            setLocating(true)
            map.current?.locate({ setView: true, maxZoom: 17 })
          }}
          className="grid h-10 w-full place-items-center rounded-xl bg-white shadow-md dark:bg-slate-900"
          aria-label="Show my location"
        >
          <Icon name="pin" className={`h-5 w-5 ${locating ? 'animate-pulse text-blue-600' : ''}`} />
        </button>
      </div>

      {focus ? (
        <div className="absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-slate-950/40 to-transparent pb-2 pt-6">
          <div className="flex items-center justify-between px-3 pb-1.5 text-sm font-semibold text-white drop-shadow">
            <span>
              {blockLabel(focus)} · {selected.length} matching plot{selected.length === 1 ? '' : 's'}
            </span>
            <button type="button" onClick={() => onFocus('')} className="grid h-8 w-8 place-items-center rounded-full bg-white/90 text-slate-700" aria-label="Close block">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          {selected.length ? (
            <ul className="no-scrollbar flex snap-x gap-2 overflow-x-auto px-3">
              {selected.map((p) => (
                <li key={p.id} className="w-44 shrink-0 snap-start">
                  <Link
                    to={`/plot/${p.id}`}
                    onClick={previewClick(() => open(p.id))}
                    className="block rounded-xl bg-white p-2.5 shadow-md dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold">{p.unit}</span>
                      {ids.includes(p.id) ? <Icon name="star" solid className="h-4 w-4 text-amber-500" /> : null}
                    </div>
                    <div className="text-xs tabular-nums text-slate-600 dark:text-slate-300">
                      {short(p.reservePrice)} · {num(p.area, 0)} sq.yd
                    </div>
                    <div className="text-xs tabular-nums text-teal-700 dark:text-teal-300">{emiFor(p) ? `EMI ${short(emiFor(p))}/mo` : 'No loan'}</div>
                    <div className="mt-1.5">
                      <FacingBadge facing={p.facing} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mx-3 rounded-xl bg-white p-3 text-sm shadow-md dark:bg-slate-900">No plots in this block match your search and filters.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
