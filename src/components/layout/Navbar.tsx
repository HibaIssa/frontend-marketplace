'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ShoppingBag, User, Store, Shield, Heart, Shirt, Layers,
  Sparkles, Tag, ChevronDown, Menu, X, GitCompare,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/auth'
import { useCompareStore } from '@/store/compare'

type NavLink = { href: string; label: string }
type Feature = { href: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }

const navLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/products?gender=men', label: 'Men' },
  { href: '/products?gender=women', label: 'Women' },
  { href: '/products', label: 'Shop' },
  { href: '/sales', label: 'Sale' },
  { href: '/search', label: 'Discover' },
]

const featureLinks: Feature[] = [
  { href: '/search?mode=shop', label: 'Shop the look', desc: 'Upload a photo, find every piece.', icon: Sparkles },
  { href: '/search', label: 'Text search', desc: 'Describe a vibe, get matching items.', icon: Search },
  { href: '/wardrobe', label: 'My wardrobe', desc: 'Save and remix what you own.', icon: Shirt },
  { href: '/try-on', label: 'Virtual try-on', desc: 'Preview garments on yourself.', icon: Layers },
  { href: '/compare', label: 'Compare items', desc: 'Side-by-side AI breakdown of any 2–5 picks.', icon: GitCompare },
  { href: '/products', label: 'Complete the look', desc: 'Open a product to finish the outfit.', icon: Sparkles },
  { href: '/sales', label: 'Shop sale', desc: 'Today\u2019s reductions across catalog.', icon: Tag },
]

const ACTIVE_PILL =
  'bg-[#0a0a0a] text-white ring-1 ring-black/20'
const IDLE_PILL =
  'text-[#0a0a0a]/75 hover:text-[#0a0a0a] hover:bg-[#e5eeff]'

