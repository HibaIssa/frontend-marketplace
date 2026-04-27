'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState, useCallback, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getStablePagination } from '@/lib/shopPagination'
import { compressImageForShopUpload } from '@/lib/image/compressImageForShopUpload'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NextImage from 'next/image'
import {
  Search,
  Sparkles,
  Shirt,
  Palette,
  Zap,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Camera,
  Upload,
} from 'lucide-react'
import { api, type ApiResponse } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { ProductCard } from '@/components/product/ProductCard'
import { SearchBar } from '@/components/search/SearchBar'
import {
  ShopTheLookResults,
  mergeConsecutiveShoeDetectionGroups,
  type DetectionGroup,
  type ShopTheLookStats,
} from '@/components/search/ShopTheLookResults'
import { useCompareStore } from '@/store/compare'
import type { Product } from '@/types/product'

const TRYON_SHOP_SESSION_KEY = 'styleai_tryon_shop_payload'

type HydratedShopPayload = {
  byDetection?: DetectionGroup[]
  shopImageMeta?: { width: number; height: number }
  shopTheLookStats?: ShopTheLookStats
  outfitImageUrl?: string
  source?: string
  savedAt?: number
}

function SearchProductGrid({
  products,
  addToCompare,
  inCompare,
  fromReturnPath,
}: {
  products: Product[]
  addToCompare: (id: number) => void
  inCompare: (id: number) => boolean
  fromReturnPath?: string
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {products.map((product, i) => (
        <div key={product.id}>
          <ProductCard
            product={product}
            index={i}
            snappyMotion
            fromReturnPath={fromReturnPath}
            onAddToCompare={addToCompare}
            inCompare={inCompare(product.id)}
          />
        </div>
      ))}
    </div>
  )
}

function parseCentsField(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.round(v)
  if (typeof v === 'string') {
    const n = parseInt(v, 10)
    if (Number.isFinite(n)) return n
  }
  return null
}

function priceCentsFromRecord(raw: Record<string, unknown>): number {
  const nested =
    raw.product && typeof raw.product === 'object' ? (raw.product as Record<string, unknown>) : null
  for (const o of [raw, nested].filter(Boolean) as Record<string, unknown>[]) {
    const pc = parseCentsField(o.price_cents)
    if (pc !== null && pc > 0) return pc
    const pcCamel = parseCentsField(o.priceCents)
    if (pcCamel !== null && pcCamel > 0) return pcCamel
    const p = o.price ?? o.price_usd ?? o.priceUsd ?? o.min_price ?? o.minPrice
    if (typeof p === 'string') {
      const n = parseFloat(p)
      if (!Number.isFinite(n)) continue
      if (n >= 1000 && Number.isInteger(n)) return Math.round(n)
      return Math.round(n * 100)
    }
    if (typeof p === 'number' && Number.isFinite(p)) {
      if (p >= 1000 && Number.isInteger(p)) return Math.round(p)
      return Math.round(p * 100)
    }
  }
  return 0
}

const TEXT_SEARCH_PAGE_SIZE = 24

/** Normalize GET /products/search (and legacy GET /search) responses for paginated text search */
function extractTextSearchPage(res: unknown): { results: unknown[]; total: number } {
  const r = res as {
    success?: boolean
    error?: { message?: string }
    results?: unknown[]
    data?: unknown[] | { results?: unknown[] }
    total?: number
    meta?: {
      open_search_total_estimate?: number
      total_results?: number
      total_above_threshold?: number
      total?: number
      pages?: number
    }
    pagination?: { total?: number; pages?: number }
  }
  if (r?.success === false) {
    throw new Error(r?.error?.message ?? 'Search failed')
  }
  let results: unknown[] = []
  if (Array.isArray(r.results)) results = r.results
  else if (r.data && Array.isArray(r.data)) results = r.data
  else if (r.data && typeof r.data === 'object' && Array.isArray((r.data as { results?: unknown[] }).results)) {
    results = (r.data as { results: unknown[] }).results
  }
  let total = typeof r.total === 'number' && Number.isFinite(r.total) ? r.total : 0
  const pag = r.pagination
  if (!total && pag && typeof pag.total === 'number' && pag.total > 0) total = pag.total
  if (!total && r.meta && typeof r.meta === 'object') {
    const mt = r.meta.total
    const est = r.meta.open_search_total_estimate
    const tr = r.meta.total_results
    const ta = r.meta.total_above_threshold
    if (typeof mt === 'number' && mt > 0) total = mt
    else if (typeof est === 'number' && est > 0) total = est
    else if (typeof tr === 'number' && tr > 0) total = tr
    else if (typeof ta === 'number' && ta > 0) total = ta
  }
  return { results, total }
}

