import { NextRequest, NextResponse } from 'next/server'
import { mirrorCatalogRequestOk } from '@/lib/admin/catalogMirror'
import { fetchPriceHistory } from '@/lib/catalog-queries'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const mirrored = await mirrorCatalogRequestOk(req, `/api/catalog/products/${encodeURIComponent(params.id)}/price-history`)
  if (mirrored) return mirrored

  try {
    const history = await fetchPriceHistory(params.id)
    return NextResponse.json(history)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
