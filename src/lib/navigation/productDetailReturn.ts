/**
 * Build product detail URLs that preserve an in-app back target (see products/[id] safe return handler).
 */
export const PRODUCT_RETURN_COMPARE = '/compare'

const RETURN_LABELS: Array<{ test: (path: string) => boolean; label: string }> = [
  { test: (path) => path.startsWith('/search'), label: 'Back to Discover' },
  { test: (path) => path.startsWith('/sales'), label: 'Back to sale' },
  { test: (path) => path.includes('/complete-style'), label: 'Back to Complete the Style' },
  { test: (path) => path.startsWith('/products'), label: 'Back to catalog' },
  { test: (path) => path === '/compare', label: 'Back to Compare' },
  { test: (path) => path === '/try-on', label: 'Back to Try on' },
  { test: (path) => path === '/wardrobe', label: 'Back to Wardrobe' },
]

export function currentInAppPath(pathname: string, searchParams?: { toString(): string }): string {
  const qs = searchParams?.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function safeProductReturnFrom(raw: string | null): { href: string; label: string } | null {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw.trim())
    if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('..')) return null
    const pathOnly = decoded.split('?')[0] ?? ''
    const match = RETURN_LABELS.find((item) => item.test(pathOnly))
    return match ? { href: decoded, label: match.label } : null
  } catch {
    return null
  }
}

export function productDetailHref(productId: number | string, fromPath: string): string {
  const enc = encodeURIComponent(fromPath)
  return `/products/${productId}?from=${enc}`
}

export function productDetailHrefFromCompare(productId: number | string): string {
  return productDetailHref(productId, PRODUCT_RETURN_COMPARE)
}
