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
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '**', pathname: '/**' },
      { protocol: 'http', hostname: '**', pathname: '/**' },
    ],
  },
}

module.exports = nextConfig
