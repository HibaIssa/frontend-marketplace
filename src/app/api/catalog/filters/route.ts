import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { mirrorCatalogRequestOk } from '@/lib/admin/catalogMirror'
import { fetchDistinctCategories, fetchDistinctVendors } from '@/lib/catalog-queries'

export async function GET(req: NextRequest) {
  const mirrored = await mirrorCatalogRequestOk(req, '/api/catalog/filters')
  if (mirrored) return mirrored

  try {
    const [vendors, categories] = await Promise.all([fetchDistinctVendors(), fetchDistinctCategories()])

    return NextResponse.json({ vendors, categories })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
