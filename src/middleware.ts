import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAdminCatalogPageUrl, hostedCatalogNavEnabled } from '@/lib/admin/adminApiOrigin'

export function middleware(req: NextRequest) {
  if (!hostedCatalogNavEnabled()) {
    return NextResponse.next()
  }

  let hostedRoot: string
  try {
    hostedRoot = getAdminCatalogPageUrl().replace(/\/+$/, '')
  } catch {
    return NextResponse.next()
  }

  let hostedOrigin: string
  try {
    hostedOrigin = new URL(hostedRoot).origin
  } catch {
    return NextResponse.next()
  }

  if (req.nextUrl.origin === hostedOrigin) {
    return NextResponse.next()
  }

  const pathname = req.nextUrl.pathname
  const tailMatch = pathname.match(/^\/(?:admin|dashboard)\/catalog(\/.*)?$/)
  if (!tailMatch) {
    return NextResponse.next()
  }

  const tail = tailMatch[1] ?? ''
  const dest = new URL(`${hostedRoot}${tail}`)
  dest.search = req.nextUrl.search
  return NextResponse.redirect(dest)
}

export const config = {
  matcher: ['/admin/catalog/:path*', '/dashboard/catalog/:path*'],
}
