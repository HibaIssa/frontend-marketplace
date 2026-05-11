import type { QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

export const SALES_LISTING_LIMIT = 40
export const SALES_LISTING_STALE_MS = 5 * 60_000

export const salesListingQueryKey = (page: number) => ['products', 'sales', page, SALES_LISTING_LIMIT] as const

export async function fetchSalesListingPage(page: number) {
  return api.get<unknown[]>(endpoints.products.sales, { page, limit: SALES_LISTING_LIMIT })
}

/** Warms the first page of /sales before navigation (e.g. Sale link hover). */
export function prefetchSalesListingFirstPage(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: salesListingQueryKey(1),
    queryFn: () => fetchSalesListingPage(1),
    staleTime: SALES_LISTING_STALE_MS,
  })
}
