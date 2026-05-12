import type { WardrobeItemDto } from '@/types/wardrobeItem'

export type WardrobeListResponse = {
  success?: boolean
  items?: unknown[]
  data?: unknown
  item?: unknown
  wardrobe_item?: unknown
  total?: number
  error?: { message?: string }
}

export function extractWardrobeItems(payload: unknown): WardrobeItemDto[] {
  const r = payload as WardrobeListResponse | undefined
  if (!r) return []
  if (Array.isArray(r.items)) return r.items as WardrobeItemDto[]
  if (Array.isArray(r.data)) return r.data as WardrobeItemDto[]
  if (r.data && typeof r.data === 'object' && Array.isArray((r.data as WardrobeListResponse).items)) {
    return (r.data as WardrobeListResponse).items as WardrobeItemDto[]
  }
  return []
}

export function mergeWardrobeItem(payload: unknown, item: WardrobeItemDto): WardrobeListResponse {
  const prev = (payload && typeof payload === 'object' ? payload : {}) as WardrobeListResponse
  const items = extractWardrobeItems(prev)
  const nextItems = [item, ...items.filter((existing) => Number(existing.id) !== Number(item.id))]
  if (prev.data && typeof prev.data === 'object' && !Array.isArray(prev.data)) {
    return {
      ...prev,
      items: nextItems,
      data: { ...(prev.data as object), items: nextItems },
      total: Math.max(Number(prev.total ?? nextItems.length), nextItems.length),
    }
  }
  return {
    ...prev,
    items: nextItems,
    data: Array.isArray(prev.data) ? nextItems : prev.data,
    total: Math.max(Number(prev.total ?? nextItems.length), nextItems.length),
  }
}
