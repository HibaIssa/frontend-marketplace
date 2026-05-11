import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Point local dev at the deployed Bolden app so `/api/admin/*` and `/api/catalog/*` return the same
 * JSON as production — no Supabase and no full GET /products crawl on your laptop.
 *
 * Example: CATALOG_MIRROR_ORIGIN=https://marketplace-app-96918972071.asia-southeast1.run.app
 */
export function getCatalogMirrorOrigin(): string | null {
  const raw = process.env.CATALOG_MIRROR_ORIGIN?.trim()
  if (!raw) return null
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    return u.origin
  } catch {
    return null
  }
}

/** Proxy to deployed catalog APIs (path includes `/api/...`). Returns null if mirroring is disabled. */
export async function mirrorCatalogRequest(req: NextRequest, apiPathAndQuery: string): Promise<NextResponse | null> {
  const origin = getCatalogMirrorOrigin()
  if (!origin) return null

  const path = apiPathAndQuery.startsWith('/') ? apiPathAndQuery : `/${apiPathAndQuery}`
  const incoming = req.nextUrl
  const target = new URL(path, origin)
  if (!path.includes('?')) {
    target.search = incoming.search
  }

  const headers = new Headers()
  const auth = req.headers.get('authorization')
  const cookie = req.headers.get('cookie')
  if (auth) headers.set('authorization', auth)
  if (cookie) headers.set('cookie', cookie)

  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 120_000)
    const res = await fetch(target.toString(), {
      method: req.method,
      headers,
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(t))

    const buf = await res.arrayBuffer()
    const out = new NextResponse(buf, { status: res.status })
    const ct = res.headers.get('content-type')
    if (ct) out.headers.set('content-type', ct)
    return out
  } catch (e) {
    console.warn('[catalogMirror]', target.toString(), e)
    return null
  }
}

/** Same as {@link mirrorCatalogRequest}, but returns null unless upstream responds 2xx (so handlers can fall back locally). */
export async function mirrorCatalogRequestOk(req: NextRequest, apiPathAndQuery: string): Promise<NextResponse | null> {
  const mirrored = await mirrorCatalogRequest(req, apiPathAndQuery)
  if (!mirrored) return null
  if (mirrored.status >= 200 && mirrored.status < 300) return mirrored
  console.warn('[catalogMirror] upstream status', mirrored.status, apiPathAndQuery)
  return null
}
