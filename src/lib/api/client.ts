/**
 * API client for Fashion Marketplace backend (Cloud Run)
 * Backend uses snake_case: access_token, refresh_token
 */

import { DEFAULT_ADMIN_DASHBOARD_API_ORIGIN, getAdminDashboardApiOrigin } from '@/lib/admin/adminApiOrigin'
import { DEFAULT_STOREFRONT_API_ORIGIN } from '@/lib/api/fashionApiOrigin'

/** Storefront backend origin only (no trailing slash). */
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || DEFAULT_STOREFRONT_API_ORIGIN).replace(/\/+$/, '')

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const mode =
    API_BASE === DEFAULT_STOREFRONT_API_ORIGIN.replace(/\/+$/, '')
      ? 'hosted Cloud Run (local code changes will NOT apply until you redeploy the API)'
      : 'custom backend'
  console.info(`[marketplace] NEXT_PUBLIC_API_URL → ${API_BASE} (${mode})`)
  const adminBase = getAdminDashboardApiOrigin()
  const adminMode =
    adminBase === DEFAULT_ADMIN_DASHBOARD_API_ORIGIN.replace(/\/+$/, '')
      ? 'hosted admin/business-dashboard API'
      : 'custom admin/business-dashboard backend'
  console.info(`[marketplace] NEXT_PUBLIC_ADMIN_DASHBOARD_API_URL → ${adminBase} (${adminMode})`)
}

const REACHABILITY_HINT =
  'Start the API from the repo root (pnpm dev), or point NEXT_PUBLIC_API_URL in apps/marketplace/.env.local at a running backend.'
const DEFAULT_API_TIMEOUT_MS = 0

export type ApiResponse<T> = {
  success: boolean
  /** Some list/search handlers expose hit count at the root alongside `data`. */
  total?: number
  data?: T
  meta?: {
    total?: number
    total_results?: number
    open_search_total_estimate?: number
    total_above_threshold?: number
    page?: number
    limit?: number
    pages?: number
  }
  pagination?: { page?: number; limit?: number; total?: number; pages?: number; has_more?: boolean }
  error?: { message: string; code?: string; details?: unknown }
  /** Some endpoints (e.g. POST /search/multi-image) return top-level fields */
  results?: unknown
}

function getUserIdFromStorage(): number | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const user = parsed?.state?.user
    const id = user?.id
    if (typeof id === 'number' && Number.isFinite(id)) return id
    if (typeof id === 'string') {
      const n = parseInt(id, 10)
      if (Number.isFinite(n)) return n
    }
    return null
  } catch {
    return null
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('accessToken')
  const headers: Record<string, string> = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const userId = getUserIdFromStorage()
  if (userId != null) headers['x-user-id'] = String(userId)
  return headers
}

type ApiClient = {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>>
  post<T>(path: string, body?: unknown): Promise<ApiResponse<T>>
  postForm<T>(path: string, formData: FormData): Promise<ApiResponse<T>>
  patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>>
  put<T>(path: string, body?: unknown): Promise<ApiResponse<T>>
  getRaw(path: string, params?: Record<string, string | number | undefined>): Promise<{
    ok: boolean
    status: number
    contentType: string
    body: string | Record<string, unknown>
  }>
  delete<T>(path: string): Promise<ApiResponse<T>>
}

