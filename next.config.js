const fs = require('fs')
const path = require('path')

/**
 * Optional merge from repo-root `.env` when keys are unset (useful when cloning
 * next to a backend repo). Does not override `.env.local`.
 */
;(function mergeOptionalRootEnv() {
  const rootEnv = path.join(__dirname, '.env')
  if (!fs.existsSync(rootEnv)) return

  const lines = fs.readFileSync(rootEnv, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (!key || !val) continue
    const cur = process.env[key]
    if (cur === undefined || String(cur).trim() === '') {
      process.env[key] = val
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  if (!url && process.env.SUPABASE_URL?.trim()) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL.trim()
  }
  if (!anon && process.env.SUPABASE_ANON_KEY?.trim()) {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY.trim()
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  images: {
    unoptimized: process.env.NEXT_IMAGE_UNOPTIMIZED === 'true',
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7,
    deviceSizes: [360, 480, 640, 750, 828, 1080, 1200, 1440],
    imageSizes: [32, 48, 64, 96, 128, 160, 256, 384],
    remotePatterns: [
      { protocol: 'https', hostname: '**', pathname: '/**' },
      { protocol: 'http', hostname: '**', pathname: '/**' },
    ],
  },
  async rewrites() {
    const mirror = (process.env.CATALOG_MIRROR_ORIGIN || '').trim().replace(/\/+$/, '')

    /** Local dev: transparent proxy to deployed Bolden (same JSON as Cloud Run). Browser still calls `/api/...` on localhost. */
    const catalogMirrorRewrites = mirror
      ? [
          { source: '/api/admin/overview', destination: `${mirror}/api/admin/overview` },
          { source: '/api/admin/freshness', destination: `${mirror}/api/admin/freshness` },
          { source: '/api/admin/prices', destination: `${mirror}/api/admin/prices` },
          { source: '/api/admin/vendors', destination: `${mirror}/api/admin/vendors` },
          { source: '/api/catalog/overview', destination: `${mirror}/api/catalog/overview` },
          { source: '/api/catalog/filters', destination: `${mirror}/api/catalog/filters` },
          {
            source: '/api/catalog/products/:id/price-history',
            destination: `${mirror}/api/catalog/products/:id/price-history`,
          },
          { source: '/api/catalog/products', destination: `${mirror}/api/catalog/products` },
          { source: '/api/catalog-backend/:path*', destination: `${mirror}/api/catalog-backend/:path*` },
        ]
      : []

    return [
      ...catalogMirrorRewrites,

      // Admin catalog endpoints without /api prefix
      { source: '/admin/overview', destination: '/api/admin/overview' },
      { source: '/admin/freshness', destination: '/api/admin/freshness' },
      { source: '/admin/prices', destination: '/api/admin/prices' },
      { source: '/admin/vendors', destination: '/api/admin/vendors' },

      // Business dashboard endpoints without /api prefix
      { source: '/dashboard/summary', destination: '/api/dashboard/summary' },
      { source: '/dashboard/products', destination: '/api/dashboard/products' },
      { source: '/dashboard/products/:id/signals', destination: '/api/dashboard/products/:id/signals' },
      { source: '/dashboard/alerts', destination: '/api/dashboard/alerts' },
      { source: '/dashboard/alerts/generate', destination: '/api/dashboard/alerts/generate' },
      { source: '/dashboard/alerts/:id/dismiss', destination: '/api/dashboard/alerts/:id/dismiss' },
    ]
  },
}

module.exports = nextConfig
