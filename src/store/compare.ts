import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface CompareState {
  productIds: number[]
  add: (id: number) => void
  remove: (id: number) => void
  clear: () => void
  has: (id: number) => boolean
}

/** JSON / APIs sometimes yield string ids; compare APIs require integers. */
export function normalizeCompareProductId(id: unknown): number | null {
  if (typeof id === 'number' && Number.isFinite(id)) {
    const n = Math.trunc(id)
    return n >= 1 ? n : null
  }
  if (typeof id === 'string') {
    const n = parseInt(id, 10)
    return Number.isInteger(n) && n >= 1 ? n : null
  }
  return null
}

function normalizeCompareProductIdList(ids: unknown): number[] {
  if (!Array.isArray(ids)) return []
  const out: number[] = []
  const seen = new Set<number>()
  for (const raw of ids) {
    const n = normalizeCompareProductId(raw)
    if (n != null && !seen.has(n)) {
      seen.add(n)
      out.push(n)
    }
  }
  return out
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      productIds: [],
      add: (id) =>
        set((s) => {
          const n = normalizeCompareProductId(id)
          if (n == null || s.productIds.includes(n) || s.productIds.length >= 5) return s
          return { productIds: [...s.productIds, n] }
        }),
      remove: (id) =>
        set((s) => {
          const n = normalizeCompareProductId(id)
          if (n == null) return s
          return {
            productIds: s.productIds.filter((x) => normalizeCompareProductId(x) !== n),
          }
        }),
      clear: () => set({ productIds: [] }),
      has: (id) => {
        const n = normalizeCompareProductId(id)
        return n != null && get().productIds.includes(n)
      },
    }),
    {
      name: 'compare-products',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<CompareState> | undefined
        const merged = { ...current, ...p } as CompareState
        merged.productIds = normalizeCompareProductIdList(p?.productIds ?? current.productIds)
        return merged
      },
    }
  )
)
