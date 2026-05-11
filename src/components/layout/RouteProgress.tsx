'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Thin top-of-page progress bar that responds to:
 * 1. Click on any internal anchor → bar starts immediately (before loading.tsx mounts).
 * 2. Pathname / searchParams change → bar finishes.
 *
 * Gives instant visual feedback on slow navigations (e.g. Cloud Run cold starts
 * where the API can take 20–30 s before products show up).
 */
export function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
    if (tickRef.current) clearInterval(tickRef.current)
    setVisible(true)
    setProgress(8)
    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 88) return p
        /** Eases toward 90% over a few seconds, then idles until the route resolves. */
        const remaining = 90 - p
        return Math.min(90, p + Math.max(0.6, remaining * 0.06))
      })
    }, 180)
  }

  const done = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    setProgress(100)
    hideTimerRef.current = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 260)
  }

  useEffect(() => {
    if (visible) done()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    function isInternal(href: string): boolean {
      try {
        const u = new URL(href, window.location.origin)
        return u.origin === window.location.origin
      } catch {
        return false
      }
    }

    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = (e.target as Element | null)?.closest?.('a') as HTMLAnchorElement | null
      if (!target) return
      const href = target.getAttribute('href')
      if (!href) return
      if (target.target && target.target !== '_self') return
      if (target.hasAttribute('download')) return
      if (!isInternal(target.href)) return
      /** Same URL → no real navigation; skip the bar. */
      if (target.pathname === window.location.pathname && target.search === window.location.search) return
      start()
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => {
      document.removeEventListener('click', onClick, { capture: true } as EventListenerOptions)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
      aria-hidden
    >
      <div
        className="h-full bg-[#2a2623] shadow-[0_0_10px_rgba(42,38,35,0.4)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  )
}
