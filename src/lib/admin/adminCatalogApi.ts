import { api } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
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

/** Backend may return flat JSON, `{ success, data }`, or `{ success: false, error }` (also used for HTTP errors). */
function unwrapAdminPayload<T>(body: unknown): T {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid admin response')
  }
  const b = body as Record<string, unknown>
  if (b.success === false) {
    const err = b.error as { message?: string } | undefined
    throw new Error(typeof err?.message === 'string' ? err.message : 'Admin request failed')
  }
  if (b.success === true && 'data' in b && b.data !== undefined) {
    return b.data as T
  }
  return body as T
}

export type OverviewData = {
  kpis: OverviewKPIs | null
  vendorCounts: VendorProductCount[]
  catCounts: CategoryCount[]
}

export async function fetchAdminOverview(): Promise<OverviewData> {
  const raw = await api.get(endpoints.adminCatalog.overview)
  return unwrapAdminPayload<OverviewData>(raw as unknown)
}

export type FreshnessData = { stats: FreshnessStats | null; vendorFresh: VendorFreshness[] }

export async function fetchAdminFreshness(): Promise<FreshnessData> {
  const raw = await api.get(endpoints.adminCatalog.freshness)
  return unwrapAdminPayload<FreshnessData>(raw as unknown)
}

export type PricesData = { changes: PriceChangeEvent[]; currentSales: CurrentSaleProduct[] }

export async function fetchAdminPrices(): Promise<PricesData> {
  const raw = await api.get(endpoints.adminCatalog.prices)
  return unwrapAdminPayload<PricesData>(raw as unknown)
}

export async function fetchAdminVendors(): Promise<VendorStats[]> {
  const raw = await api.get(endpoints.adminCatalog.vendors)
  let u: unknown = unwrapAdminPayload<unknown>(raw as unknown)
  if (Array.isArray(u)) return u as VendorStats[]
  if (u && typeof u === 'object' && 'data' in u && Array.isArray((u as { data: unknown }).data)) {
    return (u as { data: VendorStats[] }).data
  }
  return []
}
