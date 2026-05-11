'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type DashboardProduct = {
  id: number
  title: string
  category: string | null
  vendor_name: string
  price_cents: number
  days_listed: number
  dsr_score: number
  risk_level: 'green' | 'yellow' | 'red'
  top_reason: string
}

/** Bolden palette — warm clay, tan, stone (see globals.css `--tz-*`). */
const RISK_COLORS: Record<'green' | 'yellow' | 'red', string> = {
  green: '#c6bab4',
  yellow: '#aa8a76',
  red: '#8c5a49',
}

const RISK_LABELS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'Low',
  yellow: 'At Risk',
  red: 'Critical',
}

const REASON_PALETTE = ['#8c5a49', '#aa8a76', '#6f6258', '#c6bab4', '#3d3030', '#57504a']

const AXIS_COLOR = '#6f6258'
const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 12,
  border: '1px solid #ede8e4',
  background: '#fffef6',
  fontSize: 12,
  color: '#2b2521',
  boxShadow: '0 4px 14px rgba(43, 37, 33, 0.08)',
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[300px] flex-col rounded-2xl border border-[#ede8e4] bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-base font-semibold tz-burgundy">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-[#6f6258]">{subtitle}</p> : null}
      </div>
      <div className="h-64 min-h-0 flex-1">{children}</div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-[#6f6258]">{label}</div>
  )
}

export function DashboardCharts({
  products,
  isLoading,
}: {
  products: DashboardProduct[]
  isLoading: boolean
}) {
  const riskDistribution = useMemo(() => {
    const counts = { green: 0, yellow: 0, red: 0 }
    for (const p of products) counts[p.risk_level]++
    return (['red', 'yellow', 'green'] as const)
      .map((k) => ({ name: RISK_LABELS[k], value: counts[k], color: RISK_COLORS[k] }))
      .filter((d) => d.value > 0)
  }, [products])

  const totalRiskItems = riskDistribution.reduce((s, d) => s + d.value, 0)

  const vendorBuckets = useMemo(() => {
    const map = new Map<string, { name: string; atRisk: number; critical: number }>()
    for (const p of products) {
      if (p.risk_level === 'green') continue
      const key = p.vendor_name || 'Unknown'
      const entry = map.get(key) ?? { name: key, atRisk: 0, critical: 0 }
      if (p.risk_level === 'red') entry.critical++
      else entry.atRisk++
      map.set(key, entry)
    }
    return Array.from(map.values())
      .sort((a, b) => b.critical + b.atRisk - (a.critical + a.atRisk))
      .slice(0, 6)
  }, [products])

  const reasonBuckets = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products) {
      if (p.risk_level === 'green') continue
      const r = p.top_reason || 'Unknown'
      map.set(r, (map.get(r) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
  }, [products])

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ChartCard
        title="Risk distribution"
        subtitle={totalRiskItems > 0 ? `${totalRiskItems} products` : 'No data'}
      >
        {isLoading ? (
          <EmptyState label="Loading…" />
        ) : riskDistribution.length === 0 ? (
          <EmptyState label="No products to chart" />
        ) : (
          <div className="flex h-full flex-col">
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {riskDistribution.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v: number, n: string) => [`${v} products`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-[#6f6258]">
              {riskDistribution.map((d) => (
                <span key={d.name} className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                  {d.name}: <strong className="tz-burgundy">{d.value}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </ChartCard>

      <ChartCard title="Top vendors at risk" subtitle="At-risk + critical products">
        {isLoading ? (
          <EmptyState label="Loading…" />
        ) : vendorBuckets.length === 0 ? (
          <EmptyState label="No at-risk products" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={vendorBuckets}
              layout="vertical"
              margin={{ top: 10, right: 18, left: 4, bottom: 10 }}
              barCategoryGap={16}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={104}
                tick={{ fontSize: 13, fill: AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(43, 37, 33, 0.04)' }}
              />
              <Bar
                dataKey="atRisk"
                stackId="risk"
                fill={RISK_COLORS.yellow}
                name="At Risk"
                maxBarSize={44}
              />
              <Bar
                dataKey="critical"
                stackId="risk"
                fill={RISK_COLORS.red}
                name="Critical"
                maxBarSize={44}
                radius={[0, 8, 8, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Top risk reasons" subtitle="Why products are flagged">
        {isLoading ? (
          <EmptyState label="Loading…" />
        ) : reasonBuckets.length === 0 ? (
          <EmptyState label="No reasons to show" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reasonBuckets}
              layout="vertical"
              margin={{ top: 10, right: 18, left: 4, bottom: 10 }}
              barCategoryGap={16}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={126}
                tick={{ fontSize: 13, fill: AXIS_COLOR }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(43, 37, 33, 0.04)' }}
                formatter={(v: number) => [`${v} products`, 'Count']}
              />
              <Bar dataKey="count" maxBarSize={44} radius={[0, 8, 8, 0]}>
                {reasonBuckets.map((_, i) => (
                  <Cell key={i} fill={REASON_PALETTE[i % REASON_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}
