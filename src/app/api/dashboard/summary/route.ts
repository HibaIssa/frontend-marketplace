import { NextResponse } from 'next/server'

const DEFAULT_CLOUD_API = 'https://marketplace-96918972071.asia-southeast1.run.app'
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_CLOUD_API).replace(/\/+$/, '')

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/api/dashboard/summary`, { cache: 'no-store' })
    const body = await res.json().catch(() => ({}))
    return NextResponse.json(body, { status: res.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reach backend dashboard summary endpoint'
    return NextResponse.json({ success: false, error: { message } }, { status: 502 })
  }
}
