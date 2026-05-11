import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { mirrorCatalogRequestOk } from '@/lib/admin/catalogMirror'
import { fetchFreshnessStats, fetchVendorFreshness } from '@/lib/catalog-queries'

export async function GET(req: NextRequest) {
  const mirrored = await mirrorCatalogRequestOk(req, '/api/admin/freshness')
  if (mirrored) return mirrored

  const [stats, vendorFresh] = await Promise.allSettled([
    fetchFreshnessStats(),
    fetchVendorFreshness(),
  ])
  return NextResponse.json({
    stats: stats.status === 'fulfilled' ? stats.value : null,
    vendorFresh: vendorFresh.status === 'fulfilled' ? vendorFresh.value : [],
  })
}
