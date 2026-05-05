import { NextResponse } from 'next/server'
import { fetchOverviewKPIs } from '@/lib/catalog-queries'

export async function GET() {
  try {
    const kpis = await fetchOverviewKPIs()
    return NextResponse.json(kpis)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
