import type {
  CategoryCount,
  CurrentSaleProduct,
  FreshnessStats,
  OverviewKPIs,
  PriceChangeEvent,
  VendorFreshness,
  VendorProductCount,
  VendorStats,
} from '@/types/catalog-admin'

/**
 * Catalog quality admin UI reads aggregated data from **this** Next.js app’s Route Handlers
 * (`/api/admin/*`), which call `catalog-queries` (Supabase + optional backend merge).
 * Do not send these to a remote Cloud Run **frontend** URL — that causes 404/CORS on `/admin/overview`.
 */
async function fetchCatalogAdminJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Admin catalog request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export type OverviewData = {
  kpis: OverviewKPIs | null
  vendorCounts: VendorProductCount[]
  catCounts: CategoryCount[]
}

export async function fetchAdminOverview(): Promise<OverviewData> {
  return fetchCatalogAdminJson<OverviewData>('/api/admin/overview')
}

export type FreshnessData = { stats: FreshnessStats | null; vendorFresh: VendorFreshness[] }

export async function fetchAdminFreshness(): Promise<FreshnessData> {
  return fetchCatalogAdminJson<FreshnessData>('/api/admin/freshness')
}

export type PricesData = { changes: PriceChangeEvent[]; currentSales: CurrentSaleProduct[] }

export async function fetchAdminPrices(): Promise<PricesData> {
  return fetchCatalogAdminJson<PricesData>('/api/admin/prices')
}

export async function fetchAdminVendors(): Promise<VendorStats[]> {
  const raw = await fetchCatalogAdminJson<{ data: VendorStats[] }>('/api/admin/vendors')
  return raw.data ?? []
}
