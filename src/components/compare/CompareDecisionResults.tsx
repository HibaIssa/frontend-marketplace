'use client'

import { useMemo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Split,
  Shirt,
  Users,
  Eye,
  GitCompare,
  ChevronDown,
  Palette,
  Tag,
  Layers,
  CircleDot,
} from 'lucide-react'
import { ScoreRing, scoreToLevelColor } from '@/components/compare/ScoreRing'
import type { CompareDecisionResponse } from '@/types/compareDecision'
import { WINNER_CONTEXT_LABELS } from '@/types/compareDecision'
import type { Product } from '@/types/product'
import { normalizeCompareProductId } from '@/store/compare'
import {
  displayNameForCompareProduct,
  humanizeProductIdInCopy,
  humanizeProductIdInCopyLines,
} from '@/lib/compare-decision/humanizeProductCopy'
import {
  getAttractionState,
  getConsequenceByProductId,
  getContextsWonByProduct,
  getIdentityAlignmentByProductId,
  getProductInsightById,
  getRegretFlashByProductId,
  normalizeScoreDisplay,
  productLetter,
} from '@/lib/compare-decision/selectors'

const CONFIDENCE_COPY: Record<CompareDecisionResponse['decisionConfidence']['level'], string> = {
  clear_choice: 'Clear choice',
  leaning_choice: 'Leaning',
  toss_up: 'Toss-up',
}

const MODE_COPY: Record<CompareDecisionResponse['comparisonMode'], string> = {
  direct_head_to_head: 'Head-to-head',
  scenario_compare: 'Scenario compare',
  outfit_compare: 'Outfit compare',
}

const PHOTO_LABEL_COPY: Record<
  CompareDecisionResponse['productInsights'][number]['photoRealityGap']['label'],
  string
> = {
  photo_stronger: 'Looks stronger on-screen',
  real_life_stronger: 'Stronger in real life',
  aligned: 'Photo matches reality',
}

const COMPLIMENT_COPY: Record<
  CompareDecisionResponse['productInsights'][number]['complimentPrediction']['type'],
  string
> = {
  direct_compliments: 'Direct compliments',
  subtle_admiration: 'Subtle admiration',
  polished_respect: 'Polished respect',
  stylish_attention: 'Stylish attention',
  low_reaction_high_utility: 'Quiet utility',
}

