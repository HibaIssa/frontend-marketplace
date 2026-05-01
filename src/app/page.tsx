'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'
import {
  ArrowUpRight,
  Search,
  Sparkles,
  Shirt,
  Layers,
  GitCompare,
  Heart,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import type { Product } from '@/types/product'

/* ─────────────────────────────────────────────────────────────────────────────
   Palette tokens (kept inline for clarity — same set across the page)
     #f5f3f2  page wash
     #ece8e5  soft surface
     #d8d2cd  accent stone
     #c9c1ba  hairline / divider
     #b8aea5  muted icon
     #2a2623  ink
   ────────────────────────────────────────────────────────────────────────── */

const EASE_OUT = [0.22, 1, 0.36, 1] as const

/* ─────────────────────────────────────────────────────────────────────────────
   Data hooks (unchanged logic — keep features intact)
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
  styles?: FacetBucket[]
}

function useCatalogStats() {
  return useQuery({
    queryKey: ['home-stats'],
    queryFn: async () => {
      const [facetsRes, salesRes] = await Promise.allSettled([
        api.get<FacetsResponse>(endpoints.products.facets),
        api.get<Product[]>(endpoints.products.sales, { limit: 1, page: 1 }),
      ])
      const facets = facetsRes.status === 'fulfilled' ? facetsRes.value?.data : undefined
      const sales = salesRes.status === 'fulfilled' ? salesRes.value : undefined

      const sumBuckets = (b?: FacetBucket[]) =>
        Array.isArray(b)
          ? b.reduce((s, x) => s + (Number(x.count ?? x.doc_count ?? 0) || 0), 0)
          : 0

      const totalProducts = Math.max(sumBuckets(facets?.categories), sumBuckets(facets?.brands))
      const brandsLen = Array.isArray(facets?.brands) ? facets!.brands!.length : 0
      const categoriesLen = Array.isArray(facets?.categories) ? facets!.categories!.length : 0
      const onSaleTotal =
        Number((sales as { pagination?: { total?: number }; meta?: { total?: number } } | undefined)?.pagination?.total ?? (sales as { meta?: { total?: number } } | undefined)?.meta?.total ?? 0) || 0

      return { totalProducts, brandsLen, categoriesLen, onSaleTotal }
    },
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

function formatPrice(p: Product) {
  const raw = typeof p.price_cents === 'string' ? parseInt(p.price_cents, 10) : p.price_cents
  const pc = Number.isFinite(raw as number) ? (raw as number) : 0
  if (pc <= 0) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: p.currency || 'USD',
    minimumFractionDigits: 0,
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
  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Section primitives — editorial typography / spacing
   ────────────────────────────────────────────────────────────────────────── */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#736b65]">
      {children}
    </p>
  )
}

