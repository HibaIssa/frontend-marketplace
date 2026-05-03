import type { ApiResponse } from '@/lib/api/client'

export type StablePagination = {
  totalItems: number
  totalPages: number
  /** True when totals were inferred from `has_more` only (browse/list endpoints). */
  approximate?: boolean
  /** API exposes `has_more` but not total/pages — avoid showing a bogus “of 2” cap. */
  indeterminate?: boolean
}

/**
 * Pagination totals from API meta/pagination.
 * Browse `GET /products` often returns only `{ page, limit, has_more }` — infer minimal totals so the shop UI can page forward.
 */
export function getStablePagination<T>(
  payload: ApiResponse<T> | undefined,
  itemsPerPage: number
): StablePagination | null {
  if (!payload || payload.success === false) return null

  const pag = payload.pagination
  const totalItemsRaw = payload.meta?.total ?? pag?.total
  const pagesRaw = payload.meta?.pages ?? pag?.pages
  const hasMore = pag?.has_more === true

  if (typeof pagesRaw === 'number' && Number.isFinite(pagesRaw) && pagesRaw >= 1) {
    const totalPages = Math.trunc(pagesRaw)
    const totalItems =
      typeof totalItemsRaw === 'number' && totalItemsRaw >= 0
        ? totalItemsRaw
        : totalPages * itemsPerPage
    return { totalItems, totalPages }
  }

  if (typeof totalItemsRaw === 'number' && totalItemsRaw >= 0) {
    return {
      totalItems: totalItemsRaw,
      totalPages: Math.max(1, Math.ceil(totalItemsRaw / itemsPerPage)),
    }
  }

  if (hasMore) {
    return {
      totalItems: 0,
      totalPages: 0,
      approximate: true,
      indeterminate: true,
    }
  }

  return null
}
