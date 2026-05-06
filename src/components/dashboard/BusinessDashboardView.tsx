'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Bell, Loader2, RefreshCcw } from 'lucide-react'
import { api } from '@/lib/api/client'
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

type ProductSignals = {
  product_id: number
  product_title: string
  dsr_score: number
  risk_level: Exclude<RiskLevel, 'all'>
  signals: Record<string, unknown>
}

const QUERY_KEYS = {
  summary: ['biz-dashboard', 'summary'] as const,
  products: (risk: RiskLevel) => ['biz-dashboard', 'products', risk] as const,
  alerts: ['biz-dashboard', 'alerts'] as const,
}

const DASHBOARD_REQUEST_TIMEOUT_MS = 25_000

async function withTimeout<T>(fn: () => Promise<T>, label: string): Promise<T> {
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

export function BusinessDashboardView({ initialTab = 'overview' }: { initialTab?: 'overview' | 'products' | 'alerts' }) {
  const [tab, setTab] = useState<'overview' | 'products' | 'alerts'>(initialTab)
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all')
  const [signalsFor, setSignalsFor] = useState<number | null>(null)
  const qc = useQueryClient()

  const summaryQ = useQuery({
    queryKey: QUERY_KEYS.summary,
    queryFn: async () => {
      const res = await withTimeout(() => api.get<DashboardSummary>(endpoints.dashboard.summary), 'Summary')
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to load summary')
      return res.data
    },
    retry: 1,
  })

  const productsQ = useQuery({
    queryKey: QUERY_KEYS.products(riskFilter),
    queryFn: async () => {
      const params = riskFilter === 'all' ? undefined : { risk_level: riskFilter }
      const res = await withTimeout(
        () => api.get<DashboardProduct[]>(endpoints.dashboard.products, params),
        'Products',
      )
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to load products')
      return res.data
    },
    retry: 1,
  })

  const alertsQ = useQuery({
    queryKey: QUERY_KEYS.alerts,
    queryFn: async () => {
      const res = await withTimeout(() => api.get<DashboardAlert[]>(endpoints.dashboard.alerts), 'Alerts')
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to load alerts')
      return res.data
    },
    retry: 1,
  })

  const signalsQ = useQuery({
    queryKey: ['biz-dashboard', 'signals', signalsFor],
    enabled: signalsFor != null,
    queryFn: async () => {
      const res = await api.get<ProductSignals>(endpoints.dashboard.productSignals(String(signalsFor)))
      if (!res.success || !res.data) throw new Error(res.error?.message || 'Failed to load signals')
      return res.data
    },
  })

  const dismissAlert = useMutation({
    mutationFn: async (alertId: number) => {
      const res = await api.post(endpoints.dashboard.dismissAlert(String(alertId)))
      if (!res.success) throw new Error(res.error?.message || 'Dismiss failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.alerts })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.summary })
    },
  })

  const generateAlerts = useMutation({
    mutationFn: async () => {
      const res = await api.post(endpoints.dashboard.generateAlerts)
      if (!res.success) throw new Error(res.error?.message || 'Generation failed')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.alerts })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.summary })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.products('all') })
    },
  })

  const topAtRisk = useMemo(() => (productsQ.data || []).slice(0, 8), [productsQ.data])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white p-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Business Dashboard</h1>
          <p className="text-sm text-neutral-600">Risk summary, product signals, and vendor alerts.</p>
        </div>
        <button
          type="button"
          onClick={() => generateAlerts.mutate()}
          disabled={generateAlerts.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
        >
          {generateAlerts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Generate Alerts
        </button>
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
        <TabButton active={tab === 'products'} onClick={() => setTab('products')} label="Products" />
        <TabButton active={tab === 'alerts'} onClick={() => setTab('alerts')} label="Alerts" />
      </div>

      {(tab === 'overview' || tab === 'products') && (
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
                    <th className="pb-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(tab === 'overview' ? topAtRisk : productsQ.data || []).map((p) => (
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
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => setSignalsFor(p.id)}
                          className="rounded-lg border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
                        >
                          View signals
                        </button>
                      </td>
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
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">{a.alert_type}</span>
                    <button
                      type="button"
                      onClick={() => dismissAlert.mutate(a.id)}
                      disabled={dismissAlert.isPending}
                      className="rounded-lg border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-60"
                    >
                      Dismiss
                    </button>
                  </div>
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

      {signalsFor != null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-neutral-900">Product Signals</h3>
              <button type="button" onClick={() => setSignalsFor(null)} className="text-sm text-neutral-600 hover:text-neutral-900">
                Close
              </button>
            </div>
            {signalsQ.isPending ? (
              <p className="text-sm text-neutral-500">Loading signals...</p>
            ) : signalsQ.isError ? (
              <p className="text-sm text-red-700">{(signalsQ.error as Error).message}</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-neutral-700">
                  <span className="font-medium">Product:</span> {signalsQ.data?.product_title}
                </p>
                <p className="text-sm text-neutral-700">
                  <span className="font-medium">DSR:</span> {signalsQ.data?.dsr_score} ({signalsQ.data?.risk_level})
                </p>
                <pre className="overflow-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
                  {JSON.stringify(signalsQ.data?.signals ?? {}, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
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