export function Navbar() {
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navLinkActive = (href: string) => {
    if (href === '/') return pathname === '/'
    const [path, query] = href.split('?')
    if (query) {
      if (pathname !== path) return false
      const want = new URLSearchParams(query)
      for (const [k, v] of want.entries()) {
        if (searchParams.get(k) !== v) return false
      }
      return true
    }
    if (path === '/products' && pathname === '/products') {
      return !searchParams.get('gender')
    }
    return pathname === href || (path !== '/' && pathname.startsWith(path))
  }
  const { isAuthenticated, logout, user } = useAuthStore()
  const canSeeAdmin = mounted && isAuthenticated() && !!user?.is_admin
  const compareCount = useCompareStore((s) => s.productIds.length)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    setFeaturesOpen(false)
    setMobileOpen(false)
  }, [pathname, searchParams])

  const featuresActive = featureLinks.some((f) => {
    const base = f.href.split('?')[0]
    return base === pathname || (base !== '/' && pathname.startsWith(base))
  })

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-3">
        <div
          className={clsx(
            'flex items-center justify-between gap-3 h-14 px-4 sm:px-5 rounded-full transition-all duration-300',
            scrolled
              ? 'bg-white/95 backdrop-blur-md shadow-[0_10px_40px_-22px_rgba(10,10,10,0.12)] ring-1 ring-black/10'
              : 'bg-white/90 backdrop-blur-sm ring-1 ring-black/8'
          )}
        >
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0a0a0a] text-white text-[0.7rem] font-extrabold tracking-tight">
              TZ
            </span>
            <span className="font-display text-[15px] font-bold tz-burgundy tracking-tight">
              TrendZone
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center min-w-0 max-w-2xl mx-3 overflow-visible">
            {navLinks.map((link) => {
              const active = navLinkActive(link.href)
              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap',
                    active ? ACTIVE_PILL : IDLE_PILL
                  )}
                >
                  {link.label}
                </Link>
              )
            })}

            {/* Features dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setFeaturesOpen(true)}
              onMouseLeave={() => setFeaturesOpen(false)}
            >
              <button
                type="button"
                onClick={() => setFeaturesOpen((v) => !v)}
                className={clsx(
                  'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors',
                  featuresActive || featuresOpen ? ACTIVE_PILL : IDLE_PILL
                )}
                aria-haspopup="true"
                aria-expanded={featuresOpen}
              >
                Features
                <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', featuresOpen && 'rotate-180')} />
              </button>
              <AnimatePresence>
                {featuresOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute left-1/2 top-full -translate-x-1/2 mt-3 w-[min(640px,90vw)] rounded-2xl bg-white shadow-xl ring-1 ring-black/10 p-3 z-50"
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {featureLinks.map((f) => (
                        <Link
                          key={f.label}
                          href={f.href}
                          className="group flex items-start gap-3 rounded-xl p-3 hover:bg-[#e5eeff] transition-colors"
                        >
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#e5eeff] text-[#0a0a0a] ring-1 ring-black/10 group-hover:bg-[#0a0a0a] group-hover:text-white transition-colors">
                            <f.icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-[#0a0a0a]">{f.label}</p>
                            <p className="text-[12px] text-[#0a0a0a]/65 leading-snug line-clamp-2">{f.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {canSeeAdmin && (
              <Link
                href="/admin"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors',
                  pathname.startsWith('/admin')
                    ? 'bg-[#0a0a0a] text-white ring-1 ring-black'
                    : 'text-[#0a0a0a] hover:bg-[#e5eeff] ring-1 ring-black/15'
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </Link>
            )}
            {mounted && user?.user_type === 'business' && (
              <Link
                href="/dashboard"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors',
                  pathname.startsWith('/dashboard')
                    ? 'bg-[#0a0a0a] text-white'
                    : 'text-[#0a0a0a] hover:bg-[#e5eeff]'
                )}
              >
                <Store className="w-3.5 h-3.5" />
                Dashboard
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/search"
              className="p-2 rounded-full text-[#0a0a0a] hover:bg-[#e5eeff] transition-colors"
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px]" />
            </Link>
            <Link
              href="/favorites"
              className="hidden sm:inline-flex p-2 rounded-full text-[#0a0a0a] hover:bg-[#e5eeff] transition-colors"
              aria-label="Saved"
            >
              <Heart className="w-[18px] h-[18px]" />
            </Link>
            <Link
              href="/compare"
              className={clsx(
                'relative hidden sm:inline-flex p-2 rounded-full transition-colors',
                pathname.startsWith('/compare')
                  ? 'bg-[#e5eeff] text-[#0a0a0a] ring-1 ring-black/15'
                  : 'text-[#0a0a0a] hover:bg-[#e5eeff]'
              )}
              aria-label={mounted && compareCount > 0 ? `Compare (${compareCount} item${compareCount === 1 ? '' : 's'})` : 'Compare'}
            >
              <GitCompare className="w-[18px] h-[18px]" />
              {mounted && compareCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#0a0a0a] text-white text-[10px] font-bold px-1 ring-2 ring-white">
                  {compareCount}
                </span>
              )}
            </Link>
            <Link
              href="/products"
              className="p-2 rounded-full text-[#0a0a0a] hover:bg-[#e5eeff] transition-colors"
              aria-label="Bag"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
            </Link>
            {mounted && isAuthenticated() ? (
              <div className="relative group">
                <button
                  type="button"
                  className="p-2 rounded-full text-[#0a0a0a] hover:bg-[#e5eeff] transition-colors"
                >
                  <User className="w-[18px] h-[18px]" />
                </button>
                <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-xl ring-1 ring-black/10 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link href="/account" className="block px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#e5eeff]">Account</Link>
                  {canSeeAdmin && (
                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#e5eeff]">
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </Link>
                  )}
                  {user?.user_type === 'business' && (
                    <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#e5eeff]">
                      <Store className="w-3.5 h-3.5" /> Dashboard
                    </Link>
                  )}
                  <Link href="/wardrobe" className="block px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#e5eeff]">My Wardrobe</Link>
                  <Link href="/try-on" className="block px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#e5eeff]">Virtual Try-On</Link>
                  <Link href="/compare" className="flex items-center justify-between px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#e5eeff]">
                    <span>Compare</span>
                    {mounted && compareCount > 0 && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#0a0a0a] text-white text-[10px] font-bold px-1.5">
                        {compareCount}
                      </span>
                    )}
                  </Link>
                  <div className="border-t border-black/10 my-1" />
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-[#0a0a0a] hover:bg-[#e5eeff]"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex text-[13px] py-2 px-5 ml-1 items-center justify-center rounded-full bg-[#0a0a0a] text-white font-semibold hover:bg-black transition-colors"
              >
                Sign in
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden p-2 rounded-full text-[#0a0a0a] hover:bg-[#e5eeff] transition-colors"
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-2 rounded-2xl bg-white shadow-xl ring-1 ring-black/10 p-3"
              aria-label="Main"
            >
              <div className="grid grid-cols-2 gap-1 mb-2">
                {navLinks.map((link) => {
                  const active = navLinkActive(link.href)
                  return (
                    <Link
                      key={`m-${link.href}-${link.label}`}
                      href={link.href}
                      className={clsx(
                        'px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                        active ? ACTIVE_PILL : 'text-[#0a0a0a]/85 hover:bg-[#e5eeff]'
                      )}
                    >
                      {link.label}
                    </Link>
                  )
                })}
              </div>
              <p className="px-2 pt-2 pb-1 tz-eyebrow">Features</p>
              <div className="grid grid-cols-1 gap-0.5">
                {featureLinks.map((f) => (
                  <Link
                    key={`m-${f.label}`}
                    href={f.href}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#e5eeff] text-[#0a0a0a]"
                  >
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eeff] text-[#0a0a0a] ring-1 ring-black/10">
                      <f.icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold">{f.label}</span>
                  </Link>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
