import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { mirrorCatalogRequestOk } from '@/lib/admin/catalogMirror'
import { fetchVendorStats } from '@/lib/catalog-queries'

export async function GET(req: NextRequest) {
  const mirrored = await mirrorCatalogRequestOk(req, '/api/admin/vendors')
  if (mirrored) return mirrored

  const data = await fetchVendorStats().catch(() => [])
  return NextResponse.json({ data })
}
