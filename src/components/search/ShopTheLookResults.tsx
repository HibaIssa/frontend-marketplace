'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import NextImage from 'next/image'
import {
  Search,
  Sparkles,
  Layers,
  Shirt,
  Zap,
  Eye,
  ChevronDown,
  ScanSearch,
} from 'lucide-react'
import type { Product } from '@/types/product'

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

export interface DetectionBox {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface DetectionMeta {
  label?: string
  confidence?: number
  box?: DetectionBox
  area_ratio?: number
  style?: { occasion?: string; aesthetic?: string; formality?: number }
}

export interface DetectionGroup {
  detection?: DetectionMeta
  category?: string
  products: Product[]
  count?: number
  detectionIndex?: number
  /** Extra YOLO regions merged into this row (e.g. two shoe detections → one panel). */
  secondaryDetections?: DetectionMeta[]
}

export interface ShopTheLookStats {
  totalDetections: number
  coveredDetections: number
  emptyDetections: number
  coverageRatio: number
}

const CATEGORY_STYLES: Record<string, { icon: typeof Shirt; ring: string }> = {
  tops: { icon: Shirt, ring: 'ring-blue-100' },
  bottoms: { icon: Shirt, ring: 'ring-slate-200' },
  dress: { icon: Sparkles, ring: 'ring-blue-100' },
  dresses: { icon: Sparkles, ring: 'ring-blue-100' },
  outerwear: { icon: Layers, ring: 'ring-amber-200' },
  shoes: { icon: Zap, ring: 'ring-emerald-200' },
  bags: { icon: Eye, ring: 'ring-blue-100' },
  accessories: { icon: Sparkles, ring: 'ring-blue-100' },
  default: { icon: Search, ring: 'ring-neutral-200' },
}

function formatDetectionLabel(label: string): string {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatProductPrice(product: Product): string | null {
  const cents =
    typeof product.price_cents === 'string' ? parseInt(String(product.price_cents), 10) : product.price_cents
  if (cents == null || !Number.isFinite(cents) || cents <= 0) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function isShoeDetectionGroup(group: DetectionGroup): boolean {
  const cat = String(group.category || '').toLowerCase()
  const lab = String(group.detection?.label || '').toLowerCase()
  const blob = `${cat} ${lab}`
  return (
    /footwear|shoe|sneaker|boot|sandal|heel|pump|loafer|oxford|mule|slide|stiletto|wedge|flats?\b|clog|espadrilles?/.test(blob) ||
    /\bfoot\b/.test(cat)
  )
}

function mergeShoeDetectionRun(list: DetectionGroup[]): DetectionGroup {
  const [first, ...rest] = list
  const seen = new Set<number>()
  const products: Product[] = []
  for (const g of list) {
    for (const p of toProducts(Array.isArray(g.products) ? g.products : [])) {
      if (p.id >= 1 && !seen.has(p.id)) {
        seen.add(p.id)
        products.push(p)
      }
    }
  }
  const secondary: DetectionMeta[] = []
  for (const g of rest) {
    if (g.detection) secondary.push(g.detection)
  }
  let apiCount = 0
  for (const g of list) {
    if (typeof g.count === 'number' && Number.isFinite(g.count)) apiCount += g.count
    else apiCount += Array.isArray(g.products) ? g.products.length : 0
  }
  const baseDet: DetectionMeta = first.detection
    ? { ...first.detection, label: 'shoes' }
    : { label: 'shoes' }
  return {
    ...first,
    detection: baseDet,
    category: first.category,
    products: products as unknown as Product[],
    count: apiCount,
    secondaryDetections: secondary.length ? secondary : undefined,
    detectionIndex: first.detectionIndex,
  }
}

/** Merge adjacent shoe/footwear detections into one row (one “Shoes” category, combined products, all boxes). */
export function mergeConsecutiveShoeDetectionGroups(groups: DetectionGroup[]): DetectionGroup[] {
  const rows = groups.filter((g) => Array.isArray(g.products) && g.products.length > 0)
  if (rows.length <= 1) return rows
  const out: DetectionGroup[] = []
  let shoeRun: DetectionGroup[] = []
  const flush = () => {
    if (shoeRun.length === 0) return
    if (shoeRun.length === 1) out.push(shoeRun[0]!)
    else out.push(mergeShoeDetectionRun(shoeRun))
    shoeRun = []
  }
  for (const g of rows) {
    if (isShoeDetectionGroup(g)) shoeRun.push(g)
    else {
      flush()
      out.push(g)
    }
  }
  flush()
  return out
}

function detectionMetasWithBoxes(group: DetectionGroup): DetectionMeta[] {
  const list: DetectionMeta[] = []
  if (group.detection) list.push(group.detection)
  for (const d of group.secondaryDetections ?? []) list.push(d)
  return list
}

function boxStylePercents(box: DetectionBox, refW: number, refH: number) {
  const w = Math.max(1, refW)
  const h = Math.max(1, refH)
  const left = Math.max(0, Math.min(100, (box.x1 / w) * 100))
  const top = Math.max(0, Math.min(100, (box.y1 / h) * 100))
  const width = Math.max(0, Math.min(100 - left, ((box.x2 - box.x1) / w) * 100))
  const height = Math.max(0, Math.min(100 - top, ((box.y2 - box.y1) / h) * 100))
  return { left, top, width, height }
}

/** First detection meta in a group that has a usable bounding box (for 3D spotlight crop). */
function firstBoxMeta(group: DetectionGroup): DetectionMeta | null {
  for (const meta of detectionMetasWithBoxes(group)) {
    const box = meta.box
    if (box && [box.x1, box.y1, box.x2, box.y2].every((n) => typeof n === 'number' && Number.isFinite(n))) {
      if (box.x2 > box.x1 && box.y2 > box.y1) return meta
    }
  }
  return null
}

const SHOP_THE_LOOK_INITIAL = 6
const SHOP_THE_LOOK_STEP = 6

export function ShopTheLookResults({
  groups,
  outfitImageUrl,
  imageMeta,
  shopTheLookStats,
  returnPath,
}: {
  groups: DetectionGroup[]
  outfitImageUrl: string
  imageMeta?: { width: number; height: number }
  shopTheLookStats?: ShopTheLookStats
  /** Full `/search?...` URL for product links (back to Discover). */
  returnPath?: string
}) {
  const [visibleByKey, setVisibleByKey] = useState<Record<string, number>>({})
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  const rows = groups.filter((g) => g.products && g.products.length > 0)
  if (rows.length === 0) return null

  useEffect(() => {
    setSelectedIdx(null)
    setHoveredIdx(null)
    setHighlightedIdx(null)
    sectionRefs.current = []
  }, [outfitImageUrl])

  useEffect(() => {
    if (highlightedIdx === null) return
    const id = window.setTimeout(() => setHighlightedIdx((cur) => (cur === highlightedIdx ? null : cur)), 950)
    return () => window.clearTimeout(id)
  }, [highlightedIdx])

  const refW = imgNatural?.w ?? imageMeta?.width ?? 0
  const refH = imgNatural?.h ?? imageMeta?.height ?? 0
  const canDrawBoxes = refW > 0 && refH > 0

  const displayIndices =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < rows.length
      ? [selectedIdx]
      : rows.map((_, i) => i)

  const focusDetection = useCallback((idx: number) => {
    setSelectedIdx((cur) => {
      const next = cur === idx ? null : idx
      if (next !== null) {
        setHighlightedIdx(next)
        requestAnimationFrame(() => {
          sectionRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        })
      } else {
        setHighlightedIdx(null)
      }
      return next
    })
  }, [])

  const selectedGroup =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < rows.length ? rows[selectedIdx] : null
  const selectedMeta = selectedGroup ? firstBoxMeta(selectedGroup) : null
  const selectedCrop =
    selectedMeta?.box && canDrawBoxes ? boxStylePercents(selectedMeta.box, refW, refH) : null

  const productHref = useCallback(
    (id: number) =>
      returnPath && returnPath.startsWith('/search')
        ? `/products/${id}?from=${encodeURIComponent(returnPath)}`
        : `/products/${id}`,
    [returnPath],
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-7"
    >
      <div className="max-w-7xl mx-auto rounded-[28px] border border-fuchsia-100/80 bg-gradient-to-br from-white via-fuchsia-50/40 to-cyan-50/40 p-5 sm:p-6 shadow-[0_26px_70px_-42px_rgba(76,29,149,0.42)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-800/85">Style matching</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-950">Shop this look by region</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select a highlighted area on the outfit to focus one piece and open cleaner matching results.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs sm:justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-3 py-1.5 font-semibold text-white shadow-sm animate-pulse">
              <ScanSearch className="w-3.5 h-3.5" />
              {rows.length} piece{rows.length !== 1 ? 's' : ''}
            </span>
            {shopTheLookStats?.totalDetections ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">
                {shopTheLookStats.coveredDetections}/{shopTheLookStats.totalDetections} detected
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-6 lg:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="rounded-3xl overflow-hidden border border-fuchsia-100 bg-slate-950 shadow-[0_20px_42px_-20px_rgba(124,58,237,0.52)]">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={outfitImageUrl}
                alt="Outfit with detected pieces"
                className={`w-full h-auto max-h-[76vh] object-contain object-top transition duration-500 ${
                  selectedIdx !== null ? 'brightness-[0.92] saturate-[0.94] blur-[0.3px]' : ''
                }`}
                onLoad={(e) => {
                  const el = e.currentTarget
                  setImgNatural({ w: el.naturalWidth, h: el.naturalHeight })
                }}
              />

              <motion.div
                aria-hidden
                initial={false}
                animate={{ opacity: selectedIdx !== null ? 1 : 0 }}
                transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                className="pointer-events-none absolute inset-0 bg-slate-950/8"
              />

              {selectedIdx !== null && selectedCrop ? (
                <motion.div
                  key={`focus-region-${selectedIdx}`}
                  aria-hidden
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="pointer-events-none absolute z-20 rounded-xl border border-blue-100/95 bg-orange-500/10 ring-1 ring-white/75 shadow-[0_10px_24px_-16px_rgba(124,58,237,0.48)]"
                  style={{
                    left: `${selectedCrop.left}%`,
                    top: `${selectedCrop.top}%`,
                    width: `${selectedCrop.width}%`,
                    height: `${selectedCrop.height}%`,
                  }}
                />
              ) : null}

              {canDrawBoxes &&
                rows.map((group, i) => {
                  const meta = firstBoxMeta(group)
                  const box = meta?.box
                  if (!box) return null
                  const p = boxStylePercents(box, refW, refH)
                  const isActive = selectedIdx === i || (selectedIdx === null && hoveredIdx === i)
                  const isDimmed = selectedIdx !== null && selectedIdx !== i
                  const text = formatDetectionLabel(String(group.detection?.label || group.category || 'Item'))
                  return (
                    <button
                      key={`hotspot-${i}-${group.detectionIndex ?? ''}`}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        focusDetection(i)
                      }}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx((cur) => (cur === i ? null : cur))}
                      aria-label={`Select ${text}`}
                      className={`absolute z-10 overflow-hidden rounded-xl border text-left transition-all duration-200 ${
                        isDimmed ? 'opacity-30' : 'opacity-100'
                      } ${
                        isActive
                          ? 'border-blue-100/95 shadow-[0_0_0_1px_rgba(196,181,253,0.85),0_14px_24px_-16px_rgba(124,58,237,0.9)]'
                          : 'border-white/80 hover:border-blue-100/90'
                      }`}
                      style={{
                        left: `${p.left}%`,
                        top: `${p.top}%`,
                        width: `${Math.max(p.width, 7)}%`,
                        height: `${Math.max(p.height, 7)}%`,
                      }}
                    >
                      <span
                        className={`absolute left-1.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
                          isActive ? 'bg-blue-800 text-white shadow-sm' : 'bg-white/92 text-slate-800'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span
                        className={`pointer-events-none absolute inset-0 ${
                          isActive
                            ? 'bg-blue-600/18 ring-2 ring-blue-100/95'
                            : 'bg-slate-100/5 ring-1 ring-white/80 hover:bg-orange-500/12'
                        }`}
                      />
                    </button>
                  )
                })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.6)]">
            <div className="flex gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedIdx(null)
                  setHighlightedIdx(null)
                }}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                  selectedIdx === null
                    ? 'border-sky-200 bg-sky-50 text-blue-950'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                All
              </button>
              {rows.map((group, i) => {
                const text = formatDetectionLabel(String(group.detection?.label || group.category || 'Item'))
                const active = selectedIdx === i
                return (
                  <button
                    key={`tag-${i}-${group.detectionIndex ?? ''}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      focusDetection(i)
                    }}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors ${
                      active
                        ? 'border-orange-500 bg-white text-slate-900 ring-2 ring-sky-100'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {text}
                  </button>
                )
              })}
            </div>
          </div>

          {selectedGroup ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.75)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Focused region</p>
              <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                {formatDetectionLabel(String(selectedGroup.detection?.label || selectedGroup.category || 'Item'))}
              </p>
            </div>
          ) : null}
        </aside>

