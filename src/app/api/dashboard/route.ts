import { NextResponse } from 'next/server'

/** GET /api/dashboard — index of the proxied dashboard sub-routes. */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Business dashboard data is proxied from the Bolden admin API.',
    endpoints: {
      summary: '/api/dashboard/summary',
      products: '/api/dashboard/products',
      alerts: '/api/dashboard/alerts',
    },
  })
}