function SectionHead({
  eyebrow,
  title,
  href,
  hrefLabel = 'View all',
}: {
  eyebrow?: string
  title: string
  href?: string
  hrefLabel?: string
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-7 sm:mb-9">
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-2 font-display text-[1.95rem] sm:text-[2.35rem] lg:text-[2.85rem] font-bold text-[#2a2623] leading-[1.05] tracking-tight">
          {title}
        </h2>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2a2623] hover:opacity-60 transition-opacity"
        >
          {hrefLabel}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Hero — ONE large editorial image card
   ────────────────────────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative bg-[#ece8e5]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
        /*
          Full-bleed hero. The image is 1024×819 (ratio 1.25:1 / 5:4).
          We size the container to match that natural ratio so the entire
          family is visible — nothing is cropped. On most desktop
          viewports this makes the hero taller than the fold, which is
          exactly what was asked: very big, whole picture visible.
        */
        className="relative w-full overflow-hidden aspect-[1024/819] min-h-screen bg-[#ece8e5]"
      >
        <Image
          src="/brand/tz-hero-family-wide.png"
          alt="TrendZone family editorial — the new season for everyone"
          fill
          priority
          sizes="100vw"
          /*
            object-contain guarantees the whole family is visible at every
            viewport size. The page background already matches the image's
            beige backdrop, so any letterbox bars blend invisibly.
          */
          className="object-contain object-center"
        />

        {/* Pulse overlay — kept very subtle so the family is fully visible */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0.08 }}
          animate={{ opacity: [0.08, 0.16, 0.08] }}
          transition={{ duration: 8, ease: 'easeInOut', repeat: Infinity }}
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(42,38,35,0.22)_0%,rgba(42,38,35,0)_30%,rgba(42,38,35,0)_60%,rgba(42,38,35,0.55)_100%)]"
        />

        {/* Top eyebrow + season tag — pushed below the floating navbar */}
        <div className="absolute inset-x-0 top-[72px] sm:top-20 px-5 sm:px-8 lg:px-12 flex items-center justify-between text-white">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.34em] drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
            TrendZone Studio
          </p>
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.34em] drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
            Season 2026 · Pre-Fall
          </p>
        </div>

        {/* Bottom block — large editorial title */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
          className="absolute inset-x-0 bottom-0 px-5 sm:px-8 lg:px-12 pb-8 sm:pb-12 lg:pb-16"
        >
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.34em] text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
            The family lookbook
          </p>
          <h1
            className="mt-3 font-display font-bold text-white tracking-[-0.03em] leading-[0.9] drop-shadow-[0_4px_22px_rgba(0,0,0,0.55)]"
            style={{ fontSize: 'clamp(3.15rem, 9.5vw, 9.25rem)' }}
          >
            Dressed together,
            <br />
            <span className="font-semibold italic tracking-[-0.02em] opacity-95">in quiet luxury.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[14px] sm:text-[15px] font-medium leading-[1.65] text-white/92 drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
            From refined shirts and trousers to tailoring you can live in — explore the edit, shop the look,
            try pieces on virtually, and compare what you love.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2a2623] hover:bg-[#ece8e5] transition-colors shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            >
              Explore collection
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/search?mode=shop"
              className="inline-flex items-center gap-2 rounded-full border border-white/80 px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 transition-colors backdrop-blur-[2px]"
            >
              Shop the look
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Categories — clean, restrained card grid
   ────────────────────────────────────────────────────────────────────────── */

function Categories() {
  const items = [
    { label: 'Shirts', href: '/products?category=shirts', img: '/brand/tz-editorial-stool.png' },
    { label: 'Trousers', href: '/products?category=bottoms', img: '/brand/tz-cat-trousers.png' },
    { label: 'Suits', href: '/products?category=suits', img: '/brand/tz-cat-suits-women.png' },
    { label: 'Knitwear', href: '/products?category=knitwear', img: '/brand/tz-cat-tops.png' },
    { label: 'Outerwear', href: '/products?category=outerwear', img: '/brand/tz-cat-suits-men.png' },
    { label: 'Dresses', href: '/products?category=dress', img: '/brand/tz-cat-women.png' },
  ]

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <SectionHead eyebrow="Product categories" title="Shirts, trousers & tailoring" href="/products" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {items.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, delay: i * 0.04, ease: EASE_OUT }}
          >
            <Link
              href={c.href}
              className="group block relative aspect-[4/5] overflow-hidden rounded-[10px] ring-1 ring-[#d8d2cd] bg-[#ece8e5]"
            >
              <Image
                src={c.img}
                alt={`${c.label} category`}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(42,38,35,0.55)_100%)]" />
              <span className="absolute bottom-3 left-3 text-white text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.26em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]">
                {c.label}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   About Us — image + story, replaces the old "Modern Woman" block
   ────────────────────────────────────────────────────────────────────────── */

