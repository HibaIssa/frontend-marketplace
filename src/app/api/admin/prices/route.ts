import { NextResponse } from 'next/server'
import { fetchRecentPriceChanges, fetchCurrentSaleProducts } from '@/lib/catalog-queries'
import { hasSupabaseCatalogEnv } from '@/lib/admin/supabaseEnv'

export async function GET() {
  if (!hasSupabaseCatalogEnv()) {
    return NextResponse.json({ changes: [], currentSales: [] })
  }

  const [changes, currentSales] = await Promise.allSettled([
    fetchRecentPriceChanges(800),
    fetchCurrentSaleProducts(20),
  ])
  return NextResponse.json({
    changes: changes.status === 'fulfilled' ? changes.value : [],
    currentSales: currentSales.status === 'fulfilled' ? currentSales.value : [],
  })
}
