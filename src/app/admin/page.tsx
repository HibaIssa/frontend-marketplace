import Link from 'next/link'
import { Shield, Brain, TerminalSquare, Activity, Database, Wrench } from 'lucide-react'
import { AdminOverviewSection } from '@/components/admin/AdminOverviewSection'
import { ADMIN_API_CATALOG, catalogGroups } from '@/lib/admin-api-catalog'

const GROUP_TO_HREF: Record<string, string> = {
  Admin: '/admin/console?group=Admin',
  'System': '/admin/system',
  'Compare': '/admin/console?group=Compare',
  'Try-On': '/admin/console?group=Try-On',
  'Images API': '/admin/console?group=Images API',
  Ingest: '/admin/console?group=Ingest',
  Labeling: '/admin/console?group=Labeling',
  Search: '/admin/console?group=Search',
  Products: '/admin/console?group=Products',
}

function groupIcon(group: string) {
  if (group === 'Admin') return Shield
  if (group === 'System') return Activity
  if (group === 'Compare') return Brain
  if (group === 'Products' || group === 'Search' || group === 'Images API') return Database
  if (group === 'Try-On' || group === 'Ingest' || group === 'Labeling') return Wrench
  return TerminalSquare
}

export default function AdminOverviewPage() {
  const groups = catalogGroups()
  const groupCounts = groups
    .map((group) => ({
      group,
      count: ADMIN_API_CATALOG.filter((op) => op.group === group).length,
      href: GROUP_TO_HREF[group] ?? `/admin/console?group=${encodeURIComponent(group)}`,
      Icon: groupIcon(group),
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-8">
      <AdminOverviewSection />

      <section className="rounded-2xl border border-black/10 bg-white/95 p-5 sm:p-6 space-y-4 shadow-sm ring-1 ring-black/5">
        <div>
          <h2 className="font-display text-xl font-semibold tz-burgundy">Backend coverage</h2>
          <p className="text-sm text-[#0a0a0a]/65 mt-1">
            Quick access to all backend operation groups wired into the admin frontend.
          </p>
        </div>

        <div className="rounded-xl border border-black/10 bg-[#f1e8e2]/55 p-4">
          <h3 className="text-sm font-semibold tz-burgundy mb-3">Histogram · Operations per group</h3>
          <div className="space-y-2">
            {groupCounts.slice(0, 10).map(({ group, count }) => {
              const max = Math.max(1, groupCounts[0]?.count ?? 1)
              const widthPct = Math.max(8, Math.round((count / max) * 100))
              return (
                <div key={`hist-${group}`} className="grid grid-cols-[120px_1fr_42px] items-center gap-2">
                  <p className="text-xs text-[#0a0a0a]/75 truncate">{group}</p>
                  <div className="h-2.5 rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#99624E] to-[#2a2623]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <p className="text-xs tabular-nums tz-burgundy text-right">{count}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupCounts.map(({ group, count, href, Icon }) => (
            <Link
              key={group}
              href={href}
              className="rounded-xl border border-black/10 bg-white p-3.5 hover:bg-[#f3e9e2]/70 hover:border-black/20 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#f1e8e2] text-[#0a0a0a] ring-1 ring-black/10">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tz-burgundy">{group}</p>
                  <p className="text-xs text-[#0a0a0a]/60 mt-0.5">{count} operation{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