function toProducts(results: unknown[]): Product[] {
  return results
    .filter((r): r is Record<string, unknown> => {
      if (!r || typeof r !== 'object') return false
      const o = r as Record<string, unknown>
      if ('id' in o || 'product_id' in o || 'productId' in o) return true
      const src = o._source
      return Boolean(src && typeof src === 'object' && ('product_id' in src || 'id' in src))
    })
    .map((r) => {
      const raw = r as Record<string, unknown>
      const nested =
        raw._source && typeof raw._source === 'object' ? (raw._source as Record<string, unknown>) : null
      const src = nested ?? raw
      const idRaw = src.id ?? src.product_id ?? src.productId ?? raw.id ?? raw.product_id ?? raw.productId ?? 0
      const id = typeof idRaw === 'number' && Number.isFinite(idRaw) ? idRaw : Number(String(idRaw).replace(/\D/g, '') || 0)
      const saleRaw = src.sales_price_cents ?? src.salesPriceCents ?? raw.sales_price_cents ?? raw.salesPriceCents ?? raw.sale_price
      const sales_price_cents = parseCentsField(saleRaw)
      return {
        id: Number.isFinite(id) && id >= 1 ? id : 0,
        title: String(src.title ?? src.name ?? raw.title ?? raw.name ?? ''),
        price_cents: priceCentsFromRecord(src),
        sales_price_cents: sales_price_cents ?? null,
        image_url: (src.image_url ?? src.imageUrl ?? src.image_cdn ?? src.imageCdn ?? raw.image_url ?? raw.imageUrl ?? null) as string | null,
        image_cdn: (src.image_cdn ?? src.imageCdn ?? raw.image_cdn ?? null) as string | null,
        brand: (src.brand ?? raw.brand) as string | null,
        category: (src.category ?? raw.category) as string | null,
      } as Product
    })
}


function SearchContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const q = searchParams.get('q') || ''
  const pageFromUrl = Math.max(1, Math.min(999, parseInt(searchParams.get('page') || '1', 10) || 1))
  const rawMode = searchParams.get('mode')
  const mode = rawMode === 'shop' ? 'shop' : 'text'

  useEffect(() => {
    if (rawMode === 'image' || rawMode === 'multi') {
      const next = new URLSearchParams(searchParams.toString())
      next.delete('mode')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    }
  }, [rawMode, pathname, router, searchParams])

  const discoverReturnPath = useMemo(() => {
    const qs = searchParams.toString()
    return qs ? `/search?${qs}` : '/search'
  }, [searchParams])

  const goSearchPage = useCallback(
    (p: number) => {
      const next = new URLSearchParams(searchParams.toString())
      if (p <= 1) next.delete('page')
      else next.set('page', String(p))
      const qs = next.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )
  const addToCompare = useCompareStore((s) => s.add)
  const inCompare = useCompareStore((s) => s.has)

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [hydratedShop, setHydratedShop] = useState<HydratedShopPayload | null>(null)
  const [pageJumpDraft, setPageJumpDraft] = useState(() => String(pageFromUrl))

  useEffect(() => {
    setPageJumpDraft(String(pageFromUrl))
  }, [pageFromUrl])

  useEffect(() => {
    if (mode !== 'shop') {
      setImageFile(null)
      setHydratedShop(null)
    }
  }, [mode])

  useEffect(() => {
    if (mode !== 'shop' || imageFile) return
    try {
      const raw = sessionStorage.getItem(TRYON_SHOP_SESSION_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as HydratedShopPayload
      const detections = Array.isArray(parsed?.byDetection) ? parsed.byDetection : []
      if (!detections.length || !parsed?.outfitImageUrl) return
      setHydratedShop({
        byDetection: detections,
        shopImageMeta: parsed.shopImageMeta,
        shopTheLookStats: parsed.shopTheLookStats,
        outfitImageUrl: parsed.outfitImageUrl,
        source: parsed.source,
        savedAt: parsed.savedAt,
      })
      setImagePreviewUrl(parsed.outfitImageUrl)
      sessionStorage.removeItem(TRYON_SHOP_SESSION_KEY)
    } catch {
      // ignore invalid session payload
    }
  }, [mode, imageFile])

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('')
      return
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const imageKey = imageFile ? `${imageFile.name}-${imageFile.size}-${imageFile.lastModified}` : ''

  const textSearchActive = mode === 'text' && !!q.trim()

  /** useMutation avoids double POST in React 18 Strict Mode (dev), which useQuery can trigger twice when `enabled` flips on. */
  const shopImageSearch = useMutation({
    mutationFn: async (file: File) => {
      const uploadFile = await compressImageForShopUpload(file)
      const formData = new FormData()
      formData.append('image', uploadFile)
      const res = await api.postForm(endpoints.images.search, formData)
      const raw = res as Record<string, unknown>
      if (raw?.success === false) {
        const err = raw.error as { message?: string } | string | undefined
        const msg = typeof err === 'string' ? err : err?.message
        throw new Error(msg ?? 'Shop the look failed')
      }
      const sp = (raw.similarProducts ?? raw.data) as {
        byDetection?: unknown[]
        shopTheLookStats?: ShopTheLookStats
      } | undefined
      let byDetection = sp?.byDetection ?? raw.byDetection
      if (!Array.isArray(byDetection)) byDetection = []
      const shopTheLookStats =
        sp && typeof sp.shopTheLookStats === 'object' && sp.shopTheLookStats !== null
          ? (sp.shopTheLookStats as ShopTheLookStats)
          : undefined
      const ri = raw.image as { width?: number; height?: number } | undefined
      const shopImageMeta =
        ri && typeof ri.width === 'number' && typeof ri.height === 'number' && ri.width > 0 && ri.height > 0
          ? { width: ri.width, height: ri.height }
          : undefined
      const groups = mergeConsecutiveShoeDetectionGroups((byDetection as DetectionGroup[]) || [])
      const results = groups.flatMap((d) => (Array.isArray(d.products) ? d.products : []))
      return {
        results,
        query: { shopTheLook: true },
        byDetection: groups,
        shopImageMeta,
        shopTheLookStats,
      }
    },
    retry: false,
  })

  const resetShopImageSearch = shopImageSearch.reset
  useEffect(() => {
    resetShopImageSearch()
    if (imageFile) setHydratedShop(null)
  }, [imageFile, imageKey, resetShopImageSearch])

  const handleShopSearch = useCallback(() => {
    if (!imageFile || shopImageSearch.isPending) return
    shopImageSearch.mutate(imageFile)
  }, [imageFile, shopImageSearch])

  const textSearchPaged = useQuery({
    queryKey: ['search', 'text', 'page', q.trim(), TEXT_SEARCH_PAGE_SIZE, pageFromUrl],
    queryFn: async () => {
      const res = await api.get<unknown>(endpoints.products.search, {
        q: q.trim(),
        limit: TEXT_SEARCH_PAGE_SIZE,
        page: pageFromUrl,
        includeRelated: 'false',
      })
      if ((res as ApiResponse<unknown>).success === false) {
        throw new Error((res as ApiResponse<unknown>).error?.message ?? 'Search failed')
      }
      const { results, total } = extractTextSearchPage(res)
      const stable = getStablePagination(res as ApiResponse<unknown>, TEXT_SEARCH_PAGE_SIZE)
      const totalItems = stable?.totalItems ?? total
      const totalPages =
        stable && stable.totalPages >= 1
          ? stable.totalPages
          : totalItems > 0
            ? Math.max(1, Math.ceil(totalItems / TEXT_SEARCH_PAGE_SIZE))
            : null
      return {
        results,
        page: pageFromUrl,
        totalItems,
        totalPages,
        resultCount: results.length,
      }
    },
    enabled: textSearchActive,
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })

  const products = useMemo(() => {
    if (!textSearchActive) return []
    const list = toProducts(textSearchPaged.data?.results ?? [])
    const seen = new Set<number>()
    return list.filter((p) => {
      if (p.id < 1 || seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }, [textSearchActive, textSearchPaged.data])

  const shopPayload = shopImageSearch.data as {
    byDetection?: DetectionGroup[]
    shopImageMeta?: { width: number; height: number }
    shopTheLookStats?: ShopTheLookStats
  } | null
  const shopDetections: DetectionGroup[] = shopPayload?.byDetection ?? hydratedShop?.byDetection ?? []
  const shopImageMeta = shopPayload?.shopImageMeta ?? hydratedShop?.shopImageMeta
  const shopTheLookStats = shopPayload?.shopTheLookStats ?? hydratedShop?.shopTheLookStats

  /** Don’t replace the grid with skeletons while paginating — `placeholderData` keeps prior `data` during fetch. */
  const textSearchBlocking =
    textSearchActive && !textSearchPaged.data && textSearchPaged.fetchStatus === 'fetching'

  const isLoadingState = textSearchActive
    ? textSearchBlocking
    : mode === 'shop' && !!imageFile && shopImageSearch.isPending

  const searchFailed = textSearchActive
    ? textSearchPaged.isError
    : mode === 'shop' && !!imageFile && shopImageSearch.isError

  const searchError = textSearchActive ? textSearchPaged.error : shopImageSearch.error

  const modeTabs = [
    { key: 'text', label: 'Text', Icon: Search, href: '/search', desc: 'Describe what you want' },
    { key: 'shop', label: 'Shop the look', Icon: Sparkles, href: '/search?mode=shop', desc: 'AI detects items' },
  ] as const

  const textReportedTotal = textSearchPaged.data?.totalItems ?? 0
  const textPageResultCount = textSearchPaged.data?.resultCount ?? textSearchPaged.data?.results?.length ?? 0
  const totalPagesFromApi = textSearchPaged.data?.totalPages
  const textTotalPagesDisplay =
    totalPagesFromApi != null && totalPagesFromApi >= 1
      ? totalPagesFromApi
      : textReportedTotal > 0
        ? Math.max(1, Math.ceil(textReportedTotal / TEXT_SEARCH_PAGE_SIZE))
        : null
  const knownTotalPages = totalPagesFromApi != null && totalPagesFromApi >= 1 ? totalPagesFromApi : 0
  const hasFullTextPage = textPageResultCount >= TEXT_SEARCH_PAGE_SIZE
  const canGoNextDiscover = knownTotalPages > 1 ? pageFromUrl < knownTotalPages : hasFullTextPage
  const textHasPrevPage = textSearchActive && pageFromUrl > 1
  const textHasNextPage = textSearchActive && canGoNextDiscover
  const textShowPagination =
    textSearchActive && products.length > 0 && (pageFromUrl > 1 || textHasNextPage || knownTotalPages > 1)

  const suggestedSearches = [
    { label: 'Summer dresses', icon: Shirt, gradient: 'from-blue-600 to-orange-400' },
    { label: 'Casual sneakers', icon: TrendingUp, gradient: 'from-blue-600 to-blue-600' },
    { label: 'Evening outfit', icon: Sparkles, gradient: 'from-blue-600 to-blue-600' },
    { label: 'Colorful accessories', icon: Palette, gradient: 'from-sky-500 to-cyan-400' },
  ]

  const { data: trendingProducts } = useQuery({
    queryKey: ['search-trending'],
    queryFn: async () => {
      const res = await api.get<Array<{
        id: number; title: string; brand?: string | null; category?: string | null
        price_cents: number; currency?: string; image_cdn?: string | null; image_url?: string | null
      }>>(endpoints.products.list, { limit: 8, page: 1 })
      const raw = Array.isArray(res?.data) ? res.data : []
      return raw.filter((p: { image_cdn?: string | null; image_url?: string | null }) => p.image_cdn || p.image_url).slice(0, 6)
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !q && mode === 'text',
  })

  return (
    <>
      {/* ── Header area with mesh background ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-sky-50/40 to-neutral-100 border-b border-neutral-200/60">
        <div className="pointer-events-none absolute -top-20 -right-20 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute top-10 -left-16 h-56 w-56 rounded-full bg-blue-100/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-1/2 h-48 w-48 rounded-full bg-amber-200/20 blur-3xl" aria-hidden />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-600 text-white shadow-md shadow-blue-600/20">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900">Discover</h1>
                <p className="text-sm text-neutral-500 mt-0.5">
                  Search by keywords, or use Shop the look on an outfit photo
                </p>
              </div>
            </div>

            <SearchBar
              placeholder='Search "red summer dress", "casual sneakers"...'
              initialQuery={q}
              isLoading={textSearchActive && textSearchPaged.isFetching}
            />

            <div className="grid grid-cols-2 gap-2 mt-5">
              {modeTabs.map((tab, i) => (
                <motion.a
                  key={tab.key}
                  href={tab.href}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    mode === tab.key
                      ? 'bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-white/80 text-neutral-600 border border-neutral-200/80 hover:border-blue-100 hover:text-blue-900 hover:bg-sky-50/50 backdrop-blur-sm'
                  }`}
                >
                  <tab.Icon className="w-4 h-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="leading-tight">{tab.label}</p>
                    <p
                      className={`text-[10px] font-normal leading-tight mt-0.5 ${
                        mode === tab.key ? 'text-white/80' : 'text-neutral-400'
                      }`}
                    >
                      {tab.desc}
                    </p>
                  </div>
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          {mode === 'shop' && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
              {!imageFile ? (
                <div className="relative p-8 sm:p-10 rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50/80 hover:border-blue-100/80 transition-colors">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-xl bg-blue-600/10 blur-lg" />
                      <div className="relative w-16 h-16 rounded-xl bg-slate-100 ring-1 ring-slate-200/80 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-blue-800" strokeWidth={1.75} />
                      </div>
                    </div>
                    <p className="font-display text-base font-semibold text-slate-900 mb-1">Upload an outfit photo</p>
                    <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
                      We detect pieces in your shot and match each one to similar products you can shop.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      id="shop-image-file-pick"
                      className="hidden"
                      onChange={(e) => {
                        setImageFile(e.target.files?.[0] || null)
                        e.target.value = ''
                      }}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      id="shop-image-camera-capture"
                      className="hidden"
                      onChange={(e) => {
                        setImageFile(e.target.files?.[0] || null)
                        e.target.value = ''
                      }}
                    />
                    <div className="flex flex-wrap justify-center gap-3">
                      <label
                        htmlFor="shop-image-file-pick"
                        className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-blue-900 text-sm font-semibold border border-blue-100 hover:bg-sky-50 hover:border-sky-200 shadow-sm active:scale-[0.97] transition-all"
                      >
                        <Upload className="w-4 h-4" />
                        Choose file
                      </label>
                      <label
                        htmlFor="shop-image-camera-capture"
                        className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-orange-500 shadow-md shadow-blue-600/20 active:scale-[0.97] transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        Take a photo
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                  <div className="flex items-start gap-5">
                    <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 ring-1 ring-slate-200/80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreviewUrl} alt="Preview" className="object-cover w-full h-full" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm font-semibold text-neutral-800 truncate">{imageFile.name}</p>
                      <p className="text-xs text-neutral-500 mt-0.5">{(imageFile.size / 1024).toFixed(0)} KB</p>
                      <div className="flex flex-wrap gap-2 mt-4">
                        <button
                          type="button"
                          onClick={handleShopSearch}
                          disabled={shopImageSearch.isPending}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 text-white text-sm font-semibold hover:from-blue-600 hover:to-orange-500 shadow-md shadow-blue-600/20 active:scale-[0.97] transition-all disabled:opacity-60 disabled:pointer-events-none"
                        >
                          <Search className="w-4 h-4" />
                          Search
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageFile(null)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
                        >
                          Change image
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>

        <div className="min-h-[320px]">
          {isLoadingState ? (
            mode === 'shop' ? (
              <div className="grid lg:grid-cols-[320px_1fr] gap-8 lg:gap-12">
                <div className="flex flex-col items-center">
                  <div className="w-full max-w-[280px] aspect-[3/4] rounded-2xl skeleton-shimmer ring-1 ring-neutral-200/60" />
                  <div className="h-6 w-32 rounded-full skeleton-shimmer mt-5" />
                </div>
                <div className="space-y-8">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl skeleton-shimmer" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 rounded skeleton-shimmer" />
                          <div className="h-2.5 w-20 rounded skeleton-shimmer" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {[0, 1, 2].map((j) => (
                          <div key={j} className="rounded-2xl border border-neutral-200/60 overflow-hidden">
                            <div className="aspect-[3/4] skeleton-shimmer" />
                            <div className="p-3 space-y-2">
                              <div className="h-2.5 w-1/3 rounded skeleton-shimmer" />
                              <div className="h-3 w-3/4 rounded skeleton-shimmer" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <div className="aspect-[3/4] rounded-2xl skeleton-shimmer ring-1 ring-neutral-200/60" />
                    <div className="h-3 w-2/3 rounded-md skeleton-shimmer" />
                    <div className="h-3 w-1/2 rounded-md skeleton-shimmer" />
                  </div>
                ))}
              </div>
            )
          ) : mode === 'shop' && shopDetections.length > 0 && imagePreviewUrl ? (
            <ShopTheLookResults
              groups={shopDetections}
              outfitImageUrl={imagePreviewUrl}
              imageMeta={shopImageMeta}
              shopTheLookStats={shopTheLookStats}
              returnPath={discoverReturnPath}
            />
          ) : products.length > 0 ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-medium text-neutral-500">
                  {textSearchActive ? (
                    products.length === 0 ? (
                      <>No results on this page</>
                    ) : (
                      <>
                        Showing {(pageFromUrl - 1) * TEXT_SEARCH_PAGE_SIZE + 1}–
                        {(pageFromUrl - 1) * TEXT_SEARCH_PAGE_SIZE + products.length}
                        {textReportedTotal > 0 ? ` of ${textReportedTotal.toLocaleString()}` : ''}
                      </>
                    )
                  ) : (
                    <>
                      {products.length} result{products.length !== 1 ? 's' : ''} shown
                    </>
                  )}
                </p>
              </div>
              <SearchProductGrid
                products={products}
                addToCompare={addToCompare}
                inCompare={inCompare}
                fromReturnPath={discoverReturnPath}
              />
              {textShowPagination ? (
                <nav
                  className="mt-10 flex flex-col items-center gap-5"
                  aria-label="Search results pagination"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-3xl">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => goSearchPage(pageFromUrl - 1)}
                        disabled={!textHasPrevPage || textSearchPaged.isFetching}
                        className="p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-sky-50 hover:border-blue-100 hover:text-blue-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex items-center gap-1 px-1 flex-wrap justify-center max-w-[min(100vw-8rem,28rem)]">
                        {(() => {
                          const tp =
                            knownTotalPages > 0
                              ? knownTotalPages
                              : pageFromUrl + (textHasNextPage ? 1 : 0)
                          const windowSize = Math.min(Math.max(tp, 1), 7)
                          return Array.from({ length: windowSize }).map((_, i) => {
                            let pageNum: number
                            if (tp <= 7) {
                              pageNum = i + 1
                            } else if (pageFromUrl <= 4) {
                              pageNum = i + 1
                            } else if (pageFromUrl >= tp - 3) {
                              pageNum = tp - 6 + i
                            } else {
                              pageNum = pageFromUrl - 3 + i
                            }
                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => goSearchPage(pageNum)}
                                disabled={textSearchPaged.isFetching}
                                className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                                  pageNum === pageFromUrl
                                    ? 'bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-md shadow-blue-600/20'
                                    : 'text-neutral-600 hover:bg-sky-50 hover:text-blue-900'
                                }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })
                        })()}

                        {knownTotalPages === 0 && textHasNextPage && (
                          <span className="w-9 h-9 flex items-center justify-center text-sm text-neutral-400" aria-hidden>
                            …
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => goSearchPage(pageFromUrl + 1)}
                        disabled={!textHasNextPage || textSearchPaged.isFetching}
                        className="p-2.5 rounded-xl border border-neutral-200 bg-white text-neutral-600 hover:bg-sky-50 hover:border-blue-100 hover:text-blue-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <form
                      className="flex items-center gap-2 flex-wrap justify-center"
                      onSubmit={(e) => {
                        e.preventDefault()
                        const n = parseInt(pageJumpDraft, 10)
                        if (!Number.isFinite(n) || n < 1) return
                        const maxP = knownTotalPages > 0 ? knownTotalPages : n
                        goSearchPage(knownTotalPages > 0 ? Math.min(n, maxP) : n)
                      }}
                    >
                      <label htmlFor="discover-page-jump" className="text-sm text-neutral-500 whitespace-nowrap">
                        Go to page
                      </label>
                      <input
                        id="discover-page-jump"
                        type="number"
                        min={1}
                        {...(knownTotalPages > 0 ? { max: knownTotalPages } : {})}
                        value={pageJumpDraft}
                        onChange={(e) => setPageJumpDraft(e.target.value)}
                        className="w-16 px-2 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-800 text-center text-sm focus:ring-2 focus:ring-blue-100 focus:border-sky-200"
                      />
                      <button
                        type="submit"
                        className="px-3 py-2 rounded-lg text-sm font-semibold bg-sky-100 text-blue-900 hover:bg-blue-100 transition-colors"
                      >
                        Go
                      </button>
                    </form>

                    <p className="text-sm text-neutral-500 tabular-nums whitespace-nowrap">
                      Page {pageFromUrl}
                      {textTotalPagesDisplay != null ? ` of ${textTotalPagesDisplay}` : ''}
                    </p>
                  </div>
                </nav>
              ) : null}
            </>
          ) : searchFailed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 max-w-lg mx-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-sky-100 text-blue-700 flex items-center justify-center mx-auto mb-5">
                <Search className="w-8 h-8" />
              </div>
              <p className="font-bold text-neutral-900 text-lg mb-2">Connection issue</p>
              <p className="text-sm text-neutral-600 mb-4">
                {(searchError as Error)?.message ?? 'The backend is down or not responding.'}
              </p>
              <p className="text-xs text-neutral-400">Check that the API is running and configured correctly.</p>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="py-12"
            >
              {mode === 'shop' && !imageFile ? null : mode === 'shop' &&
                imageFile &&
                !shopImageSearch.isPending &&
                !shopImageSearch.data &&
                !shopImageSearch.isError ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md mx-auto py-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-100 to-sky-100 flex items-center justify-center mx-auto mb-4">
                    <ArrowRight className="w-6 h-6 text-blue-800 -rotate-45" />
                  </div>
                  <p className="text-neutral-600 font-medium">
                    Hit <span className="text-blue-800 font-bold">Search</span> above to detect items in your photo.
                  </p>
                </motion.div>
              ) : mode === 'shop' &&
                shopImageSearch.isSuccess &&
                shopDetections.length === 0 &&
                imagePreviewUrl ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md mx-auto py-6">
                  <div className="w-14 h-14 rounded-xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-neutral-400" />
                  </div>
                  <p className="font-semibold text-neutral-800 mb-1">No matching items found</p>
                  <p className="text-sm text-neutral-500">Try a clearer full-outfit photo or switch to text search.</p>
                </motion.div>
              ) : q && mode === 'text' ? (
                <div className="text-center max-w-md mx-auto">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-5">
                    <Search className="w-8 h-8" />
                  </div>
                  <p className="font-bold text-neutral-900 text-lg mb-2">No results for &ldquo;{q}&rdquo;</p>
                  <p className="text-neutral-500">Try different keywords or browse by category.</p>
                </div>
              ) : mode === 'text' && !q ? (
                /* ── Rich empty state ── */
                <div className="max-w-5xl mx-auto">
                  {/* Hero prompt */}
                  <div className="text-center mb-10">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="relative w-20 h-20 mx-auto mb-6"
                    >
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-600 opacity-20 blur-xl animate-pulse" />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-100 to-sky-100 flex items-center justify-center">
                        <Search className="w-9 h-9 text-blue-800" />
                      </div>
                    </motion.div>
                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="font-display text-xl sm:text-2xl font-bold text-neutral-900 mb-2"
                    >
                      What are you looking for?
                    </motion.h2>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.18 }}
                      className="text-neutral-500 max-w-md mx-auto"
                    >
                      Type a description or try one of these popular searches.
                    </motion.p>
                  </div>

                  {/* Quick search categories */}
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10"
                  >
                    {suggestedSearches.map((s) => (
                      <motion.a
                        key={s.label}
                        href={`/search?q=${encodeURIComponent(s.label)}`}
                        variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
                        whileHover={{ y: -4, scale: 1.02 }}
                        className="group relative flex flex-col items-center gap-3 p-5 rounded-2xl border border-neutral-200/80 bg-white overflow-hidden hover:shadow-xl hover:shadow-blue-600/10 transition-shadow duration-300"
                      >
                        <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300`} />
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.gradient} text-white flex items-center justify-center shadow-lg`}>
                          <s.icon className="w-5.5 h-5.5" />
                        </div>
                        <span className="text-sm font-semibold text-neutral-700 group-hover:text-neutral-900 transition-colors">{s.label}</span>
                        <ArrowRight className="w-4 h-4 text-neutral-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </motion.a>
                    ))}
                  </motion.div>

                  {/* Trending products */}
                  {trendingProducts && trendingProducts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35, duration: 0.5 }}
                    >
                      <div className="flex items-center gap-2 mb-5">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <h3 className="font-display text-base font-bold text-neutral-800">Trending now</h3>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {(trendingProducts as Array<{
                          id: number; title: string; brand?: string | null
                          price_cents: number; image_cdn?: string | null; image_url?: string | null
                        }>).map((p, i) => (
                          <motion.div
                            key={p.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + i * 0.06 }}
                          >
                            <Link
                              href={`/products/${p.id}`}
                              prefetch={false}
                              className="group block rounded-2xl overflow-hidden bg-white border border-neutral-200/80 hover:shadow-lg hover:shadow-blue-600/10 hover:-translate-y-1 transition-all duration-300"
                            >
                              <div className="relative aspect-[3/4] bg-neutral-100">
                                <NextImage
                                  src={p.image_cdn || p.image_url || ''}
                                  alt={p.title}
                                  fill
                                  unoptimized
                                  sizes="(max-width: 640px) 33vw, 120px"
                                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                              </div>
                              <div className="p-2.5">
                                {p.brand && <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-800 truncate">{p.brand}</p>}
                                <p className="text-xs font-medium text-neutral-700 truncate mt-0.5">{p.title}</p>
                                <p className="text-xs font-bold text-neutral-900 mt-1">
                                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(p.price_cents / 100)}
                                </p>
                              </div>
                            </Link>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Trending tags */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="flex flex-wrap justify-center gap-2 text-xs mt-10"
                  >
                    {['Floral maxi dress', 'White sneakers', 'Leather jacket', 'Silk blouse', 'Denim jeans', 'Boho chic', 'Minimalist bags'].map((term) => (
                      <a
                        key={term}
                        href={`/search?q=${encodeURIComponent(term)}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border border-neutral-200/80 text-neutral-600 hover:bg-sky-50 hover:border-blue-100 hover:text-blue-900 transition-all duration-200 shadow-sm"
                      >
                        <TrendingUp className="w-3 h-3" />
                        {term}
                      </a>
                    ))}
                  </motion.div>

                  {/* How it works strip */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mt-14 p-6 rounded-2xl bg-gradient-to-r from-sky-50 via-sky-50 to-sky-50 border border-sky-100/60"
                  >
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-4 text-center">How it works</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {[
                        { step: '01', title: 'Text or outfit', desc: 'Search by keywords or open Shop the look for an outfit photo.', Icon: Search },
                        { step: '02', title: 'Refine', desc: 'Try synonyms, brands, or a clearer full-body photo.', Icon: Sparkles },
                        { step: '03', title: 'Browse results', desc: 'Open products and add favorites to compare.', Icon: Zap },
                      ].map((s) => (
                        <div key={s.step} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm border border-sky-100/60">
                            <s.Icon className="w-4 h-4 text-blue-800" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-orange-500 mb-0.5">{s.step}</p>
                            <p className="text-sm font-semibold text-neutral-800">{s.title}</p>
                            <p className="text-xs text-neutral-500 mt-0.5">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </motion.div>
          )}
        </div>
      </div>
    </>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Loading...</div>}>
      <SearchContent />
    </Suspense>
  )
}
