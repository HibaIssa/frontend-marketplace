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
  color: string
  exact?: boolean
}

type CatalogLinkItem = {
  segment: 'catalog' | 'catalog/vendors' | 'catalog/products' | 'catalog/prices' | 'catalog/freshness'
  label: string
  icon: LucideIcon
  color: string
}

const CATALOG_LINKS: { section: string; items: CatalogLinkItem[] } = {
  section: 'Catalog database',
  items: [
    { segment: 'catalog', label: 'Scraper overview', icon: LayoutDashboard, color: 'bg-indigo-600' },
    { segment: 'catalog/vendors', label: 'Vendors', icon: Store, color: 'bg-sky-500' },
    { segment: 'catalog/products', label: 'Products', icon: Package, color: 'bg-indigo-500' },
    { segment: 'catalog/prices', label: 'Prices', icon: TrendingUp, color: 'bg-emerald-500' },
    { segment: 'catalog/freshness', label: 'Freshness', icon: Clock, color: 'bg-slate-500' },
  ],
}

const SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Operations',
    items: [
      { segment: '', label: 'Overview', icon: LayoutDashboard, color: 'bg-indigo-600', exact: true },
      { segment: 'moderation', label: 'Moderation', icon: Shield, color: 'bg-indigo-500' },
      { segment: 'canonicals', label: 'Canonicals', icon: GitMerge, color: 'bg-slate-600' },
      { segment: 'jobs', label: 'Jobs', icon: Timer, color: 'bg-sky-600' },
    ],
  },
  {
    section: 'Intelligence & system',
    items: [
      { segment: 'reco', label: 'Reco labeling', icon: Brain, color: 'bg-indigo-700' },
      { segment: 'system', label: 'System', icon: Activity, color: 'bg-indigo-800' },
      { segment: 'console', label: 'API console', icon: Terminal, color: 'bg-slate-700' },
    ],
  },
]

export function AdminSidebar({ brandLabel = 'Admin' }: { brandLabel?: string }) {
  const pathname = usePathname()
  const base = useAdminBasePath()

  return (
    <aside className="w-[220px] min-w-[220px] h-full shrink-0 flex flex-col overflow-y-auto border-r border-slate-200/90 bg-white/95 backdrop-blur-sm">
      <div className="px-4 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-slate-700 flex items-center justify-center shadow-md shadow-indigo-600/25">
            <span className="text-white text-xs font-display font-bold tracking-tight">S</span>
          </div>
          <div>
            <p className="text-sm font-display font-semibold text-neutral-900 leading-none">StyleAI</p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium">
              {brandLabel === 'Business' ? 'Business · internal' : 'Admin · internal'}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-3">
        {SECTIONS.map(({ section, items }) => (
          <div key={section} className="mb-4">
            <p className="px-4 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
              {section}
            </p>
            {items.map(({ segment, label, icon: Icon, color, exact }) => {
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
                      ? 'bg-indigo-50 text-indigo-950 font-medium shadow-sm'
                      : 'text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-950'
                  )}
                >
                  <span
                    className={clsx(
                      'w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-sm',
                      color
                    )}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />}
                </Link>
              )
            })}
          </div>
        ))}
        <div className="mb-4">
          <p className="px-4 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {CATALOG_LINKS.section}
          </p>
          {CATALOG_LINKS.items.map(({ segment, label, icon: Icon, color }) => {
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
                    ? 'bg-indigo-50 text-indigo-950 font-medium shadow-sm'
                    : 'text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-950'
                )}
              >
                <span
                  className={clsx(
                    'w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-sm',
                    color
                  )}
                >
                  <Icon className="w-3 h-3 text-white" />
                </span>
                <span className="flex-1">{label}</span>
                {active && <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-slate-100 mt-auto">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {brandLabel === 'Business'
            ? 'Business dashboard — not shown to shoppers'
            : 'Admin only — account must have admin role; not linked for guests'}
        </p>
      </div>
    </aside>
  )
}