function BulletList({
  items,
  icon: Icon,
  tone,
  formatLine,
}: {
  items: string[]
  icon: typeof CheckCircle
  tone: 'violet' | 'amber' | 'neutral'
  /** Optional per-line transform (e.g. swap “Product 123” for the real title). */
  formatLine?: (line: string) => string
}) {
  if (!items.length) return null
  const iconCls =
    tone === 'violet' ? 'text-blue-600' : tone === 'amber' ? 'text-amber-500' : 'text-neutral-400'
  const lines = formatLine ? items.map(formatLine) : items
  return (
    <ul className="space-y-2">
      {lines.map((line, i) => (
        <li
          key={i}
          className="flex items-start gap-3 rounded-xl bg-neutral-50/90 px-3 py-2.5 text-sm text-neutral-700 ring-1 ring-neutral-200/50"
        >
          <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${iconCls}`} />
          <span className="leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  )
}

function InsightDetails({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-sky-100/90 bg-white shadow-md shadow-blue-600/5 overflow-hidden ring-1 ring-sky-50 open:ring-blue-100/40 transition-shadow"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 sm:px-5 bg-gradient-to-r from-sky-50/80 to-white hover:from-sky-50 transition-colors [&::-webkit-details-marker]:hidden">
        <span className="font-display text-sm font-bold text-neutral-900">{title}</span>
        <ChevronDown className="w-4 h-4 text-blue-800 shrink-0 transition-transform duration-300 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-sky-100/60">{children}</div>
    </details>
  )
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Sparkles
  title: string
  subtitle?: string
}) {
  return (
    <div className="mb-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600/12 to-blue-600/12 text-blue-800 ring-1 ring-inset ring-blue-100/50 shadow-sm">
          <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
        </span>
        <div className="min-w-0 pt-0.5">
          <h3 className="font-display text-xl font-bold tracking-tight text-neutral-900">{title}</h3>
          {subtitle ? <p className="text-sm text-neutral-500 mt-1 leading-relaxed">{subtitle}</p> : null}
        </div>
      </div>
    </div>
  )
}

function MetricBar({
  label,
  value,
  variant = 'sky',
}: {
  label: string
  value: number
  variant?: 'sky' | 'warm'
}) {
  const v = Math.max(0, Math.min(100, value))
  const fill =
    variant === 'warm'
      ? 'bg-gradient-to-r from-amber-900 via-amber-700 to-stone-400'
      : 'bg-gradient-to-r from-blue-600 via-blue-600 to-orange-500'
  return (
    <div>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <span className="text-[11px] font-medium text-neutral-500">{label}</span>
        <span className="text-[11px] font-bold tabular-nums text-neutral-800">{v}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100 overflow-hidden ring-1 ring-inset ring-neutral-200/40">
        <motion.div
          className={`h-full rounded-full ${fill}`}
          initial={{ width: 0 }}
          animate={{ width: `${v}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
        />
      </div>
    </div>
  )
}

function effectivePriceCents(p: Product | undefined): number {
  if (!p) return 0
  const sale = p.sales_price_cents
  if (sale != null && sale > 0) return sale
  return p.price_cents ?? 0
}

/** Rough swatch for common color names; fallback neutral. */
function swatchFromProductColor(color?: string | null): string {
  const raw = String(color ?? '').trim().toLowerCase()
  if (!raw) return '#d4d4d8'
  const map: Record<string, string> = {
    white: '#fafafa',
    black: '#171717',
    navy: '#1e3a5f',
    blue: '#3b82f6',
    'sky blue': '#7dd3fc',
    red: '#dc2626',
    green: '#16a34a',
    beige: '#d6c4a8',
    tan: '#c4a574',
    brown: '#78350f',
    grey: '#737373',
    gray: '#737373',
    pink: '#ec4899',
    purple: '#9333ea',
    yellow: '#eab308',
    orange: '#ea580c',
    cream: '#faf8f5',
    khaki: '#c3b091',
  }
  for (const [k, hex] of Object.entries(map)) {
    if (raw.includes(k)) return hex
  }
  return '#a8a29e'
}

function fabricHint(description?: string | null): string | null {
  if (!description) return null
  const d = description.toLowerCase()
  const m =
    d.match(/\b(\d{1,3}%?\s*(?:cotton|polyester|linen|wool|silk|viscose|elastane|spandex))\b/i) ||
    d.match(/\b(cotton|linen|wool|silk|denim|chiffon|satin|crepe|twill|jersey|fleece)\b/i)
  return m ? m[0].replace(/\s+/g, ' ') : null
}

function productSummaryRows(product: Product | undefined): {
  label: string
  value: string
  Icon: typeof Shirt
}[] {
  const desc = product?.description ?? ''
  const fabric = fabricHint(desc)
  const collar =
    /\b(spread|point|button[- ]?down|mandarin|crew|v[- ]?neck|polo)\s+collar\b|\bcollar\b/i.exec(desc)?.[0] ?? null
  const sleeve = /\b(long|short|three[- ]quarter|sleeveless)\s+sleeve\b|\bsleeve\b/i.exec(desc)?.[0] ?? null

  return [
    { label: 'Fit', value: product?.size?.trim() || '—', Icon: Tag },
    { label: 'Fabric', value: fabric || '—', Icon: Layers },
    { label: 'Color', value: product?.color?.trim() || '—', Icon: Palette },
    { label: 'Category', value: product?.category?.trim() || '—', Icon: CircleDot },
    { label: 'Collar', value: collar || '—', Icon: Shirt },
    { label: 'Sleeve', value: sleeve || '—', Icon: Shirt },
  ]
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function TensionAxisRow({
  axis,
  productIds,
  products,
}: {
  axis: CompareDecisionResponse['tensionAxes'][number]
  productIds: number[]
  products: Product[] | undefined
}) {
  const colors = [
    'bg-blue-600 shadow-blue-600/40',
    'bg-blue-600 shadow-blue-600/40',
    'bg-blue-600 shadow-blue-600/40',
    'bg-amber-500 shadow-amber-500/40',
    'bg-sky-500 shadow-sky-500/40',
  ]

  /** One marker per compared product, in tray order (A, B, …), even if the API omitted an id. */
  const merged = useMemo(() => {
    return productIds.map((id) => {
      const hit = axis.positions?.find((p) => normalizeCompareProductId(p.productId) === id)
      let v = hit?.value ?? 0.5
      if (typeof v !== 'number' || !Number.isFinite(v)) v = 0.5
      if (v > 1) v = v / 100
      return { productId: id, value: Math.max(0, Math.min(1, v)) }
    })
  }, [axis.positions, productIds])

  /** Nudge pixels when two scores map to nearly the same % so both labels stay readable. */
  const stackOffsetPx = useMemo(() => {
    const pcts = merged.map((p) => (p.value <= 1 ? p.value * 100 : p.value))
    return pcts.map((pct, i) => {
      let stack = 0
      for (let j = 0; j < i; j++) {
        if (Math.abs(pcts[j]! - pct) < 5) stack += 1
      }
      return stack * 18
    })
  }, [merged])

  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-gradient-to-b from-white to-neutral-50/80 p-5 shadow-md shadow-neutral-200/40 ring-1 ring-inset ring-white/60">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-800/90 mb-4">
        {axis.axis.replace(/_/g, ' ')}
      </p>
      <div className="flex justify-between text-xs font-medium text-neutral-600 mb-3 gap-4">
        <span className="text-left leading-snug text-blue-950/90">{axis.leftLabel}</span>
        <span className="text-right leading-snug text-blue-950/90">{axis.rightLabel}</span>
      </div>
      <div className="relative h-11 rounded-full bg-gradient-to-r from-sky-100 via-neutral-100 to-sky-100 border border-neutral-200/60 overflow-visible shadow-inner">
        <div className="absolute inset-y-2 left-3 right-3 rounded-full bg-white/60" aria-hidden />
        {merged.map((p, i) => {
          const pidN = normalizeCompareProductId(p.productId)
          if (pidN == null) return null
          const pct = Math.max(0, Math.min(100, p.value <= 1 ? p.value * 100 : p.value))
          const color = colors[i % colors.length]
          const letter = productLetter(productIds, pidN)
          const ox = stackOffsetPx[i] ?? 0
          const z = 10 + Math.round(ox / 18)
          return (
            <div
              key={`${axis.axis}-${pidN}-${i}`}
              className="absolute top-1/2 flex flex-col items-center group"
              style={{
                left: `${pct}%`,
                transform: `translate(calc(-50% + ${ox}px), -50%)`,
                zIndex: z,
              }}
              title={`${letter} — ${displayNameForCompareProduct(products, pidN, letter)} · ${Math.round(pct)}`}
            >
              <span
                className={`w-4 h-4 rounded-full ${color} ring-[3px] ring-white shadow-lg transition-transform group-hover:scale-110`}
              />
              <span className="mt-1.5 text-[10px] font-bold tabular-nums text-neutral-700 bg-white/95 px-1.5 py-0.5 rounded-md border border-neutral-200/80 shadow-sm">
                {letter}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SummaryCompareCard({
  productId,
  ids,
  products,
  result,
  idx,
}: {
  productId: number
  ids: number[]
  products: Product[] | undefined
  result: CompareDecisionResponse
  idx: number
}) {
  const product = products?.find((p) => p.id === productId)
  const contexts = getContextsWonByProduct(result, productId)
  const letter = productLetter(ids, productId)
  const title =
    product?.title?.trim() || displayNameForCompareProduct(products, productId, `Product #${productId}`)
  const img = product?.image_cdn || product?.image_url || 'https://placehold.co/600x800/f5f5f5/a3a3a3?text=No+image'
  const rows = productSummaryRows(product)
  const swatch = swatchFromProductColor(product?.color)
  const price = effectivePriceCents(product)

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + idx * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`relative flex-1 min-w-0 max-w-xl mx-auto w-full rounded-2xl border bg-white shadow-lg shadow-neutral-200/50 overflow-hidden ${
        contexts.includes('overall')
          ? 'border-blue-300 ring-2 ring-blue-100/80'
          : 'border-neutral-200/90'
      }`}
    >
      <Link href={`/products/${productId}`} className="block relative aspect-[3/4] bg-neutral-100 group">
        <Image
          src={img}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(min-width: 1024px) 400px, 90vw"
          priority={idx < 2}
        />
        <span className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-sm font-bold text-blue-900 shadow-md ring-1 ring-neutral-200/80">
          {letter}
        </span>
        {contexts.includes('overall') ? (
          <span className="absolute top-4 right-4 rounded-full bg-gradient-to-r from-neutral-800 to-neutral-900 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-lg">
            Top overall
          </span>
        ) : null}
      </Link>

      <div className="px-4 py-3 sm:px-5 bg-neutral-100/90 border-y border-neutral-200/60">
        <div className="flex items-center gap-3">
          <span
            className="h-10 w-10 shrink-0 rounded-full border border-neutral-200 shadow-inner ring-2 ring-white"
            style={{ backgroundColor: swatch }}
            title={product?.color ?? 'Color'}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-900 leading-snug line-clamp-2">{title}</p>
            {product?.brand ? (
              <p className="text-[11px] font-semibold text-neutral-500 mt-0.5 truncate">{product.brand}</p>
            ) : null}
          </div>
          <p className="text-lg font-bold tabular-nums text-neutral-900 shrink-0">{formatUsd(price)}</p>
        </div>
      </div>

      <dl className="px-4 py-4 sm:px-5 space-y-2.5">
        {rows.map(({ label, value, Icon }) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <Icon className="w-4 h-4 shrink-0 text-neutral-400" aria-hidden />
            <dt className="text-neutral-500 w-24 shrink-0">{label}</dt>
            <dd className="text-neutral-900 font-medium text-right flex-1 truncate" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </motion.article>
  )
}

function CompareResultsLeadingSections({
  ids,
  products,
  result,
  fmt,
}: {
  ids: number[]
  products: Product[] | undefined
  result: CompareDecisionResponse
  fmt: (s: string) => string
}) {
  const confScore = normalizeScoreDisplay(result.decisionConfidence.score)
  const confColor = scoreToLevelColor(confScore)
  const pairVs = ids.length === 2

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-sky-100/90 bg-gradient-to-b from-white via-neutral-50/30 to-white shadow-xl shadow-blue-600/10 overflow-hidden ring-1 ring-sky-100/50"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-6 py-4 border-b border-sky-100/60 bg-white/80 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2">
          <motion.span
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-800 to-blue-600 text-white text-[11px] font-bold uppercase tracking-wide shadow-md"
          >
            <GitCompare className="w-3.5 h-3.5 opacity-95" />
            {MODE_COPY[result.comparisonMode]}
          </motion.span>
          {result.requestedGoal ? (
            <span className="text-[11px] font-semibold rounded-lg border border-blue-100 bg-white px-2.5 py-1 text-neutral-700">
              Goal: <span className="text-blue-900">{result.requestedGoal.replace(/_/g, ' ')}</span>
            </span>
          ) : null}
          {result.requestedOccasion ? (
            <span className="text-[11px] font-semibold rounded-lg border border-blue-100 bg-white px-2.5 py-1 text-neutral-700">
              Occasion: <span className="text-blue-900">{result.requestedOccasion}</span>
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800/80">
              {CONFIDENCE_COPY[result.decisionConfidence.level]}
            </p>
            <p className="text-xs text-neutral-500 truncate max-w-[14rem]">{fmt(result.comparisonContext.modeReason)}</p>
          </div>
          <ScoreRing score={confScore} color={confColor} size={76} label="Match" />
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-6 pb-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-400 mb-4">
          Results · summary
        </p>
        <div
          className={
            pairVs
              ? 'relative flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-10 lg:justify-center'
              : 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8'
          }
        >
          {pairVs ? (
            <>
              <div
                className="pointer-events-none absolute left-1/2 top-[min(28%,12rem)] z-10 hidden lg:flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs font-black uppercase tracking-wider text-neutral-700 shadow-lg"
                aria-hidden
              >
                VS
              </div>
              <SummaryCompareCard
                productId={ids[0]!}
                ids={ids}
                products={products}
                result={result}
                idx={0}
              />
              <div className="flex shrink-0 justify-center py-1 lg:hidden">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-neutral-200 bg-white text-[10px] font-black uppercase tracking-wider text-neutral-700 shadow-md">
                  VS
                </span>
              </div>
              <SummaryCompareCard
                productId={ids[1]!}
                ids={ids}
                products={products}
                result={result}
                idx={1}
              />
            </>
          ) : (
            ids.map((productId, idx) => (
              <SummaryCompareCard
                key={productId}
                productId={productId}
                ids={ids}
                products={products}
                result={result}
                idx={idx}
              />
            ))
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="border-t border-sky-100/80 bg-gradient-to-r from-sky-50/90 via-white to-sky-50/60 px-4 sm:px-6 py-4"
      >
        <p className="text-[11px] font-bold uppercase tracking-wider text-blue-800 mb-2">Why this comparison helps</p>
        <p className="text-sm text-neutral-700 leading-relaxed max-w-4xl">{fmt(result.comparisonContext.modeReason)}</p>
        {result.decisionConfidence.explanation?.length ? (
          <ul className="mt-3 flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {result.decisionConfidence.explanation.slice(0, 4).map((line, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="inline-flex items-start gap-2 rounded-xl bg-white/90 border border-sky-100 px-3 py-2 text-xs text-neutral-700 shadow-sm flex-1 sm:flex-none sm:min-w-[200px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>{fmt(line)}</span>
              </motion.li>
            ))}
          </ul>
        ) : null}
      </motion.div>
    </motion.section>
  )
}

function PerProductScoreBreakdownCard({
  productId,
  ids,
  products,
  result,
  idx,
  fmt,
}: {
  productId: number
  ids: number[]
  products: Product[] | undefined
  result: CompareDecisionResponse
  idx: number
  fmt: (s: string) => string
}) {
  const insight = getProductInsightById(result, productId)
  const product = products?.find((p) => p.id === productId)
  const consequence = getConsequenceByProductId(result, productId)
  const regret = getRegretFlashByProductId(result, productId)
  const identity = getIdentityAlignmentByProductId(result, productId)
  const contexts = getContextsWonByProduct(result, productId)
  const letter = productLetter(ids, productId)
  const overall = insight ? normalizeScoreDisplay(insight.scores?.overall) : 0
  const ringColor = scoreToLevelColor(overall)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + idx * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`relative w-full rounded-3xl border bg-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${
        contexts.includes('overall')
          ? 'border-stone-300 shadow-xl shadow-neutral-300/25 ring-2 ring-amber-100/80'
          : 'border-neutral-200/70 shadow-md shadow-neutral-200/40 hover:shadow-lg hover:border-stone-200'
      }`}
    >
      {contexts.length > 0 && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-800 via-amber-600 to-stone-400" />
      )}
      {contexts.includes('overall') && (
        <div className="absolute top-3 right-3 z-10 rounded-lg bg-gradient-to-r from-neutral-800 to-neutral-950 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white shadow-lg">
          Top overall
        </div>
      )}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {product && (
            <Link href={`/products/${product.id}`} className="block flex-shrink-0 group/img">
              <div className="relative w-[4.5rem] h-28 sm:w-24 sm:h-32 rounded-2xl overflow-hidden bg-neutral-100 ring-2 ring-white shadow-md ring-offset-2 ring-offset-neutral-50 group-hover/img:ring-amber-100 transition-all">
                <Image
                  src={product.image_cdn || product.image_url || 'https://placehold.co/96x128'}
                  alt={product.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover/img:scale-105"
                />
              </div>
            </Link>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-800 to-neutral-900 text-sm font-bold text-white shadow-sm">
                {letter}
              </span>
              {contexts.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-950 ring-1 ring-amber-200/70"
                >
                  {WINNER_CONTEXT_LABELS[c]}
                </span>
              ))}
            </div>
            <p className="font-display font-bold text-neutral-900 text-sm sm:text-base line-clamp-2 leading-snug">
              {product?.title?.trim() ||
                displayNameForCompareProduct(products, productId, `Product #${productId}`)}
            </p>
            <p className="text-xs font-medium text-neutral-600 mt-1">{product?.brand ?? ''}</p>
          </div>
          {insight && <ScoreRing score={overall} color={ringColor} size={88} label="Overall" />}
        </div>

        {insight && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              <MetricBar label="Value" value={normalizeScoreDisplay(insight.scores.value)} variant="warm" />
              <MetricBar label="Quality" value={normalizeScoreDisplay(insight.scores.quality)} variant="warm" />
              <MetricBar label="Style" value={normalizeScoreDisplay(insight.scores.style)} variant="warm" />
              <MetricBar label="Risk" value={normalizeScoreDisplay(insight.scores.risk)} variant="warm" />
              <MetricBar label="Practical" value={normalizeScoreDisplay(insight.scores.practical)} variant="warm" />
              <MetricBar label="Expressive" value={normalizeScoreDisplay(insight.scores.expressive)} variant="warm" />
            </div>

            <div className="mt-5 space-y-3 text-sm border-t border-neutral-100 pt-5">
              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Friction</p>
              <p className="text-neutral-800">
                Index {insight.frictionIndex}{' '}
                {insight.frictionExplanation?.length > 0 && (
                  <span className="text-neutral-600">— {fmt(insight.frictionExplanation[0])}</span>
                )}
              </p>

              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Compliments</p>
              <p className="text-neutral-800">
                {COMPLIMENT_COPY[insight.complimentPrediction.type]} (
                {normalizeScoreDisplay(insight.complimentPrediction.score)})
              </p>
              {insight.complimentPrediction.explanation?.length > 0 && (
                <BulletList
                  items={insight.complimentPrediction.explanation.slice(0, 3)}
                  icon={Sparkles}
                  tone="violet"
                  formatLine={fmt}
                />
              )}

              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Wear rate</p>
              <p className="text-neutral-800">
                ~{insight.wearFrequency.estimatedMonthlyWear}/mo (conf.{' '}
                {normalizeScoreDisplay(insight.wearFrequency.confidence)})
              </p>

              <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">Photo vs real</p>
              <p className="text-neutral-800">{PHOTO_LABEL_COPY[insight.photoRealityGap.label]}</p>
              {insight.photoRealityGap.explanation?.length > 0 && (
                <BulletList
                  items={insight.photoRealityGap.explanation.slice(0, 2)}
                  icon={CheckCircle}
                  tone="neutral"
                  formatLine={fmt}
                />
              )}

              {insight.hiddenFlaw && (
                <>
                  <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Hidden flaw</p>
                  <p className="text-neutral-800">{fmt(insight.hiddenFlaw)}</p>
                </>
              )}
              {insight.microStory && (
                <>
                  <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Micro-story</p>
                  <p className="text-neutral-700 italic">{fmt(insight.microStory)}</p>
                </>
              )}
            </div>
          </>
        )}

        {consequence != null && (consequence.ifYouChooseThis?.length ?? 0) > 0 && (
          <div className="mt-4">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">If you choose this</p>
            <BulletList
              items={consequence.ifYouChooseThis ?? []}
              icon={CheckCircle}
              tone="violet"
              formatLine={fmt}
            />
          </div>
        )}

        {regret && (
          <div className="mt-4 rounded-xl bg-neutral-50 border border-neutral-200/80 p-3 text-sm">
            <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Regret flash</p>
            <p className="text-neutral-800 font-medium">{fmt(regret.shortTermFeeling)}</p>
            <p className="text-neutral-600 mt-1">{fmt(regret.longTermReality)}</p>
          </div>
        )}

        {identity && (
          <div className="mt-4 text-sm">
            <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Identity alignment</p>
            <p className="text-neutral-700">
              Current self {normalizeScoreDisplay(identity.currentSelfScore)} · Aspirational{' '}
              {normalizeScoreDisplay(identity.aspirationalSelfScore)}
            </p>
            {identity.explanation?.length > 0 && (
              <div className="mt-2">
                <BulletList items={identity.explanation} icon={CheckCircle} tone="neutral" formatLine={fmt} />
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function CompareDecisionResults({
  result,
  products,
}: {
  result: CompareDecisionResponse
  products: Product[] | undefined
}) {
  const ids = useMemo(() => {
    const raw = result.comparisonContext.productIds ?? []
    const out: number[] = []
    for (const x of raw) {
      const n = normalizeCompareProductId(x)
      if (n != null) out.push(n)
    }
    return out
  }, [result.comparisonContext.productIds])
  const attraction = getAttractionState(result)
  const fmt = (s: string) => humanizeProductIdInCopy(s, products)
  const fmtLines = (lines: string[]) => humanizeProductIdInCopyLines(lines, products)

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-6"
    >
      <CompareResultsLeadingSections ids={ids} products={products} result={result} fmt={fmt} />

      {/* Data quality */}
      {result.comparisonContext.dataQuality && (
        <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50/40 px-5 py-4 shadow-md shadow-amber-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="font-display font-bold text-amber-950">
              Data quality · {normalizeScoreDisplay(result.comparisonContext.dataQuality.overallScore)}
            </span>
          </div>
          {result.comparisonContext.dataQuality.notes?.length > 0 && (
            <BulletList
              items={result.comparisonContext.dataQuality.notes}
              icon={AlertTriangle}
              tone="amber"
              formatLine={fmt}
            />
          )}
        </div>
      )}

      {/* Winners by context */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="rounded-2xl border border-sky-100/90 bg-white p-4 sm:p-5 shadow-md shadow-blue-600/5 ring-1 ring-sky-50"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-blue-900">
            <GitCompare className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-display font-bold text-base text-neutral-900 leading-tight">Who wins where</h3>
            <p className="text-xs text-neutral-500">Swipe sideways · tap a card to open the product</p>
          </div>
        </div>
        <div className="flex flex-row gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin -mx-1 px-1">
          {(Object.keys(WINNER_CONTEXT_LABELS) as Array<keyof typeof WINNER_CONTEXT_LABELS>).map((key, wi) => {
            const pidRaw = result.winnersByContext[key]
            const pid = normalizeCompareProductId(pidRaw)
            if (pid == null) return null
            const label = WINNER_CONTEXT_LABELS[key]
            const letter = productLetter(ids, pid)
            const row =
              products?.find((p) => normalizeCompareProductId(p.id) === pid) ??
              products?.find((p) => p.id === pid)
            const title =
              row?.title?.trim() ||
              (row as { name?: string } | undefined)?.name?.trim() ||
              `Product #${pid}`
            const imgSrc =
              row?.image_cdn || row?.image_url || 'https://placehold.co/96x128/f5f5f5/a3a3a3?text=No+image'
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + wi * 0.04 }}
                className="snap-start shrink-0 w-[min(72vw,260px)] group rounded-2xl border border-neutral-200/80 bg-gradient-to-br from-white to-sky-50/30 p-3 shadow-sm transition-all hover:border-blue-200 hover:shadow-lg hover:shadow-blue-600/10"
              >
                <Link href={`/products/${pid}`} className="flex gap-3">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200/60">
                    <Image
                      src={imgSrc}
                      alt={title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="56px"
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">{label}</p>
                    <div className="mt-1 flex items-start gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-800 to-blue-600 text-xs font-bold text-white shadow-sm">
                        {letter}
                      </span>
                      <p className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug min-w-0">{title}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Per-product AI breakdown — below summary */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.45 }}
        className="rounded-2xl border border-neutral-200/80 bg-neutral-50/40 p-5 sm:p-6 shadow-md shadow-neutral-200/30 ring-1 ring-white/80"
      >
        <SectionHeader
          icon={Layers}
          title="Per-product breakdown"
          subtitle="Scores for each item. Winners show a ribbon."
        />
        <div
          className={`grid gap-6 items-start ${ids.length > 2 ? 'lg:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-2'} lg:gap-8`}
        >
          {ids.map((productId, idx) => (
            <PerProductScoreBreakdownCard
              key={productId}
              productId={productId}
              ids={ids}
              products={products}
              result={result}
              idx={idx}
              fmt={fmt}
            />
          ))}
        </div>
      </motion.section>

      <InsightDetails title="More angles — visuals, vibe & scenarios">
      {attraction &&
        (attraction.explanation.length > 0 ||
          attraction.scores.length > 0 ||
          attraction.firstAttractionProductId != null) && (
        <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 sm:p-8 shadow-lg shadow-neutral-200/20">
          <SectionHeader
            icon={Eye}
            title="What caught your eye"
            subtitle="Visual pull for each option, plus the item you marked as your first pick (if any)."
          />
          {attraction.firstAttractionProductId != null && (
            <p className="text-sm text-neutral-700 mb-3">
              <span className="font-medium text-neutral-800">Your first pick:</span>{' '}
              <span className="font-mono font-bold text-blue-900">
                {productLetter(ids, attraction.firstAttractionProductId)}
              </span>
              <span className="text-neutral-600">
                {' '}
                —{' '}
                {displayNameForCompareProduct(
                  products,
                  attraction.firstAttractionProductId,
                  `Product ${attraction.firstAttractionProductId}`,
                )}
              </span>
            </p>
          )}
          {attraction.scores.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {attraction.scores.map((s) => {
                const letter = productLetter(ids, s.productId)
                return (
                  <span key={s.productId} className="text-sm text-neutral-700 max-w-[min(100%,22rem)]">
                    <span className="font-mono font-bold text-blue-900">{letter}</span>
                    <span className="text-neutral-500"> — </span>
                    <span className="text-neutral-800">
                      {displayNameForCompareProduct(products, s.productId, letter)}
                    </span>
                    <span className="text-neutral-500"> · </span>
                    {Math.round(s.score <= 1 ? s.score * 100 : s.score)}
                  </span>
                )
              })}
            </div>
          )}
          {attraction.explanation.length > 0 && (
            <BulletList items={attraction.explanation} icon={CheckCircle} tone="violet" formatLine={fmt} />
          )}
        </div>
      )}

      {/* Visual differences */}
      {result.stepInsights.visualDifferences?.length > 0 && (
        <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 sm:p-8 shadow-lg shadow-neutral-200/20">
          <SectionHeader icon={Sparkles} title="Visual differences" subtitle="What changes most when you look at these side by side." />
          <BulletList
            items={result.stepInsights.visualDifferences}
            icon={CheckCircle}
            tone="neutral"
            formatLine={fmt}
          />
        </div>
      )}

      {/* Tension axes */}
      {result.tensionAxes?.length > 0 && (
        <div className="space-y-5">
          <SectionHeader icon={Split} title="Tension axes" subtitle="Where each option sits between two style poles." />
          <div className="grid md:grid-cols-2 gap-4">
            {result.tensionAxes.map((axis) => (
              <TensionAxisRow key={axis.axis} axis={axis} productIds={ids} products={products} />
            ))}
          </div>
        </div>
      )}

      {/* Why not both */}
      {result.whyNotBoth?.enabled && (
        <div className="rounded-3xl border border-blue-100/70 bg-gradient-to-br from-sky-50/90 via-white to-sky-50/50 p-6 sm:p-8 shadow-lg shadow-blue-600/10">
          <SectionHeader icon={Split} title="Why not both?" subtitle="Sometimes the best move is a split role — not a single winner." />
          {result.whyNotBoth.explanation?.length > 0 && (
            <BulletList
              items={result.whyNotBoth.explanation}
              icon={Sparkles}
              tone="violet"
              formatLine={fmt}
            />
          )}
          {result.whyNotBoth.productRoles?.length > 0 && (
            <ul className="mt-4 space-y-2">
              {result.whyNotBoth.productRoles.map((pr) => (
                <li key={pr.productId} className="text-sm text-neutral-800">
                  <span className="font-mono font-bold text-blue-900">{productLetter(ids, pr.productId)}</span>
                  <span className="text-neutral-500"> — </span>
                  <span className="text-neutral-700">
                    {displayNameForCompareProduct(products, pr.productId, productLetter(ids, pr.productId))}
                  </span>
                  <span className="text-neutral-500"> — </span>
                  {pr.role}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Outfit impact */}
      {result.outfitImpact?.enabled && (
        <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 sm:p-8 shadow-lg shadow-neutral-200/20">
          <SectionHeader icon={Shirt} title="Outfit impact" subtitle="Versatility and how well each piece fills wardrobe gaps." />
          {result.outfitImpact.explanation?.length > 0 && (
            <BulletList
              items={result.outfitImpact.explanation}
              icon={CheckCircle}
              tone="violet"
              formatLine={fmt}
            />
          )}
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500 mb-2">Versatility</p>
              <ul className="text-sm space-y-1">
                {result.outfitImpact.versatilityScores?.map((v) => (
                  <li key={v.productId}>
                    <span className="font-mono font-semibold text-blue-900">{productLetter(ids, v.productId)}</span>
                    <span className="text-neutral-500">: </span>
                    {displayNameForCompareProduct(products, v.productId, productLetter(ids, v.productId))} —{' '}
                    {normalizeScoreDisplay(v.score)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-neutral-500 mb-2">Wardrobe gap fill</p>
              <ul className="text-sm space-y-1">
                {result.outfitImpact.wardrobeGapFillScores?.map((v) => (
                  <li key={v.productId}>
                    <span className="font-mono font-semibold text-blue-900">{productLetter(ids, v.productId)}</span>
                    <span className="text-neutral-500">: </span>
                    {displayNameForCompareProduct(products, v.productId, productLetter(ids, v.productId))} —{' '}
                    {normalizeScoreDisplay(v.score)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Social mirror */}
      {result.socialMirror?.enabled && result.socialMirror.explanation?.length > 0 && (
        <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 sm:p-8 shadow-lg shadow-neutral-200/20">
          <SectionHeader icon={Users} title="Social mirror" subtitle="How others might read each choice." />
          <ul className="space-y-2">
            {result.socialMirror.explanation.map((row) => (
              <li key={row.productId} className="text-sm text-neutral-700">
                <span className="font-mono font-bold text-blue-900">{productLetter(ids, row.productId)}</span>
                <span className="text-neutral-500"> — </span>
                <span className="font-medium text-neutral-800">
                  {displayNameForCompareProduct(products, row.productId, productLetter(ids, row.productId))}
                </span>
                : {fmt(row.message)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* People like you */}
      {result.peopleLikeYou?.enabled && (
        <div className="rounded-3xl border border-neutral-200/60 bg-white p-6 sm:p-8 shadow-lg shadow-neutral-200/20">
          <SectionHeader icon={Sparkles} title="People like you" subtitle="Patterns from similar shoppers." />
          {(result.peopleLikeYou.explanation?.length ?? 0) > 0 && (
            <BulletList
              items={result.peopleLikeYou.explanation ?? []}
              icon={CheckCircle}
              tone="neutral"
              formatLine={fmt}
            />
          )}
          {(result.peopleLikeYou.notes?.length ?? 0) > 0 && (
            <div className="mt-3 text-xs text-neutral-500 space-y-1">
              {fmtLines(result.peopleLikeYou.notes ?? []).map((n, i) => (
                <p key={i}>{n}</p>
              ))}
            </div>
          )}
        </div>
      )}

      </InsightDetails>
    </motion.div>
  )
}
