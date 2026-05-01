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

// Glass nav: links stay readable but bar stays visibly transparent (no heavy beige slab).
const ACTIVE_PILL = 'bg-[#2a2623]/90 text-white shadow-sm ring-1 ring-[#2a2623]/30'
const IDLE_PILL = 'text-[#2a2623]/85 hover:text-[#2a2623] hover:bg-white/55'

// Overlay variants — used on the home hero, white-on-image, no pill chrome.
const OVERLAY_ACTIVE = 'text-white underline underline-offset-[6px] decoration-white/80'
const OVERLAY_IDLE = 'text-white/90 hover:text-white'

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

  // Home at scroll 0: nav floats over the hero with white type (fully transparent bar).
  // Any scroll or other route: keep a glass strip — still transparent, never the old solid pill.
  const isHome = pathname === '/'
  const homeOverHero = isHome && !scrolled
  const glassNav =
    'bg-white/18 backdrop-blur-2xl backdrop-saturate-150 border-b border-white/35 shadow-[0_10px_40px_-18px_rgba(42,38,35,0.2)]'

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 inset-x-0 z-50"
    >
      <div className="mx-auto w-full max-w-none px-0 pt-0 transition-all duration-300">
        <div
          className={clsx(
            'flex items-center justify-between gap-3 min-h-14 px-4 sm:px-6 lg:px-10 transition-all duration-300',
            homeOverHero ? 'bg-transparent' : clsx(glassNav, scrolled && 'bg-white/28 border-white/45')
          )}
        >
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span
              className={clsx(
                'inline-flex h-8 w-8 items-center justify-center rounded-full text-[0.72rem] font-extrabold tracking-tight transition-colors',
                homeOverHero
                  ? 'bg-white text-[#2a2623]'
                  : 'bg-[#2a2623] text-white'
              )}
            >
              TZ
            </span>
            <span
              className={clsx(
                'font-display text-[15px] font-bold tracking-tight transition-colors',
                homeOverHero
                  ? 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                  : 'text-[#100809]'
              )}
            >
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
                    'px-3 py-1.5 rounded-full text-[13.5px] font-semibold transition-colors whitespace-nowrap',
                    homeOverHero
                      ? clsx(
                          active ? OVERLAY_ACTIVE : OVERLAY_IDLE,
                          'drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                        )
                      : active ? ACTIVE_PILL : IDLE_PILL
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
                  homeOverHero
                    ? clsx(
                        pathname.startsWith('/admin') ? OVERLAY_ACTIVE : OVERLAY_IDLE,
                        'drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                      )
                    : pathname.startsWith('/admin') ? ACTIVE_PILL : IDLE_PILL
                )}
              >
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
            {canSeeBusinessDashboard && (
              <Link
                href="/dashboard"
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors',
                  homeOverHero
                    ? clsx(
                        pathname.startsWith('/dashboard') ? OVERLAY_ACTIVE : OVERLAY_IDLE,
                        'drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                      )
                    : pathname.startsWith('/dashboard') ? ACTIVE_PILL : IDLE_PILL
                )}
              >
                <Store className="w-3.5 h-3.5" /> Dashboard
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/search"
              className={clsx(
                'p-2 rounded-full transition-colors',
                homeOverHero
                  ? 'text-white hover:bg-white/15 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                  : 'text-slate-800 hover:bg-black/[0.06]'
              )}
              aria-label="Search"
            >
              <Search className="w-[18px] h-[18px]" />
            </Link>
            <Link
              href="/favorites"
              className={clsx(
                'hidden sm:inline-flex p-2 rounded-full transition-colors',
                homeOverHero
                  ? 'text-white hover:bg-white/15 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                  : 'text-slate-800 hover:bg-black/[0.06]'
              )}
              className="hidden sm:inline-flex p-2 rounded-full text-[#0a0a0a] hover:bg-[#e5eeff] transition-colors"
              aria-label="Saved"
            >
              <Heart className="w-[18px] h-[18px]" />
            </Link>
            <Link
              href="/compare"
              className={clsx(
                'relative hidden sm:inline-flex p-2 rounded-full transition-colors',
                homeOverHero
                  ? 'text-white hover:bg-white/15 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                  : pathname.startsWith('/compare')
                    ? 'bg-black/[0.06] text-slate-900 ring-1 ring-black/10'
                    : 'text-slate-800 hover:bg-black/[0.06]'
              )}
              aria-label="Compare"
            >
              <GitCompare className="w-[18px] h-[18px]" />
              {mounted && compareCount > 0 && (
                <span
                  className={clsx(
                    'absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full text-[10px] font-bold px-1 ring-2',
                    homeOverHero
                      ? 'bg-white text-[#2a2623] ring-transparent'
                      : 'bg-[#2a2623] text-white ring-[#f5f3f2]'
                  )}
                >
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
              className={clsx(
                'p-2 rounded-full transition-colors',
                homeOverHero
                  ? 'text-white hover:bg-white/15 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                  : 'text-slate-800 hover:bg-black/[0.06]'
              )}
              aria-label="Bag"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
            </Link>

            {mounted && isAuthenticated() ? (
              <div className="relative group">
                <button
                  type="button"
                  className={clsx(
                    'p-2 rounded-full transition-colors',
                    homeOverHero
                      ? 'text-white hover:bg-white/15 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                      : 'text-slate-800 hover:bg-black/[0.06]'
                  )}
                >
                  <User className="w-[18px] h-[18px]" />
                </button>
                <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-xl ring-1 ring-slate-200 bg-white shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link href="/account" className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-100">Account</Link>
                  <Link href="/wardrobe" className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-100">My Wardrobe</Link>
                  <Link href="/try-on" className="block px-4 py-2 text-sm text-slate-800 hover:bg-slate-100">Virtual Try-On</Link>
                  {canSeeAdmin && <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-800 hover:bg-slate-100"><Shield className="w-3.5 h-3.5" /> Admin</Link>}
                  {canSeeBusinessDashboard && <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-slate-800 hover:bg-slate-100"><Store className="w-3.5 h-3.5" /> Dashboard</Link>}
                  <div className="border-t border-slate-200 my-1" />
                  <button type="button" onClick={logout} className="w-full text-left px-4 py-2 text-sm text-slate-800 hover:bg-slate-100">Sign out</button>
                </div>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  href="/login"
                  className={clsx(
                    'text-[13px] py-2 px-4 rounded-full transition-colors font-semibold',
                    homeOverHero
                      ? 'border border-white/70 text-white hover:bg-white/10 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                      : 'border border-[#2a2623]/25 text-[#2a2623] hover:bg-black/[0.05]'
                  )}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className={clsx(
                    'text-[13px] py-2 px-4 rounded-full transition-colors font-semibold',
                    homeOverHero
                      ? 'bg-white text-[#2a2623] hover:bg-[#ece8e5]'
                      : 'bg-[#2a2623] text-white hover:bg-black'
                  )}
                >
                  Sign up
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className={clsx(
                'md:hidden p-2 rounded-full transition-colors',
                homeOverHero
                  ? 'text-white hover:bg-white/15 drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]'
                  : 'text-slate-800 hover:bg-black/[0.06]'
              )}
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
              {!isAuthenticated() && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <Link href="/login" className="text-center px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-semibold">Login</Link>
                  <Link href="/signup" className="text-center px-3 py-2 rounded-xl bg-[#2a2623] text-white font-semibold">Sign up</Link>
                </div>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
