'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Heart, GitCompare, Check, Shirt } from 'lucide-react'
import type { Product } from '@/types/product'

interface ProductCardProps {
  product: Product
  index?: number
  /** Lighter motion for dense grids (e.g. Discover) so results feel snappier */
  snappyMotion?: boolean
  /** When set, product link includes `?from=` so the detail page can return to Discover with the same query. */
  fromReturnPath?: string
  onFavorite?: (productId: number) => void
  isFavorite?: boolean
  onAddToCompare?: (productId: number) => void
  inCompare?: boolean
  /** Add catalog product to wardrobe (shop). */
  onAddToWardrobe?: (product: Product) => void
  wardrobeStatus?: 'idle' | 'loading' | 'added'
  variantPrice?: { minPriceCents: number; maxPriceCents: number }
}

function toCents(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') { const n = parseInt(v, 10); if (Number.isFinite(n)) return n }
  return 0
}

function formatPrice(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function useDirectRemoteImage(url: string): boolean {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  if (url.includes('placehold.co')) return false
  return true
}

export function ProductCard({
  product,
  index = 0,
  snappyMotion = false,
  fromReturnPath,
  onFavorite,
  isFavorite,
  onAddToCompare,
  inCompare,
  onAddToWardrobe,
  wardrobeStatus = 'idle',
  variantPrice,
}: ProductCardProps) {
  const imgUrl = product.image_cdn || product.image_url || '/placeholder-product.jpg'
  const imageUnoptimized = useDirectRemoteImage(imgUrl)
  const productHref =
    fromReturnPath && fromReturnPath.startsWith('/search')
      ? `/products/${product.id}?from=${encodeURIComponent(fromReturnPath)}`
      : `/products/${product.id}`
  const priceCents = toCents(product.price_cents)
  const saleCents = toCents(product.sales_price_cents)
  const hasSale = saleCents > 0 && saleCents < priceCents
  const showMinMax = variantPrice && variantPrice.minPriceCents !== variantPrice.maxPriceCents
  const hasCompare = Boolean(onAddToCompare)
  const hasWardrobe = Boolean(onAddToWardrobe)
  const showActionBar = hasCompare || hasWardrobe
  const wardrobePinned = wardrobeStatus === 'added' || wardrobeStatus === 'loading'

  const capped = Math.min(index, 10)
  const delay = snappyMotion ? capped * 0.012 : index * 0.04
  const duration = snappyMotion ? 0.22 : 0.4

  return (
    <motion.article
      initial={{ opacity: 0, y: snappyMotion ? 8 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-24px' }}
      transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={snappyMotion ? { y: -3 } : { y: -6 }}
      className="group"
    >
      <Link
        href={productHref}
        className="block"
        prefetch={fromReturnPath ? false : undefined}
      >
        <div className="relative aspect-square overflow-hidden rounded-[22px] bg-gradient-to-b from-white to-slate-50 ring-1 ring-[#d8cbc4] shadow-[0_12px_30px_-20px_rgba(90,24,20,0.2)] transition-all duration-300 group-hover:ring-[#b99e90] group-hover:shadow-[0_22px_45px_-20px_rgba(90,24,20,0.3)]">
          <Image
            src={imgUrl}
            alt={product.title}
            fill
            unoptimized={imageUnoptimized}
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/600x600/e5eeff/0a0a0a?text=TrendZone'
            }}
          />
          {hasSale && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#5a1814] to-[#99624E] text-white text-[11px] font-bold uppercase tracking-wide shadow-md">
              Sale
            </span>
          )}

          {/* Favorite button — top right */}
          {onFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault()
                onFavorite(product.id)
              }}
              className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#100809] shadow-md transition-all hover:scale-105 hover:bg-[#efe4de]"
              aria-label="Add to favorites"
            >
              <Heart
                className={`w-4 h-4 ${isFavorite ? 'fill-[#0a0a0a] text-[#0a0a0a]' : 'text-[#0a0a0a]'}`}
              />
            </button>
          )}

          {/* Compare / Wardrobe — pinned when active or on touch devices,
              else reveal on hover so desktop cards stay clean. */}
          {showActionBar && (
            <div
              className={`absolute bottom-0 inset-x-0 flex transition-transform duration-300 ease-out ${
                inCompare || wardrobePinned
                  ? 'translate-y-0'
                  : 'translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0'
              }`}
            >
              {hasWardrobe && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    if (wardrobeStatus === 'loading' || wardrobeStatus === 'added') return
                    onAddToWardrobe!(product)
                  }}
                  disabled={wardrobeStatus === 'loading' || wardrobeStatus === 'added'}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px] sm:text-xs font-bold uppercase tracking-wide backdrop-blur-md transition-colors border-r border-white/30
                    ${wardrobeStatus === 'added'
                      ? 'bg-gradient-to-r from-[#5a1814] to-[#99624E] text-white'
                      : wardrobeStatus === 'loading'
                        ? 'bg-slate-900/85 text-white'
                        : 'bg-white/90 text-[#100809] hover:bg-[#efe4de]'
                    }
                    disabled:opacity-90`}
                >
                  {wardrobeStatus === 'loading' ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : wardrobeStatus === 'added' ? (
                    <>
                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      In wardrobe
                    </>
                  ) : (
                    <>
                      <Shirt className="w-3.5 h-3.5" />
                      Wardrobe
                    </>
                  )}
                </button>
              )}
              {hasCompare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    onAddToCompare!(product.id)
                  }}
                  className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase tracking-wide backdrop-blur-md transition-colors
                    ${inCompare
                      ? 'bg-gradient-to-r from-[#5a1814] to-[#99624E] text-white'
                      : 'bg-white/90 text-[#100809] hover:bg-[#efe4de]'
                    }`}
                >
                  {inCompare ? (
                    <motion.span
                      key="added"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="flex items-center gap-1.5"
                    >
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white/25">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                      Added
                    </motion.span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <GitCompare className="w-3.5 h-3.5" />
                      Compare
                    </span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="mt-3 px-0.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#100809] line-clamp-1">
              {product.title}
            </p>
            <div className="shrink-0 text-right">
              {showMinMax ? (
                <span className="font-extrabold text-sm text-[#100809]">
                  {formatPrice(variantPrice!.minPriceCents, product.currency)}
                </span>
              ) : hasSale ? (
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-[#100809]">
                    {formatPrice(saleCents, product.currency)}
                  </span>
                  <span className="text-xs text-[#161616]/40 line-through">
                    {formatPrice(priceCents, product.currency)}
                  </span>
                </div>
              ) : priceCents > 0 ? (
                <span className="font-extrabold text-sm text-[#100809]">
                  {formatPrice(priceCents, product.currency)}
                </span>
              ) : (
                <span className="text-xs text-[#161616]/50 italic">—</span>
              )}
            </div>
          </div>
          {(product.brand || product.category) && (
            <p className="mt-1 text-[12px] text-[#161616]/65 line-clamp-2">
              {product.brand ? <span className="font-medium">{product.brand}</span> : null}
              {product.brand && product.category ? ' · ' : ''}
              {product.category}
            </p>
          )}
        </div>
      </Link>
    </motion.article>
  )
}
