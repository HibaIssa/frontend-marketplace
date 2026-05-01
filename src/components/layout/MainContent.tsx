'use client'

import { usePathname } from 'next/navigation'
import clsx from 'clsx'

/**
 * Spaces page content below the fixed-overlay <Navbar />.
 *
 * On `/` the hero is full-bleed and must start at the very top of the
 * viewport (the navbar sits on top of it as a transparent overlay), so we
 * skip the top padding. On every other route we leave room for the floating
 * transparent glass nav (~56px bar height, flush to top).
 */
export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  return (
    <main className={clsx('flex-1', !isHome && 'pt-14')}>
      {children}
    </main>
  )
}
