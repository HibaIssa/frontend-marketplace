import type { OverviewKPIs, VendorProductCount, CategoryCount, VendorStats } from '@/types/catalog-admin'
import { catalogBackendAbsoluteUrl } from '@/lib/api/fashionApiOrigin'

type FacetItem = { value?: string; count?: number | string }
type FacetsPayload = {
  success?: boolean
  data?: {
    brands?: FacetItem[]
    categories?: FacetItem[]
  }
}

function toCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

/**
 * Fast overview when Supabase is not configured — uses backend GET /products/facets (same catalog as shop).
 */
export async function buildOverviewFromBackendFacets(): Promise<{
  kpis: OverviewKPIs
  vendorCounts: VendorProductCount[]
  catCounts: CategoryCount[]
}> {
  const res = await fetch(catalogBackendAbsoluteUrl('/products/facets'), {
    cache: 'no-store',
    next: { revalidate: 0 },
  })
  const payload = (await res.json().catch(() => ({}))) as FacetsPayload
  if (!res.ok || !payload?.data) {
    throw new Error(`Facets request failed (${res.status})`)
  }

  const brands = Array.isArray(payload.data.brands) ? payload.data.brands : []
  const categories = Array.isArray(payload.data.categories) ? payload.data.categories : []

  const vendorCounts: VendorProductCount[] = brands
    .map((b) => {
      const total = toCount(b.count)
      return {
        vendor_name: (b.value ?? 'Unknown').toString(),
        total,
        available: total,
        unavailable: 0,
      }
    })
    .filter((v) => v.total > 0)

  const catCounts: CategoryCount[] = categories
    .map((c) => ({ category: (c.value ?? '(uncategorized)').toString(), count: toCount(c.count) }))
    .filter((c) => c.count > 0)

  const totalProducts = catCounts.reduce((sum, c) => sum + c.count, 0)
  const missingCategoryRow = categories.find((c) => String(c.value ?? '').toLowerCase() === '__none__')

  const kpis: OverviewKPIs = {
    total_vendors: vendorCounts.length,
    total_products: totalProducts,
    available_products: totalProducts,
    unavailable_products: 0,
    unique_categories: catCounts.length,
    products_seen_today: 0,
    missing_category: toCount(missingCategoryRow?.count),
    missing_color: 0,
    missing_size: 0,
    missing_image_url: 0,
    missing_image_urls: 0,
    missing_variant_id: 0,
    missing_parent_url: 0,
    with_sale_price: 0,
    updated_last_24h: 0,
  }

  return { kpis, vendorCounts, catCounts }
}

/** Vendor table stats derived from brand facets (approximation when Supabase RPC is unavailable). */
export async function buildVendorStatsFromBackendFacets(): Promise<VendorStats[]> {
  const { vendorCounts } = await buildOverviewFromBackendFacets()
  return vendorCounts.map((v, idx) => ({
    id: idx + 1,
    name: v.vendor_name,
    url: '',
    ship_to_lebanon: true,
    total_products: v.total,
    available_products: v.available,
    unavailable_products: v.unavailable,
    missing_category: 0,
    missing_image_url: 0,
    missing_image_urls: 0,
    missing_variant_id: 0,
    missing_parent_url: 0,
    missing_color: 0,
    missing_size: 0,
    latest_last_seen: null,
    health_score: v.total > 0 ? 100 : 0,
  }))
}
