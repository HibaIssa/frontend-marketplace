/**
 * Admin catalog and related server logic use the **same deploy** as the catalog UI
 * (`NEXT_PUBLIC_ADMIN_DASHBOARD_API_URL` → {@link getAdminDashboardApiOrigin}).
 * `/products/*` is proxied server-side via `/api/catalog-backend/products/...` so the browser
 * never needs a second public API hostname for admin.
 */

import { getAdminDashboardApiOrigin } from '@/lib/admin/adminApiOrigin'

/** Default Fashion REST service for `NEXT_PUBLIC_API_URL` (shop / fallback upstream). */
export const DEFAULT_STOREFRONT_API_ORIGIN =
  'https://marketplace-96918972071.asia-southeast1.run.app'

/** Absolute URL to this Next app’s proxy for Fashion REST (`GET /products/...` on upstream). */
export function catalogBackendAbsoluteUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const origin = getAdminDashboardApiOrigin().replace(/\/+$/, '')
  return `${origin}/api/catalog-backend${p}`
}
