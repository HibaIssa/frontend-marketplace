'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, keepPreviousData } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitCompare,
  X,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  MousePointerClick,
  Layers,
  Info,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { api } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { useCompareStore, normalizeCompareProductId } from '@/store/compare'
import type { Product } from '@/types/product'
import type { CompareDecisionResponse, CompareGoal, CompareOccasion } from '@/types/compareDecision'
import { unwrapCompareDecisionResponse } from '@/lib/compare-decision/selectors'
import {
  buildCompareDecisionRequest,
  type CompareDecisionFormState,
} from '@/lib/compare-decision/buildRequest'
import { CompareDecisionResults } from '@/components/compare/CompareDecisionResults'

/** Align GET /products/:id payload with `Product` (title, primary image). */
function normalizeCompareTrayProduct(raw: Record<string, unknown>, forcedId: number): Product {
  const images = raw.images
  let fromGallery: string | null = null
  if (Array.isArray(images) && images.length > 0) {
    const list = images as Array<{ url?: string; cdn_url?: string; is_primary?: boolean }>
    const primary = list.find((im) => im?.is_primary) ?? list[0]
    fromGallery = (primary?.url ?? primary?.cdn_url ?? null) as string | null
  }
  const titleRaw = String(raw.title ?? raw.name ?? '').trim()
  const image_cdn = (raw.image_cdn as string) || (raw.image_url as string) || fromGallery || null
  const image_url = (raw.image_url as string) || fromGallery || null
  return {
    ...(raw as unknown as Product),
    id: forcedId,
    title: titleRaw || `Product #${forcedId}`,
    price_cents: Number(raw.price_cents) || 0,
    sales_price_cents: raw.sales_price_cents != null ? Number(raw.sales_price_cents) : null,
    currency: (raw.currency as string) || 'USD',
    image_url,
    image_cdn,
    brand: (raw.brand as string) ?? null,
    category: (raw.category as string) ?? null,
    description: (raw.description as string) ?? null,
    color: (raw.color as string) ?? null,
    size: (raw.size as string) ?? null,
  }
}

const GOAL_OPTIONS: { value: CompareGoal; label: string }[] = [
  { value: 'best_value', label: 'Best value' },
  { value: 'premium_quality', label: 'Premium quality' },
  { value: 'style_match', label: 'Style match' },
  { value: 'low_risk_return', label: 'Low risk / returns' },
  { value: 'occasion_fit', label: 'Occasion fit' },
]

const OCCASION_OPTIONS: { value: CompareOccasion; label: string }[] = [
  { value: 'casual', label: 'Casual' },
  { value: 'work', label: 'Work' },
  { value: 'formal', label: 'Formal' },
  { value: 'party', label: 'Party' },
  { value: 'travel', label: 'Travel' },
]

const defaultForm = (): CompareDecisionFormState => ({
  mode: 'standard',
  currentSelfRaw: '',
  aspirationalSelfRaw: '',
})

