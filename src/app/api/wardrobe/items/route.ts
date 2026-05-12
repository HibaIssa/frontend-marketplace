import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const DEFAULT_UPSTREAM = 'https://marketplace-96918972071.asia-southeast1.run.app'

function upstreamOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_UPSTREAM).trim()
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).origin
  } catch {
    return DEFAULT_UPSTREAM
  }
}

export async function POST(req: NextRequest) {
  const target = `${upstreamOrigin().replace(/\/+$/, '')}/api/wardrobe/items`
  const auth = req.headers.get('authorization')
  const userId = req.headers.get('x-user-id')

  try {
    const body = await req.formData()
    const res = await fetch(target, {
      method: 'POST',
      headers: {
        ...(auth ? { authorization: auth } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
      },
      body,
      cache: 'no-store',
    })

    const buf = await res.arrayBuffer()
    const out = new NextResponse(buf, { status: res.status })
    const ct = res.headers.get('content-type')
    if (ct) out.headers.set('content-type', ct)
    return out
  } catch (e) {
    console.error('[wardrobe items proxy] failed', e)
    return NextResponse.json({ success: false, error: { message: 'Upstream request failed' } }, { status: 502 })
  }
}