function createApiClient(apiBase: string): { api: ApiClient; refreshTokens: (refreshToken: string) => Promise<boolean> } {
  function joinApiUrl(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`
    return `${apiBase}${p}`
  }

  async function apiFetch(input: string | URL, init?: RequestInit): Promise<Response> {
    const timeoutMs = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || DEFAULT_API_TIMEOUT_MS
    const useTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    const controller = useTimeout ? new AbortController() : null
    const timeout = useTimeout ? setTimeout(() => controller?.abort(), timeoutMs) : null
    if (controller && init?.signal) {
      init.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }
    try {
      return await fetch(input, { ...init, signal: controller?.signal ?? init?.signal })
    } catch (e) {
      if (useTimeout && e instanceof DOMException && e.name === 'AbortError') {
        throw new Error(`API request timed out after ${Math.round(timeoutMs / 1000)}s. Please retry.`)
      }
      if (e instanceof TypeError) {
        throw new Error(`Cannot reach API at ${apiBase}. ${REACHABILITY_HINT}`)
      }
      throw e
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  // In-flight request dedupe map — prevents concurrent identical GETs from issuing
  // duplicate network traffic when multiple components request the same resource.
  const inflightGet = new Map<string, Promise<ApiResponse<unknown>>>()
  const inflightGetRaw = new Map<string, Promise<{ ok: boolean; status: number; contentType: string; body: string | Record<string, unknown> }>>()

  async function refreshTokens(refreshToken: string): Promise<boolean> {
    const res = await apiFetch(joinApiUrl('/api/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    const data = await res.json()
    const token = data?.access_token ?? data?.accessToken
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token)
      const ref = data?.refresh_token ?? data?.refreshToken
      if (ref) localStorage.setItem('refreshToken', ref)
      return true
    }
    return false
  }

  async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      /** Don't redirect on wrong-password login/signup — those return 401/400 with a JSON body. */
      let pathname = ''
      try {
        pathname = new URL(res.url).pathname
      } catch {
        pathname = res.url
      }
      const isCredentialAuthFailure =
        /^\/api\/auth\/(login|signup|forgot-password|reset-password)$/.test(pathname) ||
        pathname.endsWith('/api/auth/login') ||
        pathname.endsWith('/api/auth/signup') ||
        pathname.endsWith('/api/auth/forgot-password') ||
        pathname.endsWith('/api/auth/reset-password')

      if (res.status === 401 && typeof window !== 'undefined' && !isCredentialAuthFailure) {
        const refreshToken = localStorage.getItem('refreshToken')
        if (refreshToken) {
          const refreshed = await refreshTokens(refreshToken)
          if (refreshed) {
            return apiFetch(res.url, { headers: await getAuthHeaders() }).then((r) => handleResponse<T>(r))
          }
        }
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
      }
      const err = json?.error
      return { success: false, error: typeof err === 'string' ? { message: err } : (err || { message: res.statusText }) }
    }
    /** Some admin routes return `{ ok: true, data }` instead of `success`. */
    if (json && typeof json === 'object' && (json as { ok?: boolean }).ok === true && (json as { success?: boolean }).success === undefined) {
      return { ...(json as object), success: true } as ApiResponse<T>
    }
    return json as ApiResponse<T>
  }

  const api: ApiClient = {
    async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<ApiResponse<T>> {
      const url = new URL(joinApiUrl(path))
      if (params) {
        Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)))
      }
      const key = `GET ${url.toString()}`
      if (inflightGet.has(key)) return (inflightGet.get(key) as Promise<ApiResponse<T>>)
      const promise = (async () => {
        const res = await apiFetch(url.toString(), { headers: await getAuthHeaders() })
        try {
          return await handleResponse<T>(res)
        } finally {
          inflightGet.delete(key)
        }
      })()
      inflightGet.set(key, promise as Promise<ApiResponse<unknown>>)
      return promise
    },

    async post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
      const res = await apiFetch(joinApiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: body ? JSON.stringify(body) : undefined,
      })
      return handleResponse<T>(res)
    },

    async postForm<T>(path: string, formData: FormData): Promise<ApiResponse<T>> {
      const headers = await getAuthHeaders()
      const res = await apiFetch(joinApiUrl(path), {
        method: 'POST',
        headers: { ...headers },
        body: formData,
      })
      return handleResponse<T>(res)
    },

    async patch<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
      const res = await apiFetch(joinApiUrl(path), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: body ? JSON.stringify(body) : undefined,
      })
      return handleResponse<T>(res)
    },

    async put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
      const res = await apiFetch(joinApiUrl(path), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: body ? JSON.stringify(body) : undefined,
      })
      return handleResponse<T>(res)
    },

    /** For Prometheus `/metrics` and other non-JSON responses */
    async getRaw(path: string, params?: Record<string, string | number | undefined>): Promise<{
      ok: boolean
      status: number
      contentType: string
      body: string | Record<string, unknown>
    }> {
      const url = new URL(joinApiUrl(path))
      if (params) {
        Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, String(v)))
      }
      const key = `GETRAW ${url.toString()}`
      if (inflightGetRaw.has(key)) return inflightGetRaw.get(key) as Promise<{
        ok: boolean
        status: number
        contentType: string
        body: string | Record<string, unknown>
      }>
      const promise = (async () => {
        const res = await apiFetch(url.toString(), { headers: await getAuthHeaders() })
        try {
          const contentType = res.headers.get('content-type') || ''
          if (contentType.includes('application/json')) {
            const body = (await res.json().catch(() => ({}))) as Record<string, unknown>
            return { ok: res.ok, status: res.status, contentType, body }
          }
          const text = await res.text()
          return { ok: res.ok, status: res.status, contentType, body: text }
        } finally {
          inflightGetRaw.delete(key)
        }
      })()
      inflightGetRaw.set(key, promise)
      return promise
    },

    async delete<T>(path: string): Promise<ApiResponse<T>> {
      const res = await apiFetch(joinApiUrl(path), {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      })
      return handleResponse<T>(res)
    },
  }

  return { api, refreshTokens }
}

const storefront = createApiClient(API_BASE)
export const api = storefront.api
export const refreshTokens = storefront.refreshTokens

const adminDashboard = createApiClient(getAdminDashboardApiOrigin())
export const adminDashboardApi = adminDashboard.api

/**
 * Customer/business dashboard data lives on the storefront backend.
 * Keep `/dashboard` calls on the same Cloud Run API as the shopper app:
 * `NEXT_PUBLIC_API_URL` → https://marketplace-96918972071.asia-southeast1.run.app
 */
export const dashboardApi = storefront.api