export default function ComparePage() {
  const { productIds, remove, clear } = useCompareStore()
  const [form, setForm] = useState<CompareDecisionFormState>(defaultForm)
  const [fineTuneOpen, setFineTuneOpen] = useState(true)
  /** Subset of `productIds` to send to the compare API (2–5). */
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const productIdsKey = useMemo(() => [...productIds].sort((a, b) => a - b).join(','), [productIds])

  useEffect(() => {
    setSelectedIds((prev) => {
      const inTray = new Set(productIds)
      const kept = prev.filter((id) => inTray.has(id))
      for (const id of productIds) {
        if (!kept.includes(id)) kept.push(id)
      }
      return kept
    })
  }, [productIdsKey, productIds])

  const selectedForCompare = useMemo(
    () => selectedIds.filter((id) => productIds.includes(id)),
    [selectedIds, productIds],
  )

  useEffect(() => {
    setForm((f) => {
      if (f.firstAttractionProductId == null) return f
      const fa = normalizeCompareProductId(f.firstAttractionProductId)
      if (fa == null || !selectedForCompare.includes(fa)) {
        return { ...f, firstAttractionProductId: undefined }
      }
      return f
    })
  }, [selectedForCompare])

  const compareTrayQuery = useQuery({
    queryKey: ['compare-products', productIds],
    queryFn: async (): Promise<Product[]> => {
      const results: Product[] = []
      for (const rawId of productIds) {
        const id = normalizeCompareProductId(rawId)
        if (id == null) continue
        const res = await api.get<Record<string, unknown>>(endpoints.products.byId(id))
        if (res.success === false) continue
        const raw = res.data
        if (raw && typeof raw === 'object' && ('id' in raw || 'title' in raw || 'name' in raw)) {
          results.push(normalizeCompareTrayProduct(raw as Record<string, unknown>, id))
        }
      }
      return results
    },
    enabled: productIds.length > 0,
    placeholderData: keepPreviousData,
  })
  const compareTrayProducts: Product[] | undefined = compareTrayQuery.data
  const loadingProducts = compareTrayQuery.isLoading

  const compareMutation = useMutation({
    mutationFn: async (payload: {
      productIds: number[]
      form: CompareDecisionFormState
    }): Promise<CompareDecisionResponse> => {
      const body = buildCompareDecisionRequest(payload.productIds, payload.form)
      const res = await api.post<unknown>(endpoints.compare.decision, body)
      if (res.success === false) {
        throw new Error(res.error?.message ?? 'Compare decision failed')
      }
      const raw = (res.data ?? res) as unknown
      const parsed = unwrapCompareDecisionResponse(raw)
      if (!parsed) {
        throw new Error('Unexpected response from compare decision API. Is the backend route mounted at POST /api/compare?')
      }
      return parsed
    },
  })

  const compareResult = compareMutation.data
  const canCompare = selectedForCompare.length >= 2 && selectedForCompare.length <= 5

  /** Step before API: confirm lineup + mandatory first-glance answer. */
  const [showComparePrepModal, setShowComparePrepModal] = useState(false)
  type FirstGlancePrep = 'unset' | 'none' | number
  const [prepFirstGlance, setPrepFirstGlance] = useState<FirstGlancePrep>('unset')

  const selectedKey = selectedForCompare.join(',')
  useEffect(() => {
    compareMutation.reset()
  }, [selectedKey, productIdsKey])

  useEffect(() => {
    if (compareResult) setFineTuneOpen(false)
    else setFineTuneOpen(true)
  }, [compareResult])

  const openComparePrepModal = () => {
    if (!canCompare) return
    setPrepFirstGlance('unset')
    setShowComparePrepModal(true)
  }

  const closeComparePrepModal = () => {
    if (compareMutation.isPending) return
    setShowComparePrepModal(false)
    setPrepFirstGlance('unset')
  }

  const confirmComparePrep = () => {
    if (!canCompare || prepFirstGlance === 'unset') return
    const nextForm: CompareDecisionFormState = {
      ...form,
      firstAttractionProductId: prepFirstGlance === 'none' ? undefined : prepFirstGlance,
    }
    setForm(nextForm)
    setShowComparePrepModal(false)
    setPrepFirstGlance('unset')
    compareMutation.mutate({ productIds: selectedForCompare, form: nextForm })
  }

  const toggleCompareSelection = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      return [...prev, id]
    })
  }

  const selectAllInTray = () => setSelectedIds([...productIds])
  const clearCompareSelection = () => setSelectedIds([])

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(cents / 100)

  const sliderPct = (v: number | undefined) => (v == null ? 50 : Math.round(v * 100))
  const setPreferenceSlider = (
    key: 'safeBoldPreference' | 'practicalExpressivePreference' | 'polishedEffortlessPreference',
    frac: number,
  ) => {
    setForm((f) => ({ ...f, [key]: frac }))
  }

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-b from-[#f7f0eb]/90 via-[#f3ece6]/70 to-neutral-100 border-b border-neutral-200/60">
        <div className="pointer-events-none absolute -top-20 -right-10 h-72 w-72 rounded-full bg-[#d8c6bb]/35 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute top-10 -left-16 h-56 w-56 rounded-full bg-[#eadfd7]/35 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-32 w-96 rounded-full bg-[#c9ae9f]/25 blur-3xl" aria-hidden />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#2a2623] to-[#99624E] text-white shadow-lg shadow-[#2a2623]/30 ring-4 ring-white/50">
                  <GitCompare className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#2a2623]/80 mb-1">Style decision lab</p>
                  <h1 className="font-display text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">Compare</h1>
                  <p className="text-sm text-neutral-600 mt-2 max-w-xl leading-relaxed">
                    Side-by-side picks — results first, details when you want them.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {productIds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 max-w-lg mx-auto text-center"
          >
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#2a2623] to-[#99624E] opacity-15 blur-xl" />
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[#f4ece6] to-[#ede0d7] flex items-center justify-center">
                <GitCompare className="w-10 h-10 text-[#2a2623]" />
              </div>
            </div>
            <h2 className="font-display text-xl font-bold text-neutral-900 mb-2">No products to compare</h2>
            <p className="text-neutral-500 mb-8">Browse the shop and tap the compare button on any product card.</p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#2a2623] to-[#99624E] text-white font-semibold shadow-lg shadow-[#2a2623]/20 hover:from-[#1a1816] hover:to-[#7d4b3a] active:scale-[0.97] transition-all"
            >
              Browse products
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="text-neutral-500">
                  <span className="font-semibold text-neutral-800">{productIds.length}</span> saved in tray
                </span>
                <span className="text-neutral-300 hidden sm:inline" aria-hidden>
                  ·
                </span>
                <span className="text-neutral-500">
                  <span className="font-semibold text-[#2a2623]">{selectedForCompare.length}</span> included in analysis
                </span>
                {!canCompare && selectedForCompare.length === 1 && (
                  <span className="text-amber-700 font-medium">Add one more to compare</span>
                )}
                {!canCompare && selectedForCompare.length === 0 && productIds.length >= 2 && (
                  <span className="text-amber-700 font-medium">Include at least 2 items below</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={selectAllInTray}
                  className="text-sm font-semibold text-[#2a2623] hover:text-[#1a1816] px-2 py-1 rounded-lg hover:bg-[#f7f0eb] transition-colors"
                >
                  Include all
                </button>
                <button
                  type="button"
                  onClick={clearCompareSelection}
                  className="text-sm font-medium text-neutral-500 hover:text-neutral-800 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  Clear included
                </button>
                <button
                  type="button"
                  onClick={clear}
                  className="text-sm text-neutral-400 hover:text-[#7d4b3a] px-2 py-1 transition-colors"
                >
                  Empty tray
                </button>
                {canCompare && (
                  <button
                    type="button"
                    onClick={openComparePrepModal}
                    disabled={compareMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#2a2623] to-[#99624E] text-white text-sm font-semibold shadow-md shadow-[#2a2623]/20 hover:from-[#1a1816] hover:to-[#7d4b3a] active:scale-[0.97] transition-all disabled:opacity-60"
                  >
                    {compareMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Analyzing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Run comparison
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#d8c6bb]/80 bg-gradient-to-br from-[#f7f0eb]/90 via-white to-[#f3ece6]/70 px-4 py-4 sm:px-5 sm:py-4 mb-6 shadow-sm">
              <div className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#2a2623] shadow-sm ring-1 ring-[#eadfd7]">
                  <Info className="w-4 h-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900">How to use this page</p>
                  <ol className="mt-2 space-y-2 text-sm text-neutral-600 leading-relaxed list-none">
                    <li className="flex gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#2a2623] text-[11px] font-bold text-white">
                        1
                      </span>
                      <span>
                        <strong className="text-neutral-800">Include</strong> each piece you want in this run (2–5).
                        Uncheck anything you only want to keep on the side.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4ece6] text-[11px] font-bold text-[#2a2623]">
                        2
                      </span>
                      <span>
                        Optionally tune <strong className="text-neutral-800">goal, occasion,</strong> and sliders below.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4ece6] text-[11px] font-bold text-[#2a2623]">
                        3
                      </span>
                      <span>
                        Press <strong className="text-neutral-800">Run comparison</strong> — a short form lists your picks
                        and asks <strong className="text-neutral-800">which one caught your eye first</strong> before results
                        load.
                      </span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 overflow-x-auto md:overflow-visible pb-2 md:pb-0 snap-x snap-mandatory md:snap-none scrollbar-thin -mx-1 px-1 md:mx-0 md:px-0">
              {loadingProducts
                ? [...Array(productIds.length)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[min(46vw,200px)] md:w-auto md:min-w-0 md:flex-shrink space-y-2 snap-start">
                      <div className="aspect-[3/4] rounded-2xl skeleton-shimmer ring-1 ring-neutral-200/60" />
                      <div className="h-3 w-2/3 rounded-md skeleton-shimmer" />
                    </div>
                  ))
                : compareTrayProducts?.map((p, i) => {
                    const pid = normalizeCompareProductId(p.id)
                    if (pid == null) return null
                    const isSelectedForRun = selectedForCompare.includes(pid)
                    return (
                      <motion.div
                        key={pid}
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className={`relative flex-shrink-0 w-[min(46vw,200px)] md:w-auto md:flex-1 min-w-0 snap-start rounded-2xl p-2 transition-shadow duration-300 ${
                          isSelectedForRun
                            ? 'bg-white ring-2 ring-[#2a2623]/80 shadow-lg shadow-[#2a2623]/10'
                            : 'bg-neutral-50/80 ring-1 ring-neutral-200/80 hover:ring-neutral-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => remove(pid)}
                          className="absolute top-1 right-1 z-10 p-1.5 rounded-full bg-white/95 shadow-md border border-neutral-200/80 text-neutral-400 hover:text-[#2a2623] hover:border-[#d8c6bb] transition-colors"
                          aria-label="Remove from compare tray"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <Link href={`/products/${pid}`} className="block rounded-xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-neutral-100">
                            <Image
                              src={p.image_cdn || p.image_url || 'https://placehold.co/200x260/f5f5f5/737373?text=No+Image'}
                              alt={p.title}
                              width={200}
                              height={260}
                              className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500"
                            />
                          </div>
                        </Link>
                        <div className="mt-2.5 px-0.5 space-y-2.5">
                          <Link href={`/products/${pid}`} className="block min-h-[3.25rem]">
                            <p className="text-[10px] font-semibold text-[#2a2623] uppercase tracking-wider truncate">
                              {p.brand || p.category || 'Product'}
                            </p>
                            <p className="text-sm font-medium text-neutral-800 line-clamp-2 leading-snug mt-0.5">{p.title}</p>
                            <p className="text-sm font-bold text-neutral-900 mt-1">{formatPrice(p.price_cents)}</p>
                          </Link>

                          <label
                            className={`flex items-center gap-2.5 cursor-pointer rounded-xl border bg-white px-2.5 py-2 shadow-sm transition-colors ${
                              isSelectedForRun
                                ? 'border-[#d8c6bb] ring-1 ring-[#eadfd7]'
                                : 'border-neutral-200/90 hover:border-[#d8c6bb]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#2a2623] focus:ring-[#7d4b3a]"
                              checked={isSelectedForRun}
                              onChange={() => toggleCompareSelection(pid)}
                            />
                            <span className="text-xs font-semibold text-neutral-800">Include in comparison</span>
                          </label>
                        </div>
                      </motion.div>
                    )
                  })}
            </div>

            <div className="relative rounded-3xl mb-8 p-[1px] bg-gradient-to-br from-[#eadfd7] via-[#e4d7cd] to-[#d8c6bb] shadow-xl shadow-[#2a2623]/10">
              <div className="rounded-[1.4rem] bg-white p-5 sm:p-7">
              <div className="flex items-center gap-3 mb-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4ece6] text-[#2a2623]">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="font-display font-bold text-lg text-neutral-900">Fine-tune your comparison</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">Optional — shapes value, risk, and style fit.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">Goal</label>
                  <select
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/90 px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-[#d8c6bb]"
                    value={form.compareGoal ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        compareGoal: (e.target.value || undefined) as CompareGoal | undefined,
                      }))
                    }
                  >
                    <option value="">Auto / none</option>
                    {GOAL_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">Occasion</label>
                  <select
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/90 px-3 py-2.5 text-sm text-neutral-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-[#d8c6bb]"
                    value={form.occasion ?? ''}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        occasion: (e.target.value || undefined) as CompareOccasion | undefined,
                      }))
                    }
                  >
                    <option value="">Not specified</option>
                    {OCCASION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-neutral-300 text-[#2a2623]"
                      checked={form.mode === 'alter_ego'}
                      onChange={(e) => setForm((f) => ({ ...f, mode: e.target.checked ? 'alter_ego' : 'standard' }))}
                    />
                    <span className="text-sm text-neutral-800">Alter ego mode</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">Current self (tags)</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/90 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-[#d8c6bb]"
                    placeholder="e.g. minimal, practical, office"
                    value={form.currentSelfRaw}
                    onChange={(e) => setForm((f) => ({ ...f, currentSelfRaw: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-neutral-500 uppercase mb-1.5">Aspirational self (tags)</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-neutral-200 bg-neutral-50/90 px-3 py-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-[#d8c6bb]"
                    placeholder="e.g. bold, artful, statement"
                    value={form.aspirationalSelfRaw}
                    onChange={(e) => setForm((f) => ({ ...f, aspirationalSelfRaw: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-5 mt-6 pt-6 border-t border-neutral-100">
                <div className="rounded-2xl bg-neutral-50/80 px-3 py-3 ring-1 ring-neutral-200/60">
                  <label className="block text-xs font-medium text-neutral-700 mb-2">
                    Safe <span className="text-neutral-400">↔</span> bold{' '}
                    <span className="float-right tabular-nums font-bold text-[#2a2623]">{sliderPct(form.safeBoldPreference)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderPct(form.safeBoldPreference)}
                    onChange={(e) => setPreferenceSlider('safeBoldPreference', Number(e.target.value) / 100)}
                    className="w-full h-2 rounded-full accent-[#2a2623]"
                  />
                </div>
                <div className="rounded-2xl bg-neutral-50/80 px-3 py-3 ring-1 ring-neutral-200/60">
                  <label className="block text-xs font-medium text-neutral-700 mb-2">
                    Practical <span className="text-neutral-400">↔</span> expressive{' '}
                    <span className="float-right tabular-nums font-bold text-[#2a2623]">
                      {sliderPct(form.practicalExpressivePreference)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderPct(form.practicalExpressivePreference)}
                    onChange={(e) => setPreferenceSlider('practicalExpressivePreference', Number(e.target.value) / 100)}
                    className="w-full h-2 rounded-full accent-[#2a2623]"
                  />
                </div>
                <div className="rounded-2xl bg-neutral-50/80 px-3 py-3 ring-1 ring-neutral-200/60">
                  <label className="block text-xs font-medium text-neutral-700 mb-2">
                    Polished <span className="text-neutral-400">↔</span> effortless{' '}
                    <span className="float-right tabular-nums font-bold text-[#2a2623]">
                      {sliderPct(form.polishedEffortlessPreference)}%
                    </span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sliderPct(form.polishedEffortlessPreference)}
                    onChange={(e) => setPreferenceSlider('polishedEffortlessPreference', Number(e.target.value) / 100)}
                    className="w-full h-2 rounded-full accent-[#2a2623]"
                  />
                </div>
              </div>
              </div>
            </div>

            {compareMutation.isError && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 p-4 rounded-2xl bg-[#f7f0eb] border border-[#d8c6bb] text-[#2a2623] mb-8"
              >
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{(compareMutation.error as Error)?.message ?? 'Comparison failed'}</p>
              </motion.div>
            )}

            <AnimatePresence>
              {compareResult && loadingProducts && !compareTrayProducts?.length ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-5 rounded-2xl bg-[#f7f0eb]/80 border border-[#d8c6bb] text-[#2a2623] text-sm mb-6"
                >
                  <div className="h-9 w-9 rounded-xl border-2 border-[#eadfd7] border-t-[#2a2623] animate-spin shrink-0" aria-hidden />
                  <p>Loading product names and images for your comparison…</p>
                </motion.div>
              ) : null}
              {compareResult && (!loadingProducts || (compareTrayProducts?.length ?? 0) > 0) && (
                <CompareDecisionResults
                  result={compareResult}
                  products={
                    compareTrayProducts?.filter((p) => {
                      const id = normalizeCompareProductId(p.id)
                      return id != null && selectedForCompare.includes(id)
                    }) ?? []
                  }
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      <AnimatePresence>
        {showComparePrepModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-prep-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeComparePrepModal()
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-neutral-200/80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 border-b border-neutral-100 px-5 py-4 flex items-start justify-between gap-3 bg-gradient-to-r from-[#f7f0eb]/90 to-[#f3ece6]/80">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#2a2623] mb-1">Compare</p>
                  <h2 id="compare-prep-title" className="font-display font-bold text-lg text-neutral-900 leading-tight">
                    Confirm your lineup
                  </h2>
                  <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                    Tap the piece that grabbed you first — or skip. Then we show your comparison.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeComparePrepModal}
                  disabled={compareMutation.isPending}
                  className="p-2 rounded-xl text-neutral-400 hover:bg-white/80 hover:text-neutral-700 transition-colors disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
                <div className="rounded-2xl border border-[#d8c6bb]/80 bg-[#f7f0eb]/70 px-4 py-4">
                  <p className="text-sm font-semibold text-neutral-900 mb-3">First glance</p>
                  <fieldset className="space-y-3">
                    <legend className="sr-only">First glance product</legend>
                    {loadingProducts ? (
                      <div className="text-sm text-neutral-500 py-6 text-center">Loading products…</div>
                    ) : (
                      <div className="flex flex-row gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin -mx-1 px-1">
                        {selectedForCompare.map((id) => {
                          const p = compareTrayProducts?.find((x) => normalizeCompareProductId(x.id) === id)
                          const label = p?.title ?? `Product #${id}`
                          const img =
                            p?.image_cdn || p?.image_url || 'https://placehold.co/300x380/f5f5f5/a3a3a3?text=No+Image'
                          return (
                            <label
                              key={id}
                              className={`cursor-pointer rounded-2xl border bg-white overflow-hidden transition-all shrink-0 w-[min(72vw,200px)] snap-start ${
                                prepFirstGlance === id
                                  ? 'border-orange-500 shadow-md ring-2 ring-[#eadfd7]'
                                  : 'border-neutral-200/80 hover:border-[#d8c6bb]'
                              }`}
                            >
                              <input
                                type="radio"
                                name="compare-first-glance"
                                className="sr-only"
                                checked={prepFirstGlance === id}
                                onChange={() => setPrepFirstGlance(id)}
                              />
                              <div className="relative aspect-[3/4] bg-neutral-100">
                                <Image src={img} alt={label} fill className="object-cover" sizes="(max-width: 640px) 100vw, 280px" />
                              </div>
                              <div className="px-3 py-2.5">
                                <p className="text-sm font-semibold text-neutral-900 line-clamp-2">{label}</p>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    )}
                    <label
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                        prepFirstGlance === 'none'
                          ? 'border-orange-500 bg-white shadow-sm ring-1 ring-[#eadfd7]'
                          : 'border-neutral-200/80 bg-white/70 hover:border-[#d8c6bb]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="compare-first-glance"
                        className="h-4 w-4 text-[#2a2623] border-neutral-300 focus:ring-[#7d4b3a]"
                        checked={prepFirstGlance === 'none'}
                        onChange={() => setPrepFirstGlance('none')}
                      />
                      <span className="text-sm text-neutral-800">No strong first glance — continue without it</span>
                    </label>
                  </fieldset>
                </div>
              </div>

              <div className="shrink-0 border-t border-neutral-100 px-5 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-neutral-50/80">
                <button
                  type="button"
                  onClick={closeComparePrepModal}
                  disabled={compareMutation.isPending}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-200/60 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmComparePrep}
                  disabled={prepFirstGlance === 'unset' || compareMutation.isPending || loadingProducts}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2a2623] to-[#99624E] text-white text-sm font-semibold shadow-md shadow-[#2a2623]/20 hover:from-[#1a1816] hover:to-[#7d4b3a] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {compareMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Show results
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}