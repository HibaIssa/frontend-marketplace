import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { mirrorCatalogRequestOk } from '@/lib/admin/catalogMirror'
import { fetchRecentPriceChanges, fetchCurrentSaleProducts } from '@/lib/catalog-queries'

export async function GET(req: NextRequest) {
  const mirrored = await mirrorCatalogRequestOk(req, '/api/admin/prices')
  if (mirrored) return mirrored

  const [changes, currentSales] = await Promise.allSettled([
    fetchRecentPriceChanges(800),
    fetchCurrentSaleProducts(20),
  ])
  return NextResponse.json({
    changes: changes.status === 'fulfilled' ? changes.value : [],
    currentSales: currentSales.status === 'fulfilled' ? currentSales.value : [],
  })
}
