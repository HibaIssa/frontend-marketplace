/**
 * Admin catalog queries use Supabase; without URL + key requests can hang on placeholder clients.
 */
export function hasSupabaseCatalogEnv(): boolean {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim()
  const key =
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ADMIN_KEY ||
      '').trim()
  return Boolean(url && key)
}

const DEFAULT_CLOUD_API = 'https://marketplace-96918972071.asia-southeast1.run.app'

export function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || DEFAULT_CLOUD_API).replace(/\/+$/, '')
}
