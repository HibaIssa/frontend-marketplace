import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Upstream Fashion REST service (Express). Not exposed in the browser bar — admin stays on
 * {@link https://marketplace-app-96918972071.asia-southeast1.run.app/admin/catalog}.
 */
/** Same deploy family as Bolden admin catalog — https://marketplace-app-96918972071.asia-southeast1.run.app/admin/catalog */
const DEFAULT_UPSTREAM = 'https://marketplace-app-96918972071.asia-southeast1.run.app'

function upstreamOrigin(): string {
  const raw = (
    process.env.FASHION_API_UPSTREAM_ORIGIN ||
    process.env.NEXT_PUBLIC_API_URL ||
    DEFAULT_UPSTREAM
  ).trim()
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).origin
  } catch {
    return DEFAULT_UPSTREAM
  }
}

function isAllowedPath(joined: string): boolean {
  return joined === 'products' || joined.startsWith('products/')
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug?: string[] }> },
) {
  const { slug = [] } = await ctx.params
  const joined = slug.join('/')
  if (!joined || !isAllowedPath(joined)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const base = upstreamOrigin().replace(/\/+$/, '')
  const target = new URL(`${base}/${joined}`)
  target.search = req.nextUrl.search

  try {
    const res = await fetch(target.toString(), {
      cache: 'no-store',
      headers: {
        accept: req.headers.get('accept') || 'application/json',
      },
    })
    const buf = await res.arrayBuffer()
    const out = new NextResponse(buf, { status: res.status })
    const ct = res.headers.get('content-type')
    if (ct) out.headers.set('content-type', ct)
    return out
  } catch (e) {
    console.error('[catalog-backend proxy]', target.toString(), e)
    return NextResponse.json({ error: 'Upstream request failed' }, { status: 502 })
  }
}
