import type { NextRequest } from 'next/server'
import { proxyAdminDashboardRequest } from '@/lib/admin/proxyAdminDashboardRequest'

export async function GET(req: NextRequest) {
  return proxyAdminDashboardRequest(req, '/api/dashboard/alerts')
}
