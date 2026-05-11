import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { mirrorCatalogRequestOk } from '@/lib/admin/catalogMirror'
import { fetchOverviewKPIs } from '@/lib/catalog-queries'

export async function GET(req: NextRequest) {
  const mirrored = await mirrorCatalogRequestOk(req, '/api/catalog/overview')
  if (mirrored) return mirrored

  try {
    const kpis = await fetchOverviewKPIs()
    return NextResponse.json(kpis)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
