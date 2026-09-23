import { useEffect, useRef, useState } from 'react'

/**
 * Grows a visible count as a sentinel element scrolls into view.
 * `resetKey` restarts from the first page (e.g. when filters change).
 */
export function useInfinite(total: number, page: number, resetKey: unknown) {
  const [limit, setLimit] = useState(page)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setLimit(page)
  }, [resetKey, page])

  useEffect(() => {
    const el = ref.current
    if (!el || limit >= total || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setLimit((l) => Math.min(total, l + page))
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [limit, total, page])

  return { limit, sentinel: ref, more: limit < total }
}
