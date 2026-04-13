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

const CATEGORY_STYLES: Record<string, { icon: typeof Shirt; gradient: string; bg: string }> = {
  tops: { icon: Shirt, gradient: 'from-violet-500 to-fuchsia-500', bg: 'bg-violet-50' },
  bottoms: { icon: Shirt, gradient: 'from-sky-500 to-blue-500', bg: 'bg-sky-50' },
  dresses: { icon: Sparkles, gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-50' },
  outerwear: { icon: Layers, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50' },
  shoes: { icon: Zap, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50' },
  bags: { icon: Eye, gradient: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50' },
  accessories: { icon: Sparkles, gradient: 'from-pink-500 to-rose-500', bg: 'bg-pink-50' },
  default: { icon: Search, gradient: 'from-neutral-500 to-neutral-600', bg: 'bg-neutral-50' },
}

function formatDetectionLabel(label: string): string {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatConfidence(confidence: number | undefined): string | null {
  if (confidence == null || !Number.isFinite(confidence)) return null
  const pct = confidence <= 1 ? Math.round(confidence * 100) : Math.round(confidence)
  return `${Math.min(100, Math.max(0, pct))}%`
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

const DETECTION_PALETTE = [
  { border: 'border-fuchsia-500', fill: 'bg-fuchsia-500/25', ring: 'ring-fuchsia-400/90', bar: 'border-l-fuchsia-500', chip: 'bg-fuchsia-600' },
  { border: 'border-sky-500', fill: 'bg-sky-500/25', ring: 'ring-sky-400/90', bar: 'border-l-sky-500', chip: 'bg-sky-600' },
  { border: 'border-amber-500', fill: 'bg-amber-500/25', ring: 'ring-amber-400/90', bar: 'border-l-amber-500', chip: 'bg-amber-600' },
  { border: 'border-emerald-500', fill: 'bg-emerald-500/25', ring: 'ring-emerald-400/90', bar: 'border-l-emerald-500', chip: 'bg-emerald-600' },
  { border: 'border-violet-500', fill: 'bg-violet-500/25', ring: 'ring-violet-400/90', bar: 'border-l-violet-500', chip: 'bg-violet-600' },
  { border: 'border-rose-500', fill: 'bg-rose-500/25', ring: 'ring-rose-400/90', bar: 'border-l-rose-500', chip: 'bg-rose-600' },
] as const

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
  const [activeIdx, setActiveIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const sectionRefs = useRef<(HTMLElement | null)[]>([])

  const rows = groups.filter((g) => g.products && g.products.length > 0)
  if (rows.length === 0) return null

  useEffect(() => {
    setSelectedIdx(null)
    setActiveIdx(null)
    sectionRefs.current = []
  }, [outfitImageUrl])

  const refW = imgNatural?.w ?? imageMeta?.width ?? 0
  const refH = imgNatural?.h ?? imageMeta?.height ?? 0
  const canDrawBoxes = refW > 0 && refH > 0

  const displayIndices =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < rows.length
      ? [selectedIdx]
      : rows.map((_, i) => i)

  const focusDetection = useCallback((i: number) => {
    setSelectedIdx((cur) => {
      const next = cur === i ? null : i
      if (next !== null) {
        requestAnimationFrame(() => {
          sectionRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
      }
      return next
    })
  }, [])

  const boxHighlight = (i: number) => selectedIdx === i || (selectedIdx === null && activeIdx === i)
  const boxDimmed = (i: number) => selectedIdx !== null && selectedIdx !== i

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* YOLO-aligned category strip: model label + catalog category per detection */}
      <div className="mb-6 rounded-2xl border border-neutral-200/80 bg-white/90 backdrop-blur-sm px-3 py-3 sm:px-4 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-xs font-bold text-neutral-800 tracking-tight">Shop by detection</p>
          {selectedIdx !== null ? (
            <button
              type="button"
              onClick={() => setSelectedIdx(null)}
              className="text-[11px] font-semibold text-violet-600 hover:text-violet-700 shrink-0"
            >
              Show all
            </button>
          ) : null}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="tablist" aria-label="Detected fashion items">
          <button
            type="button"
            role="tab"
            aria-selected={selectedIdx === null}
            onClick={() => setSelectedIdx(null)}
            className={`shrink-0 rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all border ${
              selectedIdx === null
                ? 'border-violet-400 bg-violet-50 text-violet-900 shadow-sm'
                : 'border-neutral-200 bg-neutral-50/80 text-neutral-600 hover:border-violet-200 hover:bg-violet-50/50'
            }`}
          >
            All items
            <span className="block text-[10px] font-normal text-neutral-500 mt-0.5">{rows.length} regions</span>
          </button>
          {rows.map((group, i) => {
            const yoloLabel = formatDetectionLabel(String(group.detection?.label || group.category || 'Item'))
            const catalog =
              group.category && String(group.category) !== String(group.detection?.label)
                ? formatDetectionLabel(String(group.category))
                : null
            const pal = DETECTION_PALETTE[i % DETECTION_PALETTE.length]
            const n = toProducts(group.products as unknown[]).filter(
              (p, idx, arr) => arr.findIndex((x) => x.id === p.id) === idx,
            ).length
            const pressed = selectedIdx === i
            return (
              <button
                key={`det-chip-${i}-${group.detectionIndex ?? ''}`}
                type="button"
                role="tab"
                aria-selected={pressed}
                onClick={() => focusDetection(i)}
                className={`shrink-0 min-w-[140px] max-w-[200px] rounded-xl px-3 py-2 text-left text-xs font-semibold transition-all border ${
                  pressed
                    ? `${pal.border} bg-white text-neutral-900 shadow-md ring-2 ring-offset-1 ring-offset-white ${pal.ring}`
                    : 'border-neutral-200 bg-white/80 text-neutral-700 hover:border-violet-200 hover:shadow-sm'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${pal.chip}`} aria-hidden />
                  <span className="truncate">{yoloLabel}</span>
                  <span
                    className={`ml-auto shrink-0 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                      pressed ? 'bg-violet-100 text-violet-800' : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    {n}
                  </span>
                </span>
                {catalog ? (
                  <span className="mt-1 block text-[10px] font-medium text-neutral-500 truncate pl-4">
                    Category · {catalog}
                  </span>
                ) : (
                  <span className="mt-1 block text-[10px] text-neutral-400 pl-4">Tap for similar picks</span>
                )}
              </button>
            )
          })}
        </div>
        {selectedIdx !== null && rows[selectedIdx] ? (
          <p className="mt-2 text-[11px] text-neutral-500">
            Showing similar products for{' '}
            <span className="font-semibold text-neutral-800">
              {formatDetectionLabel(String(rows[selectedIdx].detection?.label || rows[selectedIdx].category || 'item'))}
            </span>
            {rows[selectedIdx].category ? (
              <>
                {' '}
                · catalog{' '}
                <span className="font-medium">{formatDetectionLabel(String(rows[selectedIdx].category))}</span>
              </>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 text-[11px] text-neutral-400">
            Select a detection to focus that region on the photo and see only its matches.
          </p>
        )}
      </div>

      <div
        className="grid lg:grid-cols-[minmax(0,340px)_1fr] gap-8 lg:gap-12"
        onMouseLeave={() => setActiveIdx(null)}
      >
        {/* ── Left: outfit + YOLO boxes (intrinsic aspect, boxes in image pixel space) ── */}
        <div className="lg:sticky lg:top-24 lg:self-start flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[340px]"
          >
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-violet-400/30 via-fuchsia-400/25 to-sky-400/20 blur-xl" />
            <div className="relative rounded-2xl overflow-hidden ring-2 ring-white shadow-2xl shadow-violet-500/15 bg-neutral-900/[0.03]">
              <div className="relative inline-block w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={outfitImageUrl}
                  alt="Your outfit — detected regions highlighted"
                  className="w-full h-auto max-h-[min(72vh,520px)] object-contain object-top bg-neutral-950/[0.04] block"
                  onLoad={(e) => {
                    const el = e.currentTarget
                    setImgNatural({ w: el.naturalWidth, h: el.naturalHeight })
                  }}
                />
                {canDrawBoxes &&
                  rows.flatMap((group, i) => {
                    const pal = DETECTION_PALETTE[i % DETECTION_PALETTE.length]
                    const hi = boxHighlight(i)
                    const dim = boxDimmed(i)
                    return detectionMetasWithBoxes(group)
                      .map((meta, bi) => {
                        const box = meta.box
                        if (
                          !box ||
                          ![box.x1, box.y1, box.x2, box.y2].every((n) => typeof n === 'number' && Number.isFinite(n))
                        ) {
                          return null
                        }
                        const { left, top, width, height } = boxStylePercents(box, refW, refH)
                        if (width <= 0 || height <= 0) return null
                        const label = meta.label || group.category || 'Item'
                        return (
                          <button
                            key={`box-${i}-${bi}`}
                            type="button"
                            aria-label={`Select region: ${formatDetectionLabel(String(label))}`}
                            aria-pressed={selectedIdx === i}
                            className={`absolute rounded-md border-2 transition-all duration-200 ${pal.border} ${pal.fill} ${
                              hi ? `ring-2 ${pal.ring} ring-offset-2 ring-offset-white/90 scale-[1.02] z-10` : 'hover:opacity-100'
                            } ${dim ? 'opacity-40' : 'opacity-90'}`}
                            style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }}
                            onClick={() => focusDetection(i)}
                            onMouseEnter={() => setActiveIdx(i)}
                            onFocus={() => setActiveIdx(i)}
                            onBlur={() => setActiveIdx((cur) => (cur === i ? null : cur))}
                          />
                        )
                      })
                      .filter(Boolean)
                  })}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-5 w-full max-w-[340px] space-y-3"
          >
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-white text-[11px] font-bold">
                <ScanSearch className="w-3.5 h-3.5" />
                {rows.length} region{rows.length !== 1 ? 's' : ''} with matches
              </span>
              {shopTheLookStats && shopTheLookStats.totalDetections > 0 ? (
                <span className="text-[11px] text-neutral-500 font-medium">
                  {shopTheLookStats.coveredDetections}/{shopTheLookStats.totalDetections} detections matched
                  {shopTheLookStats.coverageRatio != null && Number.isFinite(shopTheLookStats.coverageRatio)
                    ? ` · ${Math.round(shopTheLookStats.coverageRatio * 100)}% coverage`
                    : ''}
                </span>
              ) : null}
            </div>
            <p className="text-center text-[11px] text-neutral-400 leading-relaxed px-1">
              Boxes match YOLO regions. Use the chips above or tap a box to show only that item&apos;s matches.
            </p>
          </motion.div>
        </div>

        {/* ── Right: panels per detection (all, or single when a category chip is selected) ── */}
        <div className="space-y-8 min-w-0">
          {displayIndices.map((i) => {
            const group = rows[i]
            const label = group.detection?.label || group.category || 'Item'
            const formatted = formatDetectionLabel(String(label))
            const catKey = group.category || 'default'
            const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.default
            const Icon = style.icon
            const pal = DETECTION_PALETTE[i % DETECTION_PALETTE.length]
            const confStr = formatConfidence(group.detection?.confidence)
            const st = group.detection?.style
            const areaPct =
              group.detection?.area_ratio != null && Number.isFinite(group.detection.area_ratio)
                ? `${Math.round(Math.min(1, Math.max(0, group.detection.area_ratio)) * 100)}%`
                : null

            const parsed = toProducts(group.products as unknown as unknown[])
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
            const hasMoreInSection = unique.length > visibleProducts.length
            const sectionActive = selectedIdx === i || (selectedIdx === null && activeIdx === i)

            return (
              <motion.section
                key={sectionKey}
                ref={(el) => {
                  sectionRefs.current[i] = el
                }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className={`rounded-2xl border border-neutral-200/80 bg-white/90 backdrop-blur-sm pl-4 pr-4 pt-4 pb-5 shadow-sm transition-shadow duration-200 border-l-4 ${pal.bar} ${
                  sectionActive ? 'shadow-lg shadow-violet-500/10 ring-1 ring-violet-200/80' : ''
                }`}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <div className="flex flex-wrap items-start gap-3 mb-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${style.gradient} text-white shadow-md`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-neutral-900">{formatted}</h3>
                      <span className={`text-[10px] font-bold uppercase tracking-wide text-white px-2 py-0.5 rounded-md ${pal.chip}`}>
                        #{i + 1}
                      </span>
                      {group.category ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                          Catalog · {formatDetectionLabel(String(group.category))}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                      {confStr != null ? <span>Confidence {confStr}</span> : null}
                      {areaPct != null ? <span>Area {areaPct} of frame</span> : null}
                      {typeof group.count === 'number' ? <span>API count {group.count}</span> : null}
                      {group.secondaryDetections?.length ? (
                        <span>{1 + group.secondaryDetections.length} regions merged</span>
                      ) : null}
                    </div>
                    {(st?.occasion || st?.aesthetic || st?.formality != null) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {st.occasion ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                            {st.occasion}
                          </span>
                        ) : null}
                        {st.aesthetic ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                            {st.aesthetic}
                          </span>
                        ) : null}
                        {st.formality != null && Number.isFinite(st.formality) ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                            Formality {st.formality}/10
                          </span>
                        ) : null}
                      </div>
                    )}
                    <p className="text-[11px] text-neutral-400 mt-2">
                      {unique.length} similar product{unique.length !== 1 ? 's' : ''}
                      {visibleProducts.length < unique.length ? ` · showing ${visibleProducts.length}` : ''}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {visibleProducts.map((product, j) => {
                    const imgUrl = product.image_cdn || product.image_url || ''
                    const cents =
                      typeof product.price_cents === 'string' ? parseInt(product.price_cents, 10) : product.price_cents
                    const price =
                      cents > 0
                        ? new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                          }).format(cents / 100)
                        : null
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.05 + j * 0.03, duration: 0.3 }}
                      >
                        <Link
                          href={
                            returnPath && returnPath.startsWith('/search')
                              ? `/products/${product.id}?from=${encodeURIComponent(returnPath)}`
                              : `/products/${product.id}`
                          }
                          className="group block rounded-2xl bg-white border border-neutral-200/80 overflow-hidden shadow-sm hover:shadow-lg hover:border-violet-200/90 hover:-translate-y-0.5 transition-all duration-300"
                        >
                          <div className="relative aspect-[3/4] bg-neutral-50">
                            {imgUrl && (
                              <NextImage
                                src={imgUrl}
                                alt={product.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                sizes="(max-width: 640px) 45vw, 200px"
                                onError={(e) => {
                                  e.currentTarget.src =
                                    'https://placehold.co/320x426/f5f5f5/737373?text=No+Image'
                                }}
                              />
                            )}
                          </div>
                          <div className="p-3">
                            {product.brand && (
                              <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider truncate">
                                {product.brand}
                              </p>
                            )}
                            <p className="text-sm font-medium text-neutral-800 line-clamp-2 mt-0.5">{product.title}</p>
                            {price && <p className="text-sm font-bold text-neutral-900 mt-1">{price}</p>}
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>

                {hasMoreInSection && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleByKey((prev) => ({
                          ...prev,
                          [sectionKey]: (prev[sectionKey] ?? SHOP_THE_LOOK_INITIAL) + SHOP_THE_LOOK_STEP,
                        }))
                      }
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-violet-200 bg-white text-sm font-semibold text-violet-700 hover:bg-violet-50 transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                      Show more
                    </button>
                  </div>
                )}
              </motion.section>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}