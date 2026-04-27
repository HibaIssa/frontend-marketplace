'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  Shield,
  Terminal,
  GitMerge,
  Timer,
  Brain,
  Activity,
  ChevronRight,
  Store,
  Package,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { useAdminBasePath } from '@/components/admin/AdminBasePathContext'

type NavItem = {
  segment: '' | 'moderation' | 'canonicals' | 'jobs' | 'reco' | 'system' | 'console'
  label: string
  icon: LucideIcon
  exact?: boolean
}

type CatalogLinkItem = {
  segment: 'catalog' | 'catalog/vendors' | 'catalog/products' | 'catalog/prices' | 'catalog/freshness'
  label: string
  icon: LucideIcon
}

const CATALOG_LINKS: { section: string; items: CatalogLinkItem[] } = {
  section: 'Catalog database',
  items: [
    { segment: 'catalog', label: 'Scraper overview', icon: LayoutDashboard },
    { segment: 'catalog/vendors', label: 'Vendors', icon: Store },
    { segment: 'catalog/products', label: 'Products', icon: Package },
    { segment: 'catalog/prices', label: 'Prices', icon: TrendingUp },
    { segment: 'catalog/freshness', label: 'Freshness', icon: Clock },
  ],
}

const SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Operations',
    items: [
      { segment: '', label: 'Overview', icon: LayoutDashboard, exact: true },
      { segment: 'moderation', label: 'Moderation', icon: Shield },
      { segment: 'canonicals', label: 'Canonicals', icon: GitMerge },
      { segment: 'jobs', label: 'Jobs', icon: Timer },
    ],
  },
  {
    section: 'Intelligence & system',
    items: [
      { segment: 'reco', label: 'Reco labeling', icon: Brain },
      { segment: 'system', label: 'System', icon: Activity },
      { segment: 'console', label: 'API console', icon: Terminal },
    ],
  },
]

const ICON_BG_IDLE = 'bg-[#e5eeff] text-[#0a0a0a] ring-1 ring-[#0a0a0a]/12'
const ICON_BG_ACTIVE = 'bg-[#0a0a0a] text-[#ffffff] ring-1 ring-[#0a0a0a]'

export function AdminSidebar({ brandLabel = 'Admin' }: { brandLabel?: string }) {
  const pathname = usePathname()
  const base = useAdminBasePath()

  return (
    <aside className="w-[220px] min-w-[220px] h-full shrink-0 flex flex-col overflow-y-auto border-r border-[#0a0a0a]/10 bg-[#ffffff]/95 backdrop-blur-sm">
      <div className="px-4 py-5 border-b border-[#0a0a0a]/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center shadow-md shadow-[#0a0a0a]/20">
            <span className="text-[#ffffff] text-[11px] font-display font-bold tracking-tight">TZ</span>
          </div>
          <div>
            <p className="text-sm font-display font-semibold tz-burgundy leading-none">TrendZone</p>
            <p className="text-[10px] text-[#0a0a0a]/65 mt-1 font-medium">
              {brandLabel === 'Business' ? 'Business · internal' : 'Admin · internal'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3">
        {SECTIONS.map(({ section, items }) => (
          <div key={section} className="mb-4">
            <p className="px-4 py-1 text-[10px] font-semibold text-[#0a0a0a]/55 uppercase tracking-widest">
              {section}
            </p>
            {items.map(({ segment, label, icon: Icon, exact }) => {
              const href = segment === '' ? base : `${base}/${segment}`
              const active = exact
                ? pathname === href || pathname === `${href}/`
                : pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-[#e8eeff] tz-burgundy font-semibold shadow-sm ring-1 ring-[#0a0a0a]/10'
                      : 'text-[#0a0a0a]/75 hover:bg-[#e5eeff]/70 hover:text-[#0a0a0a]'
                  )}
                >
                  <span
                    className={clsx(
                      'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                      active ? ICON_BG_ACTIVE : ICON_BG_IDLE
                    )}
                  >
                    <Icon className="w-3 h-3" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3 h-3 text-[#0a0a0a]/60 shrink-0" />}
                </Link>
              )
            })}
          </div>
        ))}
        <div className="mb-4">
          <p className="px-4 py-1 text-[10px] font-semibold text-[#0a0a0a]/55 uppercase tracking-widest">
            {CATALOG_LINKS.section}
          </p>
          {CATALOG_LINKS.items.map(({ segment, label, icon: Icon }) => {
            const href = `${base}/${segment}`
            const active =
              segment === 'catalog'
                ? pathname === href || pathname === `${href}/`
                : pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-[#e8eeff] tz-burgundy font-semibold shadow-sm ring-1 ring-[#0a0a0a]/10'
                    : 'text-[#0a0a0a]/75 hover:bg-[#e5eeff]/70 hover:text-[#0a0a0a]'
                )}
              >
                <span
                  className={clsx(
                    'w-5 h-5 rounded-md flex items-center justify-center shrink-0',
                    active ? ICON_BG_ACTIVE : ICON_BG_IDLE
                  )}
                >
                  <Icon className="w-3 h-3" />
                </span>
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 text-[#0a0a0a]/60 shrink-0" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-[#0a0a0a]/10 mt-auto">
        <p className="text-[11px] text-[#0a0a0a]/65 leading-relaxed">
          {brandLabel === 'Business'
            ? 'Business dashboard — not shown to shoppers'
            : 'Admin only — account must have admin role; not linked for guests'}
        </p>
      </div>
    </aside>
  )
}
