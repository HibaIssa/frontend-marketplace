import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { mirrorCatalogRequestOk } from '@/lib/admin/catalogMirror'
import { fetchOverviewKPIs, fetchVendorProductCounts, fetchCategoryCounts } from '@/lib/catalog-queries'

export async function GET(req: NextRequest) {
  const mirrored = await mirrorCatalogRequestOk(req, '/api/admin/overview')
  if (mirrored) return mirrored

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
