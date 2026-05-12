import { refreshTokens } from '@/lib/api/client'

export type WardrobeCreateResponse<T> = {
  success?: boolean
  data?: T
  item?: T
  wardrobe_item?: T
  error?: { message?: string }
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const headers: Record<string, string> = {}
  const token = localStorage.getItem('accessToken')
  if (token) headers.authorization = `Bearer ${token}`
  try {
    const raw = localStorage.getItem('auth')
    if (raw) {
      const parsed = JSON.parse(raw)
      const userId = parsed?.state?.user?.id
      if (userId != null && `${userId}`.trim()) headers['x-user-id'] = String(userId)
    }
  } catch {
    // no-op: header remains optional
  }
  return headers
}

export async function postWardrobeItemForm<T>(formData: FormData): Promise<WardrobeCreateResponse<T>> {
  const send = async () =>
    fetch('/api/wardrobe/items', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })

  let res = await send()

  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken')
    if (refreshToken) {
      const refreshed = await refreshTokens(refreshToken)
      if (refreshed) {
        res = await send()
      }
    }
  }

  const json = (await res.json().catch(() => ({}))) as WardrobeCreateResponse<T>
  if (!res.ok) {
    return { success: false, error: json?.error ?? { message: res.statusText || 'Request failed' } }
  }
  return json
}