        <section className="space-y-4">
          <div className="rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5 shadow-[0_18px_38px_-30px_rgba(15,23,42,0.65)]">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Product matches</p>
                <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
                  {selectedGroup
                    ? formatDetectionLabel(String(selectedGroup.detection?.label || selectedGroup.category || 'Item'))
                    : 'All detected pieces'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedIdx(null)
                  setHighlightedIdx(null)
                }}
                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          {displayIndices.map((i) => {
            const group = rows[i]
            const label = formatDetectionLabel(String(group.detection?.label || group.category || 'Item'))
            const catKeyRaw = String(group.category || 'default').toLowerCase()
            const style = CATEGORY_STYLES[catKeyRaw] || CATEGORY_STYLES.default
            const Icon = style.icon
            const parsed = toProducts(group.products as unknown[])
            const seen = new Set<number>()
            const unique = parsed.filter((p) => {
              if (seen.has(p.id)) return false
              seen.add(p.id)
              return true
            })
            if (unique.length === 0) return null

            const sectionKey = `stl-${group.detectionIndex ?? i}-${i}`
            const visibleCap = visibleByKey[sectionKey] ?? SHOP_THE_LOOK_INITIAL
            const visibleProducts = unique.slice(0, visibleCap)
            const hasMore = unique.length > visibleProducts.length
            const selected = selectedIdx === i
            const highlighted = highlightedIdx === i

            return (
              <motion.section
                key={sectionKey}
                ref={(el) => {
                  sectionRefs.current[i] = el
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: highlighted ? [1, 1.016, 1] : 1,
                }}
                transition={{
                  duration: highlighted ? 0.46 : 0.26,
                  delay: i * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`rounded-[22px] border bg-white p-4 sm:p-5 ${
                  highlighted
                    ? 'border-sky-200 ring-1 ring-blue-100 shadow-[0_0_0_1px_rgba(196,181,253,0.56),0_28px_54px_-34px_rgba(124,58,237,0.42)]'
                    : selected
                    ? 'border-sky-200 ring-1 ring-sky-100 shadow-[0_24px_44px_-34px_rgba(124,58,237,0.5)]'
                    : 'border-slate-200 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.65)]'
                }`}
              >
                <div className="mb-4 flex items-start gap-3">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-700 ring-1 ${style.ring}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-semibold text-slate-900 truncate">{label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {unique.length} curated match{unique.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                      selected
                        ? 'border-blue-100 bg-sky-50 text-blue-900'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    From hotspot {i + 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {visibleProducts.map((product) => {
                    const img = product.image_cdn || product.image_url || ''
                    const price = formatProductPrice(product)
                    return (
                      <Link
                        key={product.id}
                        href={productHref(product.id)}
                        className="group overflow-hidden rounded-2xl border border-fuchsia-100/95 bg-white transition-all duration-300 hover:-translate-y-1 hover:scale-[1.01] hover:border-fuchsia-200 hover:shadow-[0_20px_36px_-20px_rgba(124,58,237,0.35)]"
                      >
                        <div className="relative aspect-[3/4] bg-slate-100/90">
                          {img ? (
                            <NextImage
                              src={img}
                              alt={product.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.035]"
                              sizes="(max-width: 1024px) 45vw, 220px"
                            />
                          ) : null}
                        </div>
                        <div className="p-3">
                          {product.brand ? (
                            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-900">
                              {product.brand}
                            </p>
                          ) : null}
                          <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-800">{product.title}</p>
                          {price ? <p className="mt-1.5 text-xs font-semibold text-slate-900">{price}</p> : null}
                        </div>
                      </Link>
                    )
                  })}
                </div>

                {hasMore ? (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleByKey((prev) => ({
                          ...prev,
                          [sectionKey]: (prev[sectionKey] ?? SHOP_THE_LOOK_INITIAL) + SHOP_THE_LOOK_STEP,
                        }))
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-200 bg-white px-4 py-2 text-sm font-semibold text-fuchsia-900 hover:bg-fuchsia-50 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Show more
                    </button>
                  </div>
                ) : null}
              </motion.section>
            )
          })}
        </section>
      </div>
    </motion.div>
  )
}