'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Bell } from 'lucide-react'
import { dashboardApi } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

type RiskLevel = 'all' | 'green' | 'yellow' | 'red'
type AlertType = 'early_risk' | 'critical' | 'recovery'

type DashboardSummary = {
  total_at_risk: number
  total_critical: number
  value_at_risk_cents: number
  alerts_resolved_this_week: number
}

type DashboardProduct = {
  id: number
  title: string
  category: string | null
  image_url: string | null
  price_cents: number
  currency: string
  vendor_name: string
  days_listed: number
  dsr_score: number
  risk_level: Exclude<RiskLevel, 'all'>
  top_reason: string
}

type DashboardAlert = {
  id: number
  product_id: number
  product_title: string
  alert_type: AlertType
  message: string
  dismissed: boolean
  created_at: string
}

const QUERY_KEYS = {
  summary: ['biz-dashboard', 'summary'] as const,
  products: (risk: RiskLevel) => ['biz-dashboard', 'products', risk] as const,
  alerts: ['biz-dashboard', 'alerts'] as const,
}

const DASHBOARD_REQUEST_TIMEOUT_MS = 0

async function withTimeout<T>(fn: () => Promise<T>, label: string): Promise<T> {
  if (DASHBOARD_REQUEST_TIMEOUT_MS <= 0) {
    return await fn()
  }
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} is taking too long. Please retry in a moment.`)), DASHBOARD_REQUEST_TIMEOUT_MS),
    ),
  ])
}

function formatMoney(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((cents || 0) / 100)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString()
}

function riskTone(level: Exclude<RiskLevel, 'all'>) {
  if (level === 'red') return 'bg-red-100 text-red-800'
  if (level === 'yellow') return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-800'
}

function responseData<T>(res: unknown): T | null {
  const r = res as { success?: boolean; data?: T; error?: { message?: string } }
  if (r?.success === false) throw new Error(r.error?.message || 'Dashboard request failed')
  if (r && typeof r === 'object' && 'data' in r) return r.data ?? null
  return res as T
}

export function AdminDsrDashboardView({ initialTab = 'overview' }: { initialTab?: 'overview' | 'alerts' }) {
  const [tab, setTab] = useState<'overview' | 'alerts'>(initialTab)
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all')

  const summaryQ = useQuery({
    queryKey: QUERY_KEYS.summary,
    queryFn: async () => {
      const res = await withTimeout(() => dashboardApi.get<DashboardSummary>(endpoints.dashboard.summary), 'Summary')
      const data = responseData<DashboardSummary>(res)
      if (!data) throw new Error('Failed to load summary')
      return data
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const productsQ = useQuery({
    queryKey: QUERY_KEYS.products(riskFilter),
    queryFn: async () => {
      const params = riskFilter === 'all' ? undefined : { risk_level: riskFilter }
      const res = await withTimeout(
        () => dashboardApi.get<DashboardProduct[]>(endpoints.dashboard.products, params),
        'Products',
      )
      const data = responseData<DashboardProduct[]>(res)
      if (!Array.isArray(data)) throw new Error('Failed to load products')
      return data
    },
    retry: 1,
    enabled: tab === 'overview',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const alertsQ = useQuery({
    queryKey: QUERY_KEYS.alerts,
    queryFn: async () => {
      const res = await withTimeout(() => dashboardApi.get<DashboardAlert[]>(endpoints.dashboard.alerts), 'Alerts')
      const data = responseData<DashboardAlert[]>(res)
      if (!Array.isArray(data)) throw new Error('Failed to load alerts')
      return data
    },
    retry: 1,
    enabled: tab === 'alerts' || tab === 'overview',
    staleTime: 2 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const topAtRisk = useMemo(() => (productsQ.data || []).slice(0, 8), [productsQ.data])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Admin Dashboard</h1>
          <p className="text-sm text-neutral-600">DSR summary, product signals, and alerts in one admin view.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="At Risk" value={summaryQ.data?.total_at_risk ?? 0} loading={summaryQ.isPending} />
        <MetricCard label="Critical" value={summaryQ.data?.total_critical ?? 0} loading={summaryQ.isPending} tone="danger" />
        <MetricCard
          label="Value At Risk"
          value={formatMoney(summaryQ.data?.value_at_risk_cents ?? 0)}
          loading={summaryQ.isPending}
        />
        <MetricCard
          label="Resolved (7d)"
          value={summaryQ.data?.alerts_resolved_this_week ?? 0}
          loading={summaryQ.isPending}
          tone="success"
        />
      </div>
      {(summaryQ.isPending || productsQ.isPending || alertsQ.isPending) && (
        <p className="text-xs text-neutral-500">
          Fetching live dashboard metrics from backend. First load can take around 20-30 seconds.
        </p>
      )}

      <div className="flex gap-2">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} label="Overview" />
        <TabButton active={tab === 'alerts'} onClick={() => setTab('alerts')} label="Alerts" />
      </div>

      {tab === 'overview' && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-neutral-900">Products</h2>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel)}
              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="all">All risk levels</option>
              <option value="red">Red</option>
              <option value="yellow">Yellow</option>
              <option value="green">Green</option>
            </select>
          </div>

          {productsQ.isPending ? (
            <p className="text-sm text-neutral-500">Loading products...</p>
          ) : productsQ.isError ? (
            <p className="text-sm text-red-700">{(productsQ.error as Error).message}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-neutral-500">
                  <tr>
                    <th className="pb-2">Product</th>
                    <th className="pb-2">Vendor</th>
                    <th className="pb-2">DSR</th>
                    <th className="pb-2">Risk</th>
                    <th className="pb-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {topAtRisk.map((p) => (
                    <tr key={p.id} className="border-t border-neutral-100 align-top">
                      <td className="py-2">
                        <p className="font-medium text-neutral-900">{p.title}</p>
                        <p className="text-xs text-neutral-500">{formatMoney(p.price_cents, p.currency)}</p>
                      </td>
                      <td className="py-2 text-neutral-700">{p.vendor_name}</td>
                      <td className="py-2 font-semibold text-neutral-900">{p.dsr_score}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${riskTone(p.risk_level)}`}>
                          {p.risk_level}
                        </span>
                      </td>
                      <td className="py-2 text-neutral-700">{p.top_reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {(tab === 'overview' || tab === 'alerts') && (
        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-neutral-700" />
            <h2 className="text-base font-semibold text-neutral-900">Active Alerts</h2>
          </div>
          {alertsQ.isPending ? (
            <p className="text-sm text-neutral-500">Loading alerts...</p>
          ) : alertsQ.isError ? (
            <p className="text-sm text-red-700">{(alertsQ.error as Error).message}</p>
          ) : alertsQ.data && alertsQ.data.length > 0 ? (
            <div className="space-y-2">
              {alertsQ.data.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">{a.product_title}</p>
                    <p className="text-sm text-neutral-600">{a.message}</p>
                    <p className="text-xs text-neutral-500">{formatDate(a.created_at)}</p>
                  </div>
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{a.alert_type}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              <AlertTriangle className="h-4 w-4" />
              No active alerts right now.
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  loading,
  tone = 'default',
}: {
  label: string
  value: string | number
  loading: boolean
  tone?: 'default' | 'danger' | 'success'
}) {
  const toneClass = tone === 'danger' ? 'text-red-700' : tone === 'success' ? 'text-emerald-700' : 'text-neutral-900'
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{loading ? '...' : value}</p>
    </div>
  )
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-1.5 text-sm ${
        active ? 'bg-neutral-900 text-white' : 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50'
      }`}
    >
      {label}
    </button>
  )
}
