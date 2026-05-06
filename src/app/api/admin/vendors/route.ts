import { NextResponse } from 'next/server'
import { fetchVendorStats } from '@/lib/catalog-queries'
import { hasSupabaseCatalogEnv } from '@/lib/admin/supabaseEnv'
import { buildVendorStatsFromBackendFacets } from '@/lib/admin/overviewFromFacets'

export async function GET() {
  if (!hasSupabaseCatalogEnv()) {
    try {
      const data = await buildVendorStatsFromBackendFacets()
      return NextResponse.json({ data })
    } catch {
      return NextResponse.json({ data: [] }, { status: 502 })
    }
  }

  const data = await fetchVendorStats().catch(() => [])
  return NextResponse.json({ data })
}
