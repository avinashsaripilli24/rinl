import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Site-visit photos, kept on this device in IndexedDB (too large for localStorage). */
export interface Photo {
  id: string
  plotId: string
  blob: Blob
  at: number
}

const STORE = 'photos'
let dbp: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('rinl', 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' }).createIndex('plotId', 'plotId')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbp = null
      reject(req.error)
    }
  })
  return dbp
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> {
  const d = await db()
  return new Promise((resolve, reject) => {
    const t = d.transaction(STORE, mode)
    const req = run(t.objectStore(STORE))
    t.oncomplete = () => resolve(req ? req.result : (undefined as T))
    t.onerror = () => reject(t.error)
    t.onabort = () => reject(t.error)
  })
}

/** Downscale to at most 1600px and re-encode as JPEG; keeps the original if the browser cannot decode it. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * k)
    canvas.height = Math.round(bmp.height * k)
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    return out && out.size < file.size ? out : file
  } catch {
    return file
  }
}

// ---- change notifications and photo counts for cards/filters ----

let counts: Record<string, number> | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((l) => l())

async function loadCounts() {
  const next: Record<string, number> = {}
  try {
    // a key cursor on the index walks plot ids without loading any image data
    const d = await db()
    await new Promise<void>((resolve, reject) => {
      const req = d.transaction(STORE).objectStore(STORE).index('plotId').openKeyCursor()
      req.onsuccess = () => {
        const c = req.result
        if (!c) return resolve()
        const pid = String(c.key)
        next[pid] = (next[pid] ?? 0) + 1
        c.continue()
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    /* IndexedDB unavailable (private mode): no photos */
  }
  counts = next
  notify()
}

function subscribe(l: () => void) {
  listeners.add(l)
  if (!counts) void loadCounts()
  return () => listeners.delete(l)
}

/** Number of photos per plot id. */
export function usePhotoCounts(): Record<string, number> {
  return useSyncExternalStore(subscribe, () => counts ?? EMPTY)
}
const EMPTY: Record<string, number> = {}

export async function addPhotos(plotId: string, files: FileList | File[]) {
  const list = [...files].filter((f) => f.type.startsWith('image/'))
  if (!list.length) return 0
  // ask the browser not to evict the photos when space runs low
  void navigator.storage?.persist?.()
  const blobs = await Promise.all(list.map(shrink))
  const now = Date.now()
  await tx('readwrite', (s) => {
    blobs.forEach((blob, i) => s.put({ id: `${plotId}-${now}-${i}-${Math.random().toString(36).slice(2, 7)}`, plotId, blob, at: now + i } satisfies Photo))
  })
  await loadCounts()
  return blobs.length
}

export async function deletePhoto(id: string) {
  await tx('readwrite', (s) => s.delete(id))
  await loadCounts()
}

/** One plot's photos, or every photo when plotId is null; oldest first. */
async function listPhotos(plotId: string | null): Promise<Photo[]> {
  const all = await tx<Photo[]>('readonly', (s) => (plotId == null ? s.getAll() : s.index('plotId').getAll(plotId)))
  return all.sort((a, b) => a.at - b.at)
}

export interface PhotoView {
  id: string
  plotId: string
  url: string
  at: number
  blob: Blob
}

/** Photos of one plot (or all plots, for null) as object URLs; reloads whenever the relevant photo count changes. */
export function usePhotos(plotId: string | null) {
  return usePhotoState(plotId).photos
}

/** Like usePhotos, plus whether the first load has finished. */
export function usePhotoState(plotId: string | null) {
  const counts = usePhotoCounts()
  const count = plotId == null ? Object.values(counts).reduce((a, b) => a + b, 0) : (counts[plotId] ?? 0)
  const [photos, setPhotos] = useState<PhotoView[]>([])
  const [loaded, setLoaded] = useState(false)
  const shown = useRef<PhotoView[]>([])
  const replace = (next: PhotoView[]) => {
    // revoke the previous URLs only once the new ones are rendered, so thumbnails don't flash
    const old = shown.current
    shown.current = next
    setPhotos(next)
    setLoaded(true)
    setTimeout(() => old.forEach((v) => URL.revokeObjectURL(v.url)), 1000)
  }
  useEffect(() => {
    let alive = true
    listPhotos(plotId)
      .then((ps) => alive && replace(ps.map((p) => ({ id: p.id, plotId: p.plotId, at: p.at, blob: p.blob, url: URL.createObjectURL(p.blob) }))))
      .catch(() => alive && replace([]))
    return () => {
      alive = false
    }
  }, [plotId, count])
  useEffect(() => () => shown.current.forEach((v) => URL.revokeObjectURL(v.url)), [])
  return { photos, loaded }
}
