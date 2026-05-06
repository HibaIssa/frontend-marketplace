import { NextResponse } from 'next/server'
import { fetchFreshnessStats, fetchVendorFreshness } from '@/lib/catalog-queries'
import { hasSupabaseCatalogEnv } from '@/lib/admin/supabaseEnv'

export async function GET() {
  if (!hasSupabaseCatalogEnv()) {
    return NextResponse.json({
      stats: { fresh_count: 0, recent_count: 0, aging_count: 0, stale_count: 0 },
      vendorFresh: [],
    })
  }

  const [stats, vendorFresh] = await Promise.allSettled([
    fetchFreshnessStats(),
    fetchVendorFreshness(),
  ])
  return NextResponse.json({
    stats: stats.status === 'fulfilled' ? stats.value : null,
    vendorFresh: vendorFresh.status === 'fulfilled' ? vendorFresh.value : [],
  })
}
