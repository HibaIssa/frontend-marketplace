import { NextResponse } from 'next/server'
import { fetchOverviewKPIs, fetchVendorProductCounts, fetchCategoryCounts } from '@/lib/catalog-queries'
import { hasSupabaseCatalogEnv } from '@/lib/admin/supabaseEnv'
import { buildOverviewFromBackendFacets } from '@/lib/admin/overviewFromFacets'

export async function GET() {
  if (!hasSupabaseCatalogEnv()) {
    try {
      const { kpis, vendorCounts, catCounts } = await buildOverviewFromBackendFacets()
      return NextResponse.json({ kpis, vendorCounts, catCounts })
    } catch {
      return NextResponse.json(
        { kpis: null, vendorCounts: [], catCounts: [], error: { message: 'Could not load catalog from API facets' } },
        { status: 502 },
      )
    }
  }

  const [kpis, vendorCounts, catCounts] = await Promise.allSettled([
    fetchOverviewKPIs(),
    fetchVendorProductCounts(),
    fetchCategoryCounts(),
  ])
  return NextResponse.json({
    kpis: kpis.status === 'fulfilled' ? kpis.value : null,
    vendorCounts: vendorCounts.status === 'fulfilled' ? vendorCounts.value : [],
    catCounts: catCounts.status === 'fulfilled' ? catCounts.value : [],
  })
}
