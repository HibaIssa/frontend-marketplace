'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight, Heart, ShoppingBag, Search, Shirt, Layers, Sparkles,
  Brain, Eye, Wand2, GitCompare,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type { Product } from '@/types/product'
import { Reveal } from '@/components/motion/Reveal'

/* ─────────────────────────────────────────────────────────────────────────────
   Hooks / helpers
   ────────────────────────────────────────────────────────────────────────── */

function useProducts(limit = 8, offset = 0) {
  return useQuery({
    queryKey: ['home-products', limit, offset],
    queryFn: async () => {
      const page = Math.floor(offset / limit) + 1
      const res = await api.get<Product[]>(endpoints.products.list, { limit, page })
      const arr = Array.isArray(res?.data) ? (res.data as Product[]) : []
      const seen = new Set<number>()
      return arr.filter((p) => {
        if (p?.id == null || seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
    },
    staleTime: 5 * 60_000,
  })
}

type FacetBucket = { value?: string; count?: number; key?: string; doc_count?: number }
type FacetsResponse = {
  brands?: FacetBucket[]
  categories?: FacetBucket[]
  colors?: FacetBucket[]
  materials?: FacetBucket[]
  styles?: FacetBucket[]
  genders?: FacetBucket[]
  patterns?: FacetBucket[]
  fits?: FacetBucket[]
}

/** Backend caps facet aggregations at these sizes — used to display a "+" suffix when truncated. */
const FACET_CAP = { brands: 100, categories: 50, styles: 30 } as const

function useCatalogStats() {
  return useQuery({
    queryKey: ['home-stats'],
    queryFn: async () => {
      const [facetsRes, salesRes] = await Promise.allSettled([
        api.get<FacetsResponse>(endpoints.products.facets),
        api.get<Product[]>(endpoints.products.sales, { limit: 1, page: 1 }),
      ])

      const facets =
        facetsRes.status === 'fulfilled' ? facetsRes.value?.data : undefined
      const sales = salesRes.status === 'fulfilled' ? salesRes.value : undefined

      const sumBuckets = (b?: FacetBucket[]) =>
        Array.isArray(b)
          ? b.reduce((s, x) => s + (Number(x.count ?? x.doc_count ?? 0) || 0), 0)
          : 0

      // Each product appears in exactly one category bucket. Categories has only
      // ~10–20 distinct values in a fashion catalog so its size:50 cap rarely
      // truncates — that makes the category sum the most reliable total.
      const totalFromCategories = sumBuckets(facets?.categories)
      const totalFromBrands = sumBuckets(facets?.brands)
      const totalProducts = Math.max(totalFromCategories, totalFromBrands)

      const brandsLen = Array.isArray(facets?.brands) ? facets!.brands!.length : 0
      const categoriesLen = Array.isArray(facets?.categories) ? facets!.categories!.length : 0
      const stylesLen = Array.isArray(facets?.styles) ? facets!.styles!.length : 0

      const onSaleTotal =
        Number(sales?.pagination?.total ?? sales?.meta?.total ?? 0) || 0

      return {
        ok: facetsRes.status === 'fulfilled' || salesRes.status === 'fulfilled',
        totalProducts,
        brandsCount: brandsLen,
        brandsCapped: brandsLen >= FACET_CAP.brands,
        categoriesCount: categoriesLen,
        categoriesCapped: categoriesLen >= FACET_CAP.categories,
        stylesCount: stylesLen,
        onSaleTotal,
      }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

function formatPrice(p: Product) {
  const raw =
    typeof p.price_cents === 'string' ? parseInt(p.price_cents, 10) : p.price_cents
  const pc = Number.isFinite(raw as number) ? (raw as number) : 0
  if (pc <= 0) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: p.currency || 'USD',
    minimumFractionDigits: 2,
  }).format(pc / 100)
}

function CountUp({ to, suffix = '', durationMs = 1400 }: { to: number; suffix?: string; durationMs?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - k, 3)
      setVal(Math.round(to * eased))
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, durationMs])
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

/* ─────────────────────────────────────────────────────────────────────────────
   Hero — pastel split cards (sky / blush) + tool chips
   ────────────────────────────────────────────────────────────────────────── */

function Hero() {
  const easeOut = [0.22, 1, 0.36, 1] as const

  return (
    <section className="px-3 sm:px-5 lg:px-8 pt-4 pb-8 lg:pt-5">
      <div className="tz-sheet relative isolate p-5 sm:p-8 lg:p-10">
        <motion.div aria-hidden className="pointer-events-none absolute -top-16 -left-16 h-44 w-44 rounded-full bg-[#cfc8c2]/40 blur-3xl" animate={{ x: [0, 18, 0], y: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
        <motion.div aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-52 w-52 rounded-full bg-[#ddd8d3]/45 blur-3xl" animate={{ x: [0, -16, 0], y: [0, 12, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 lg:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
          >
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[#0a0a0a]">TrendZone</p>
            <h1 className="mt-1 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#0a0a0a] leading-tight">
              MARCELLE
            </h1>
            <p className="mt-2 max-w-lg text-sm text-[#0a0a0a]/65 leading-relaxed">
              Editorial fashion discovery with modern tailoring, timeless cuts, and AI-powered styling tools.
            </p>
          </motion.div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0a0a0a] shrink-0 hover:opacity-80 transition-opacity"
          >
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: easeOut, delay: 0.05 }}
          >
            <Link
              href="/products?category=new-arrivals"
              className="group relative block w-full min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] rounded-[26px] overflow-hidden bg-gradient-to-br from-[#cfc9c4] via-[#c3bbb4] to-[#b8aea5] ring-1 ring-black/[0.06] shadow-[0_20px_50px_-28px_rgba(10,10,10,0.35)]"
            >
              <span className="absolute top-4 left-4 z-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0a0a0a] shadow-sm">
                Lookbook
              </span>
              <Image
                src="/brand/tz-hero-for-him.png"
                alt="Lookbook fashion editorial"
                fill
                priority
                className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.08] group-hover:rotate-1"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: easeOut, delay: 0.12 }}
          >
            <Link
              href="/products"
              className="group relative block w-full min-h-[300px] sm:min-h-[360px] lg:min-h-[420px] rounded-[26px] overflow-hidden bg-gradient-to-br from-[#d8d2cd] via-[#c9c1ba] to-[#b8aea5] ring-1 ring-black/[0.06] shadow-[0_20px_50px_-28px_rgba(10,10,10,0.35)]"
            >
              <span className="absolute top-4 left-4 z-10 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0a0a0a] shadow-sm">
                Season edit
              </span>
              <Image
                src="/brand/tz-hero-for-her.png"
                alt="Season edit fashion editorial"
                fill
                className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.08] group-hover:rotate-1"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </Link>
          </motion.div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { href: '/search?mode=shop', label: 'Shop the look', icon: Sparkles },
            { href: '/search', label: 'Text search', icon: Search },
            { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
            { href: '/try-on', label: 'Try-on', icon: Layers },
            { href: '/compare', label: 'Compare', icon: GitCompare },
            { href: '/sales', label: 'Sale', icon: Heart },
          ].map((chip) => (
            <Link
              key={chip.label}
              href={chip.href}
              className="flex items-center justify-center gap-2 rounded-full bg-white/80 hover:bg-white border border-white/70 shadow-sm backdrop-blur px-3 py-2.5 text-[11px] sm:text-xs font-bold text-[#0a0a0a] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <chip.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{chip.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Featured + Bestsellers — square cream cards with heart/bag overlays
   ────────────────────────────────────────────────────────────────────────── */

const PRODUCT_PASTELS = ['#e8dffd', '#ede5d8', '#e6ebef', '#cff4f9'] as const

function ProductCardEditorial({ product, index }: { product: Product; index: number }) {
  const img = product.image_cdn || product.image_url || ''
  const price = formatPrice(product)
  const easeOut = [0.22, 1, 0.36, 1] as const
  const frame = PRODUCT_PASTELS[index % PRODUCT_PASTELS.length]

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: easeOut }}
      className="group"
    >
      <Link href={`/products/${product.id}`} className="block">
        <div
          className="rounded-[24px] p-2 sm:p-2.5 ring-1 ring-black/[0.05]"
          style={{ backgroundColor: frame }}
        >
          <div className="tz-product-card aspect-square ring-0">
          {img ? (
            <Image
              src={img}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/600x600/ffffff/0a0a0a?text=TrendZone'
              }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[#0a0a0a]/35 text-sm">No image</div>
          )}
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
              className="tz-icon-btn"
              aria-label="Save"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
              className="tz-icon-btn"
              aria-label="Quick view"
            >
              <ShoppingBag className="h-4 w-4" />
            </button>
          </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="tz-eyebrow tz-burgundy uppercase text-[0.72rem] truncate">
            {product.title}
          </p>
          {price && (
            <p className="text-[0.95rem] font-extrabold tz-burgundy whitespace-nowrap">
              {price}
            </p>
          )}
        </div>
        {product.brand || product.category ? (
          <p className="mt-1 text-[12px] text-[#0a0a0a]/60 line-clamp-2">
            {product.brand ? <span className="font-medium">{product.brand}</span> : null}
            {product.brand && product.category ? ' · ' : ''}
            {product.category}
          </p>
        ) : null}
      </Link>
    </motion.div>
  )
}

function ProductsRow({ title, eyebrow, products, href = '/products', count = 4 }: {
  title: { italic: string; bold: string }
  eyebrow?: string
  products: Product[]
  href?: string
  count?: number
}) {
  const list = products.slice(0, count)
  return (
    <section className="px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <div className="tz-sheet p-5 sm:p-8 lg:p-12">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            {eyebrow && <p className="tz-eyebrow mb-3">{eyebrow}</p>}
            <h2 className="tz-headline">
              <em>{title.italic}</em>{title.bold}
            </h2>
          </div>
          <Link href={href} className="inline-flex items-center gap-1 text-sm font-bold text-[#0a0a0a] hover:opacity-70">
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-7">
          {list.length === 0
            ? Array.from({ length: count }).map((_, i) => (
                <div key={i} className="tz-product-card aspect-square skeleton-shimmer" />
              ))
            : list.map((p, i) => <ProductCardEditorial key={p.id} product={p} index={i} />)}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Editorial banner — “We don't follow trends — we create them”
   ────────────────────────────────────────────────────────────────────────── */

function EditorialBanner() {
  return (
    <section className="px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="tz-sheet relative grid lg:grid-cols-12 items-center overflow-hidden min-h-[320px] lg:min-h-[380px]"
      >
        <div className="lg:col-span-6 relative h-[260px] lg:h-full">
          <Image
            src="/brand/tz-hero-portrait.png"
            alt="Editorial"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white" />
        </div>
        <div className="lg:col-span-6 px-6 sm:px-10 py-8 lg:py-12">
          <h2 className="tz-headline tz-headline-xl leading-[0.95]">
            We Don&apos;t <em>Follow</em> Trends
            <br />
            <span className="opacity-90">— We <em>Create</em> Them.</span>
          </h2>
          <p className="mt-5 max-w-md text-[#0a0a0a]/65 text-sm leading-relaxed">
            Our journey in fashion is built on innovation, quality, and a passion for contemporary design.
            Step into a marketplace where every find is intentional.
          </p>
          <div className="mt-6">
            <Link href="/products" className="btn-primary">Shop now</Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stats — pulled from real catalog data
   ────────────────────────────────────────────────────────────────────────── */

function ProudStats() {
  const { data, isLoading } = useCatalogStats()

  const items = [
    {
      topNum: data?.totalProducts ?? 0,
      suffix: '',
      label: 'Products in catalog',
      desc: 'Every garment is crawled, deduplicated, and embedded so you can search across the entire catalog at once.',
    },
    {
      topNum: data?.brandsCount ?? 0,
      suffix: data?.brandsCapped ? '+' : '',
      label: 'Curated brands',
      desc: 'Independent labels and global fashion houses, side-by-side, all searchable in one place.',
    },
    {
      topNum: data?.categoriesCount ?? 0,
      suffix: data?.categoriesCapped ? '+' : '',
      label: 'Live categories',
      desc: 'Dresses, tops, denim, knits, bags, shoes — automatically tagged from photos with our vision pipeline.',
    },
    {
      topNum: data?.onSaleTotal ?? 0,
      suffix: '',
      label: 'Items on sale right now',
      desc: 'We track price drops continuously, so the sale page stays fresh without you refreshing it.',
    },
  ]

  return (
    <section className="px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <div className="tz-sheet p-5 sm:p-8 lg:p-12">
        <p className="tz-eyebrow mb-3">Numbers from our catalog</p>
        <h2 className="tz-headline mb-10">
          <em>We Are</em> PROUD OF IT
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
          {items.map((it, i) => {
            const hasNumber = !isLoading && it.topNum > 0
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                className={`pl-5 ${i > 0 ? 'lg:border-l border-black/10' : ''}`}
              >
                <p className="text-[2.6rem] lg:text-[3.5rem] font-extrabold leading-none text-[#0a0a0a] tracking-tight">
                  {isLoading ? (
                    <span className="text-[#0a0a0a]/30">···</span>
                  ) : hasNumber ? (
                    <>
                      <CountUp to={it.topNum} />
                      {it.suffix}
                    </>
                  ) : (
                    <span className="text-[#0a0a0a]/40">—</span>
                  )}
                </p>
                <p className="mt-3 tz-eyebrow tz-burgundy">{it.label}</p>
                <p className="mt-2 text-[12.5px] text-[#0a0a0a]/65 leading-relaxed">
                  {it.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   About Us — moved into the home page (as requested)
   ────────────────────────────────────────────────────────────────────────── */

function AboutUs() {
  const pillars = [
    {
      icon: Eye,
      title: 'Visual search',
      desc: 'Take a photo, paste a screenshot, drop a runway look — TrendZone finds matching pieces across every brand we index.',
    },
    {
      icon: Brain,
      title: 'Style intelligence',
      desc: 'Our models read color, fit, material and silhouette so the “Complete the look” suggestions actually look good together.',
    },
    {
      icon: Wand2,
      title: 'Try-on & wardrobe',
      desc: 'See garments on yourself before buying, save what you own to your wardrobe, and remix outfits without leaving the app.',
    },
  ]

  return (
    <section id="about" className="px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="tz-sheet relative grid lg:grid-cols-12 gap-8 lg:gap-12 items-stretch overflow-hidden"
      >
        <div className="lg:col-span-5 relative h-[280px] lg:h-auto min-h-[320px]">
          <Image
            src="/brand/tz-about-studio.png"
            alt="The TrendZone studio"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 40vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-white/40" />
        </div>

        <div className="lg:col-span-7 px-6 sm:px-10 py-8 lg:py-12 lg:pl-0">
          <p className="tz-eyebrow mb-3">About us</p>
          <h2 className="tz-headline">
            <em>Fashion discovery,</em> RE-IMAGINED
          </h2>
          <p className="mt-6 max-w-xl text-[#0a0a0a]/70 text-sm lg:text-[15px] leading-relaxed">
            TrendZone is a fashion marketplace built for the way people actually shop today —
            visually. Instead of digging through filters, you upload a photo, describe a vibe, or
            open your wardrobe, and our AI does the matching across hundreds of brands and
            thousands of products. Every result links back to a real, in-stock piece you can buy.
          </p>

          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-2xl bg-[#e5eeff]/40 ring-1 ring-black/8 p-4"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#0a0a0a] ring-1 ring-black/10">
                  <p.icon className="h-4 w-4" />
                </span>
                <p className="mt-3 tz-eyebrow tz-burgundy">{p.title}</p>
                <p className="mt-1.5 text-[12.5px] text-[#0a0a0a]/65 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/products" className="btn-primary">Browse the catalog</Link>
            <Link href="/search?mode=shop" className="btn-secondary">Try Shop the look</Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Features — Built For Every Moment (uses our local generated images)
   ────────────────────────────────────────────────────────────────────────── */

function FeatureLinks() {
  const items = [
    { href: '/search?mode=shop', title: 'Shop the look', desc: 'Photo → pieces', img: '/brand/tz-feature-shop.png', bg: '#e8dffd' },
    { href: '/search', title: 'Text search', desc: 'Describe the vibe', img: '/brand/tz-feature-search.png', bg: '#cff4f9' },
    { href: '/wardrobe', title: 'My wardrobe', desc: 'Save & remix', img: '/brand/tz-feature-wardrobe.png', bg: '#ede5d8' },
    { href: '/try-on', title: 'Virtual try-on', desc: 'Preview on you', img: '/brand/tz-feature-tryon.png', bg: '#ffd6e8' },
    { href: '/compare', title: 'Compare', desc: '2–5 items', img: '/brand/tz-feature-complete.png', bg: '#e6ebef' },
    { href: '/sales', title: 'Shop sale', desc: 'Fresh price drops', img: '/brand/tz-feature-sale.png', bg: '#fff4c8' },
  ]
  return (
    <section className="px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <div className="tz-sheet p-5 sm:p-8 lg:p-12">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="tz-eyebrow mb-3">Categories</p>
            <h2 className="tz-headline">
              <em>Tools &</em> picks
            </h2>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 text-sm font-bold text-[#0a0a0a] hover:opacity-70">
            View all <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
          {items.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
              className="snap-start shrink-0 w-[46vw] max-w-[220px] sm:w-[200px] sm:max-w-none"
            >
              <Link
                href={f.href}
                className="group block relative aspect-[3/4] rounded-[22px] overflow-hidden ring-1 ring-black/[0.06] shadow-[0_16px_40px_-24px_rgba(10,10,10,0.35)]"
                style={{ backgroundColor: f.bg }}
              >
                <Image
                  src={f.img}
                  alt={f.title}
                  fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="220px"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 flex flex-col items-center gap-1.5 bg-gradient-to-t from-black/25 to-transparent pt-16">
                  <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0a0a0a] shadow-md max-w-[95%] text-center leading-tight">
                    {f.title}
                  </span>
                  <span className="text-[11px] font-semibold text-white drop-shadow-sm">{f.desc}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Big closing banner — TRENDZONE wordmark + newsletter
   (Dead links removed — only working CTAs remain.)
   ────────────────────────────────────────────────────────────────────────── */

function ClosingBanner() {
  return (
    <section className="px-3 sm:px-5 lg:px-8 py-6 lg:py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="tz-sheet relative isolate overflow-hidden"
      >
        <div className="relative aspect-[16/8] sm:aspect-[16/6]">
          <Image
            src="/brand/tz-hero-banner.png"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.25)_0%,rgba(229,238,255,0.55)_70%,#ffffff_100%)]" />
          <div className="absolute inset-0 grid place-items-center px-4">
            <div className="text-center">
              <p className="tz-eyebrow mb-2 inline-flex items-center gap-2">
                <ArrowUpRight className="h-3.5 w-3.5" /> Explore now
              </p>
              <h2
                className="font-sans font-black leading-none tracking-tighter text-[#0a0a0a]"
                style={{ fontSize: 'clamp(3rem, 14vw, 11rem)' }}
              >
                TRENDZONE
              </h2>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 px-6 sm:px-10 py-7 lg:py-9 -mt-2 items-center">
          <form className="flex items-center gap-3 max-w-md" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your email"
              className="flex-1 bg-transparent border-b border-[#0a0a0a]/25 py-2 text-sm placeholder-[#0a0a0a]/45 focus:outline-none focus:border-[#0a0a0a]"
            />
            <button type="button" className="text-[#0a0a0a] hover:opacity-60 transition-opacity" aria-label="Subscribe">
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </form>
          <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 text-[13px]">
            <Link href="/products" className="px-4 py-2 rounded-full bg-white ring-1 ring-black/10 text-[#0a0a0a] font-semibold text-sm hover:bg-[#e5eeff] transition-colors">All products</Link>
            <Link href="/sales" className="px-4 py-2 rounded-full bg-white ring-1 ring-black/10 text-[#0a0a0a] font-semibold text-sm hover:bg-[#e5eeff] transition-colors">Sale</Link>
            <Link href="/search" className="px-4 py-2 rounded-full bg-white ring-1 ring-black/10 text-[#0a0a0a] font-semibold text-sm hover:bg-[#e5eeff] transition-colors">Discover</Link>
            <Link href="#about" className="px-4 py-2 rounded-full bg-[#0a0a0a] text-white font-semibold text-sm hover:bg-black transition-colors">About us</Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  const featured = useProducts(8, 0)
  const bestsellers = useProducts(8, 8)

  return (
    <div className="overflow-x-hidden">
      <Hero />

      <ProductsRow
        eyebrow="Curated"
        title={{ italic: 'Featured ', bold: 'PRODUCTS' }}
        products={featured.data ?? []}
        href="/products"
        count={4}
      />

      <EditorialBanner />

      <ProductsRow
        eyebrow="Most loved"
        title={{ italic: 'Our ', bold: 'BESTSELLERS' }}
        products={bestsellers.data ?? []}
        href="/products"
        count={3}
      />

      <ProudStats />

      <AboutUs />

      <FeatureLinks />

      <ClosingBanner />

      {/* Hidden Reveal anchor to keep import used in case other sections need it later */}
      <Reveal className="hidden" aria-hidden> </Reveal>
    </div>
  )
}
