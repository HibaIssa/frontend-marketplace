/**
 * Hosted Bolden admin catalog + API (same Cloud Run app).
 * Paste the full browser URL (including `/admin/catalog`) into NEXT_PUBLIC_ADMIN_DASHBOARD_API_URL if you like;
 * REST calls always use {@link getAdminDashboardApiOrigin} (scheme + host only).
 */

/** Full URL of the deployed admin catalog UI (browser address bar). */
export const DEFAULT_ADMIN_DASHBOARD_URL =
  'https://marketplace-app-96918972071.asia-southeast1.run.app/admin/catalog'

/** Same deployment’s API origin (no path). */
export const DEFAULT_ADMIN_DASHBOARD_API_ORIGIN =
  'https://marketplace-app-96918972071.asia-southeast1.run.app'

function resolveAdminDashboardEnvRaw(): string {
  return (process.env.NEXT_PUBLIC_ADMIN_DASHBOARD_API_URL || DEFAULT_ADMIN_DASHBOARD_URL).trim()
}

/** Origin only — used for `/admin/*`, `/products`, `/api/dashboard/*`, etc. */
export function getAdminDashboardApiOrigin(): string {
  const raw = resolveAdminDashboardEnvRaw()
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    return u.origin
  } catch {
    return DEFAULT_ADMIN_DASHBOARD_API_ORIGIN
  }
}

/** Hosted admin catalog page URL (for links / “open production”). */
export function getAdminCatalogPageUrl(): string {
  const raw = resolveAdminDashboardEnvRaw()
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    const path =
      u.pathname && u.pathname !== '/' ? u.pathname.replace(/\/+$/, '') : '/admin/catalog'
    return `${u.origin}${path}`
  } catch {
    return DEFAULT_ADMIN_DASHBOARD_URL.replace(/\/+$/, '')
  }
}

/**
 * When set to `1`, catalog admin nav + middleware send users to the hosted Bolden URL
 * (see {@link getAdminCatalogPageUrl}) instead of staying on localhost.
 */
export function hostedCatalogNavEnabled(): boolean {
  return process.env.NEXT_PUBLIC_HOSTED_ADMIN_CATALOG_NAV === '1'
}

/**
 * Maps local catalog routes to the full hosted URL when {@link hostedCatalogNavEnabled}.
 * Accepts paths like `/admin/catalog/prices` or `/dashboard/catalog/prices`.
 * Other paths are returned unchanged.
 */
export function hostedCatalogNavHref(localPath: string): string {
  if (!hostedCatalogNavEnabled()) return localPath
  const root = getAdminCatalogPageUrl().replace(/\/+$/, '')
  const admin = localPath.match(/^\/admin\/catalog(\/.*)?$/)
  if (admin) {
    const tail = admin[1] ?? ''
    return `${root}${tail}`
  }
  const dash = localPath.match(/^\/dashboard\/catalog(\/.*)?$/)
  if (dash) {
    const tail = dash[1] ?? ''
    return `${root}${tail}`
  }
  return localPath
}