function AboutUs() {
  return (
    <section className="px-4 sm:px-6 lg:px-10 py-10 lg:py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.95, ease: EASE_OUT }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center"
      >
        <div className="lg:col-span-6 relative aspect-[4/5] sm:aspect-[5/6] lg:aspect-[4/5] overflow-hidden rounded-[14px] ring-1 ring-[#d8d2cd] bg-[#ece8e5]">
          <Image
            src="/brand/tz-editorial-couple.png"
            alt="TrendZone — about the studio"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover transition-transform duration-[1400ms] ease-out hover:scale-[1.03]"
          />
        </div>
        <div className="lg:col-span-6">
          <Eyebrow>About us</Eyebrow>
          <h2
            className="mt-5 font-display font-bold text-[#2a2623] leading-[0.96] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(2.5rem, 5.5vw, 5rem)' }}
          >
            The house of
            <br />
            <span className="italic font-semibold">TrendZone.</span>
          </h2>
          <div className="mt-7 grid sm:grid-cols-2 gap-6 sm:gap-8 text-[14px] sm:text-[15px] font-medium leading-[1.72] text-[#3d3935]">
            <p>
              TrendZone is a modern fashion marketplace built around discovery. We bring together
              considered designers, AI-assisted search, virtual try-on and shop-the-look tools so
              every shopper finds pieces that genuinely belong in their wardrobe.
            </p>
            <p>
              From quiet tailoring to relaxed everyday essentials, every piece is selected for
              craft, fit and longevity — because great clothing should outlast the season it was
              bought in. This is fashion, the way it should feel: personal, effortless, yours.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-[#2a2623] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white hover:bg-black transition-colors"
            >
              Shop the studio
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/search?mode=shop"
              className="inline-flex items-center gap-2 rounded-full border border-[#d8d2cd] bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2a2623] hover:bg-[#ece8e5] transition-colors"
            >
              Discover the tools
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Services — clean four-card grid (Snap & Shop, Try-On, Shop the Look, Compare)
   ────────────────────────────────────────────────────────────────────────── */

function Services() {
  const items = [
    {
      title: 'Snap & Shop',
      desc: 'Photograph any garment in-store or in the wild. Our visual search finds the closest matches across the catalog in seconds — no keywords required.',
      img: '/brand/tz-service-photo-search-men.png',
      href: '/search?mode=shop',
    },
    {
      title: 'Virtual Try-On',
      desc: 'Step in front of the mirror — change the size, the colour, the silhouette. See exactly how a piece falls on you before you commit, from any device.',
      img: '/brand/tz-service-tryon-mirror.png',
      href: '/try-on',
    },
    {
      title: 'Shop the Look',
      desc: 'Capture an outfit you love and we will rebuild it head-to-toe from our edits. Tops, bottoms, shoes, accessories — completed for you, in your style.',
      img: '/brand/tz-service-shop-the-look.png',
      href: '/search?mode=shop',
    },
    {
      title: 'Compare',
      desc: 'Stack pieces side by side — fabric, fit, price and reviews — so you can decide between two looks with confidence before you commit to one.',
      img: '/brand/tz-editorial-couple.png',
      href: '/compare',
    },
  ]

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <SectionHead eyebrow="Our services" title="Snap it. Try it. Compare it." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: i * 0.06, ease: EASE_OUT }}
            className="group rounded-[10px] ring-1 ring-[#d8d2cd] bg-white overflow-hidden"
          >
            <Link href={s.href} className="block">
              <div className="relative aspect-[4/3] overflow-hidden bg-[#ece8e5]">
                <Image
                  src={s.img}
                  alt={s.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#2a2623]">
                  {s.title}
                </p>
                <p className="mt-3 text-[14px] font-medium leading-[1.72] text-[#4a4540]">{s.desc}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Tools — preserved features as low-key chips (Shop the look, Search, Wardrobe…)
   ────────────────────────────────────────────────────────────────────────── */

function Tools() {
  const tools = [
    { href: '/search?mode=shop', label: 'Shop the look', icon: Sparkles },
    { href: '/search', label: 'Text search', icon: Search },
    { href: '/wardrobe', label: 'Wardrobe', icon: Shirt },
    { href: '/try-on', label: 'Try-on', icon: Layers },
    { href: '/compare', label: 'Compare', icon: GitCompare },
    { href: '/sales', label: 'Sale', icon: Heart },
  ]
  return (
    <section className="px-4 sm:px-6 lg:px-10 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {tools.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group flex items-center justify-center gap-2 rounded-full bg-white border border-[#d8d2cd] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#2a2623] hover:bg-[#ece8e5] transition-colors"
          >
            <t.icon className="h-3.5 w-3.5 text-[#b8aea5] group-hover:text-[#2a2623] transition-colors" />
            <span className="truncate">{t.label}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Featured products — calm grid (uses existing API)
   ────────────────────────────────────────────────────────────────────────── */

function ProductCard({ product, index }: { product: Product; index: number }) {
  const img = product.image_cdn || product.image_url || ''
  const price = formatPrice(product)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.04, ease: EASE_OUT }}
      className="group"
    >
      <Link href={`/products/${product.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[10px] ring-1 ring-[#d8d2cd] bg-[#ece8e5]">
          {img ? (
            <Image
              src={img}
              alt={product.title || 'Product image'}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[#b8aea5] text-xs uppercase tracking-[0.2em]">
              No image
            </div>
          )}
        </div>
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold uppercase tracking-[0.16em] text-[#2a2623]">
              {product.title}
            </p>
            {(product.brand || product.category) && (
              <p className="mt-1 truncate text-[11px] text-[#736b65]">
                {product.brand}
                {product.brand && product.category ? ' · ' : ''}
                {product.category}
              </p>
            )}
          </div>
          {price && (
            <p className="text-[12px] font-semibold tabular-nums text-[#2a2623] whitespace-nowrap">
              {price}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  )
}

function FeaturedProducts() {
  const featured = useProducts(8, 0)
  const list = featured.data ?? []

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <SectionHead eyebrow="Curated edit" title="Featured products" href="/products" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-7">
        {list.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-[10px] bg-[#ece8e5] ring-1 ring-[#d8d2cd]" />
            ))
          : list.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Numbers (kept — quiet typography)
   ────────────────────────────────────────────────────────────────────────── */

function Numbers() {
  const { data, isLoading } = useCatalogStats()

  const items = [
    { topNum: data?.totalProducts ?? 0, label: 'Products in catalog' },
    { topNum: data?.brandsLen ?? 0, label: 'Curated brands' },
    { topNum: data?.categoriesLen ?? 0, label: 'Live categories' },
    { topNum: data?.onSaleTotal ?? 0, label: 'Items on sale now' },
  ]

  return (
    <section className="px-4 sm:px-6 lg:px-10 py-8 lg:py-12">
      <SectionHead eyebrow="By the numbers" title="A studio, in motion" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10 border-t border-[#d8d2cd] pt-8">
        {items.map((it, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7, delay: i * 0.06, ease: EASE_OUT }}
          >
            <p
              className="font-display font-semibold text-[#2a2623] tracking-[-0.02em] leading-none"
              style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}
            >
              {isLoading ? <span className="text-[#b8aea5]">···</span> : <CountUp to={it.topNum} />}
            </p>
            <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#736b65]">
              {it.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Closing wordmark — quiet, single panel
   ────────────────────────────────────────────────────────────────────────── */

function Closing() {
  return (
    <section className="px-4 sm:px-6 lg:px-10 py-10 lg:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
        className="text-center"
      >
        <Eyebrow>TrendZone</Eyebrow>
        <h2
          className="mt-4 font-display font-semibold text-[#c9c1ba] tracking-[-0.04em] leading-none select-none"
          style={{ fontSize: 'clamp(3.5rem, 14vw, 12rem)' }}
        >
          TRENDZONE
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full bg-[#2a2623] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white hover:bg-black transition-colors"
          >
            Shop now
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/sales"
            className="inline-flex items-center gap-2 rounded-full border border-[#d8d2cd] bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#2a2623] hover:bg-[#ece8e5] transition-colors"
          >
            Sale
          </Link>
        </div>
      </motion.div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Page
   ────────────────────────────────────────────────────────────────────────── */

export default function HomePage() {
  return (
    <div className="overflow-x-hidden bg-[#f5f3f2]">
      <Hero />
      <Tools />
      <Categories />
      <AboutUs />
      <Services />
      <FeaturedProducts />
      <Numbers />
      <Closing />
    </div>
  )
}
