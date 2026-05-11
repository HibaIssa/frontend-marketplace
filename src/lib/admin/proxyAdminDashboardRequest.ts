import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getAdminDashboardApiOrigin } from '@/lib/admin/adminApiOrigin'

/**
 * Server-side proxy to the Bolden admin / business API on Cloud Run.
 * Default upstream comes from {@link getAdminDashboardApiOrigin}
 * (NEXT_PUBLIC_ADMIN_DASHBOARD_API_URL or catalog URL → origin only).
 */
export async function proxyAdminDashboardRequest(req: NextRequest, apiPath: string): Promise<NextResponse> {
  const origin = getAdminDashboardApiOrigin().replace(/\/+$/, '')
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
  const target = new URL(path, `${origin}/`)
  if (!path.includes('?')) {
    target.search = req.nextUrl.search
  }

  const headers = new Headers()
  const auth = req.headers.get('authorization')
  if (auth) headers.set('authorization', auth)

  const incomingCt = req.headers.get('content-type')
  if (incomingCt) headers.set('content-type', incomingCt)

  const method = req.method.toUpperCase()
  let body: string | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    body = await req.text()
  }

  try {
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), 120_000)
    const res = await fetch(target.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(t))

    const buf = await res.arrayBuffer()
    const out = new NextResponse(buf, { status: res.status })
    const ct = res.headers.get('content-type')
    if (ct) out.headers.set('content-type', ct)
    return out
  } catch (e) {
    console.error('[proxyAdminDashboardRequest]', target.toString(), e)
    return NextResponse.json({ success: false, error: 'Upstream dashboard request failed' }, { status: 502 })
  }
}
