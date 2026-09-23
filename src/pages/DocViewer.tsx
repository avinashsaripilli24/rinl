import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../components/ui'
import { DOCS } from '../lib/docs'

GlobalWorkerOptions.workerSrc = workerUrl

function Page({ pdf, n, zoom }: { pdf: PDFDocumentProxy; n: number; zoom: number }) {
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [ratio, setRatio] = useState(1.414)

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: '600px' })
    if (wrap.current) io.observe(wrap.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || !canvas.current || !wrap.current) return
    let task: { cancel(): void; promise: Promise<void> } | null = null
    let cancelled = false
    pdf.getPage(n).then((page) => {
      if (cancelled || !canvas.current || !wrap.current) return
      const base = page.getViewport({ scale: 1 })
      setRatio(base.height / base.width)
      const cssWidth = wrap.current.clientWidth
      const dpr = Math.min(window.devicePixelRatio || 1, 3)
      const vp = page.getViewport({ scale: (cssWidth / base.width) * dpr })
      const c = canvas.current
      c.width = Math.floor(vp.width)
      c.height = Math.floor(vp.height)
      task = page.render({ canvas: c, viewport: vp })
      task.promise.catch(() => {})
    })
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [visible, pdf, n, zoom])

  return (
    <div ref={wrap} className="relative w-full bg-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-800" style={{ aspectRatio: `1 / ${ratio}` }}>
      <canvas ref={canvas} className="h-full w-full" />
      <span className="absolute bottom-1 right-2 text-[11px] text-slate-400">{n}</span>
    </div>
  )
}

export default function DocViewer() {
  const { slug } = useParams()
  const doc = DOCS.find((d) => d.slug === slug) ?? DOCS[0]
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    setPdf(null)
    setError('')
    const task = getDocument({ url: doc.file })
    task.promise.then(setPdf, (e) => setError(String(e?.message ?? e)))
    return () => {
      task.destroy()
    }
  }, [doc.file])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link to="/info" className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Back">
          <Icon name="back" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{doc.title}</h1>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{pdf ? `${pdf.numPages} pages` : error ? 'Could not load' : 'Loading…'}</p>
        </div>
        <div className="flex items-center rounded-full bg-slate-100 dark:bg-slate-800">
          <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} className="h-10 w-10 text-lg font-semibold disabled:opacity-30" aria-label="Zoom out">−</button>
          <span className="w-10 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} className="h-10 w-10 text-lg font-semibold disabled:opacity-30" aria-label="Zoom in">+</button>
        </div>
        <a href={doc.file} target="_blank" rel="noreferrer" download className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-teal-700 hover:bg-slate-100 dark:text-teal-400 dark:hover:bg-slate-800" aria-label="Open or download PDF">
          <Icon name="external" />
        </a>
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
          {error}. <a href={doc.file} className="font-semibold underline">Open the PDF directly</a>.
        </p>
      ) : null}

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="mx-auto space-y-3" style={{ width: `${zoom * 100}%` }}>
          {pdf ? Array.from({ length: pdf.numPages }, (_, i) => <Page key={`${doc.slug}-${i}-${zoom}`} pdf={pdf} n={i + 1} zoom={zoom} />) : null}
        </div>
      </div>
    </div>
  )
}
