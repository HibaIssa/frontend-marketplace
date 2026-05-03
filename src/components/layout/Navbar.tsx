'use client'

import { useEffect, useLayoutEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, Shield, Heart, Menu, X } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/auth'

type NavLink = { href: string; label: string }

const navLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/products', label: 'Shop' },
  { href: '/search', label: 'Discover' },
  { href: '/compare', label: 'Compare' },
  { href: '/wardrobe', label: 'Wardrobe' },
  { href: '/try-on', label: 'Try on' },
  { href: '/sales', label: 'Sale' },
]

/** Past this scroll offset: frosted “glass” bar, stronger blur, shorter header height. */
const SCROLL_COMPACT_PX = 40

const HERO_OVERLAY_PATHS = new Set(['/', '/products', '/try-on', '/sales'])
/** Editorial home: white type on dark imagery */
const DARK_HERO_PATHS = new Set(['/'])
/** Light hero (beige) — transparent nav over hero; dark type (not frosted strip). */
const LIGHT_TRANSPARENT_HERO_PATHS = new Set(['/try-on', '/sales'])

const NAV_TRANSITION =
  'background 0.25s ease, backdrop-filter 0.25s ease, -webkit-backdrop-filter 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease'

/** Home hero over imagery: white nav (incl. :visited) so links match logo */
const HOME_NAV_LINK_IDLE =
  'text-white visited:text-white hover:text-white hover:bg-white/12 [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]'
const HOME_NAV_LINK_ACTIVE =
  'text-white visited:text-white font-semibold [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]'
const HOME_ICON_BTN =
  'text-white hover:text-white hover:bg-white/12 [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]'

function normalizePath(pathname: string) {
  return pathname.replace(/\/$/, '') || '/'
}

export function Navbar() {
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const normalized = useMemo(() => normalizePath(pathname), [pathname])
  const hasHeroOverlay = HERO_OVERLAY_PATHS.has(normalized)
  const isDarkHeroTop = DARK_HERO_PATHS.has(normalized)
  const isLightTransparentHeroTop = LIGHT_TRANSPARENT_HERO_PATHS.has(normalized)
  /** Hero routes at top of page: transparent / light strip. Any scroll or non-hero: frosted bar. */
  const glassMode = !hasHeroOverlay || scrolled
  /** Slimmer bar + heavier blur while scrolling */
  const compact = scrolled

  const navLinkActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  const adminActive = pathname.startsWith('/admin') || pathname.startsWith('/dashboard')

  const { isAuthenticated, logout, user } = useAuthStore()
  const canSeeAdmin = mounted && isAuthenticated() && !!user?.is_admin

  useEffect(() => setMounted(true), [])

  useLayoutEffect(() => {
    setScrolled(window.scrollY > SCROLL_COMPACT_PX)
  }, [normalized])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_COMPACT_PX)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, searchParams])

  /**
   * Home + Try on at scroll top: transparent bar over hero (nav reads as part of the scene).
   * Shop / Sale at scroll top: light frosted strip.
   * After scroll: frosted bar — tighter blur stack + stronger blur when `compact`.
   */
  const barStyle: CSSProperties = glassMode
    ? compact
      ? {
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(28px) saturate(1.12)',
          WebkitBackdropFilter: 'blur(28px) saturate(1.12)',
          transition: NAV_TRANSITION,
        }
      : {
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: NAV_TRANSITION,
        }
    : isDarkHeroTop || isLightTransparentHeroTop
      ? {
          background: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          transition: NAV_TRANSITION,
        }
      : {
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          transition: NAV_TRANSITION,
        }

  const navLinkBase = 'rounded-[999px] text-[13px] font-medium tracking-tight transition-all duration-200 whitespace-nowrap'

  /** Default / scrolled nav: flat links + underline accent (no heavy pill). */
  const navLinkGlassBase =
    'text-[13px] font-medium tracking-tight transition-all duration-200 whitespace-nowrap rounded-lg px-3 py-2'

  const navLinkHeroIdle = clsx(
    navLinkBase,
    compact ? 'py-1.5 px-3 text-[12px]' : 'py-2 px-[18px]',
    isDarkHeroTop ? HOME_NAV_LINK_IDLE : 'text-[#2B2521]/90 hover:text-[#2B2521] hover:bg-[#2B2521]/08 [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]',
  )

  const navLinkHeroActive = clsx(
    navLinkBase,
    compact ? 'py-1.5 px-3 text-[12px]' : 'py-2 px-[18px]',
    'bg-transparent',
    isDarkHeroTop ? HOME_NAV_LINK_ACTIVE : 'font-semibold text-[#2B2521] [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]',
  )

  const navLinkGlassIdle = clsx(
    navLinkGlassBase,
    'text-neutral-700 hover:text-neutral-900 hover:bg-neutral-900/[0.05]',
    compact && 'py-1.5 px-2.5 text-[12px]',
  )

  const navLinkGlassActive = clsx(
    navLinkGlassBase,
    'text-neutral-950 font-semibold',
    'underline decoration-brand decoration-2 underline-offset-[10px]',
    compact && 'py-1.5 px-2.5 text-[12px]',
  )

  const iconButtonHero = clsx(
    'p-2 rounded-full transition-colors',
    isDarkHeroTop ? HOME_ICON_BTN : 'text-[#2B2521]/90 hover:text-[#2B2521] hover:bg-[#2B2521]/08 [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]',
  )

  const iconButtonGlass = clsx(
    'rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-neutral-900/[0.06] transition-colors',
    compact ? 'p-1.5' : 'p-2',
  )

  const wordmarkHero = clsx(
    'font-display text-[15px] font-bold tracking-tight transition-colors',
    isDarkHeroTop
      ? 'text-white [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]'
      : 'text-[#2B2521] [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]',
  )

  const logoCircleHero = clsx(
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-[0.72rem] font-extrabold tracking-tight transition-colors',
    isDarkHeroTop
      ? 'bg-white/20 text-white border border-white/35 [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]'
      : 'bg-[#2B2521]/12 text-[#2B2521] border border-[#2B2521]/28 [text-shadow:0_1px_8px_rgba(0,0,0,0.15)]',
  )

  const logoCircleGlass =
    'inline-flex h-9 w-9 items-center justify-center rounded-full text-[0.72rem] font-extrabold tracking-tight text-[#2a2623] bg-neutral-100 border border-neutral-200/90 transition-colors shadow-sm'

  const loginBtnClass = clsx(
    'rounded-full transition-colors font-semibold border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    compact ? 'text-[12px] py-1.5 px-3' : 'text-[13px] py-2 px-4',
    glassMode
      ? 'border-neutral-200 text-neutral-800 visited:text-neutral-800 bg-transparent hover:bg-neutral-900/[0.04] focus-visible:ring-neutral-400'
      : isDarkHeroTop
        ? 'border-white text-white visited:text-white bg-white/10 hover:bg-white/20 focus-visible:ring-white/35 [text-shadow:0_1px_8px_rgba(0,0,0,0.2)]'
        : 'border-[#2B2521]/45 text-[#2B2521] visited:text-[#2B2521] bg-transparent hover:bg-[#2B2521]/06 focus-visible:ring-[#2B2521]/25',
  )

  const signupBtnClass = clsx(
    'rounded-full transition-colors font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
    compact ? 'text-[12px] py-1.5 px-3' : 'text-[13px] py-2 px-4',
    glassMode
      ? 'bg-brand text-white visited:text-white border border-brand hover:bg-brand-hover shadow-sm focus-visible:ring-brand/40'
      : isDarkHeroTop
        ? 'bg-white text-[#2a2623] visited:text-[#2a2623] border border-white hover:bg-white/95 shadow-[0_1px_12px_rgba(0,0,0,0.2)] focus-visible:ring-white/50'
        : 'bg-[#2B2521] text-[#F7F1EA] border border-[#2B2521] hover:bg-[#3d3030] focus-visible:ring-[#2B2521]/35',
  )

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 w-full z-[1000]"
    >
      <div
        style={barStyle}
        className={clsx(
          'flex items-center justify-between gap-2 sm:gap-3 px-4 sm:px-8 lg:px-[48px] transition-[height,min-height,padding] duration-300 ease-out',
          compact ? 'h-[52px] min-h-[52px] sm:h-14' : 'h-[72px] min-h-[72px]',
          glassMode
            ? compact
              ? 'border-b border-neutral-200/90 shadow-[0_8px_32px_rgba(15,15,15,0.08)]'
              : 'border-b border-neutral-200/80 shadow-[0_4px_24px_rgba(15,15,15,0.06)]'
            : isDarkHeroTop || isLightTransparentHeroTop
              ? 'border-b border-transparent shadow-none'
              : 'border-b border-black/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.06)]',
        )}
      >
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 shrink-0 group">
          <span
            className={clsx(
              glassMode ? logoCircleGlass : logoCircleHero,
              compact && '!h-8 !w-8 !text-[0.62rem]',
            )}
          >
            TZ
          </span>
          <span
            className={clsx(
              glassMode
                ? 'font-display font-bold tracking-tight text-neutral-900'
                : wordmarkHero,
              compact ? 'text-[13px] sm:text-[14px]' : 'text-[15px]',
            )}
          >
            TrendZone
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center min-w-0 mx-3 overflow-x-auto scrollbar-none">
          {navLinks.map((link) => {
            const active = navLinkActive(link.href)
            return (
              <Link
                key={`${link.href}-${link.label}`}
                href={link.href}
                className={clsx(
                  glassMode ? (active ? navLinkGlassActive : navLinkGlassIdle) : active ? navLinkHeroActive : navLinkHeroIdle,
                )}
              >
                {link.label}
              </Link>
            )
          })}

          {canSeeAdmin && (
            <Link
              href="/admin"
              className={clsx(
                glassMode
                  ? adminActive
                    ? navLinkGlassActive
                    : navLinkGlassIdle
                  : adminActive
                    ? navLinkHeroActive
                    : navLinkHeroIdle,
                'flex items-center gap-1.5',
              )}
            >
              <Shield className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} /> Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/search"
            className={clsx(glassMode ? iconButtonGlass : iconButtonHero)}
            aria-label="Search"
          >
            <Search className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
          </Link>
          <Link
            href="/favorites"
            className={clsx('hidden sm:inline-flex', glassMode ? iconButtonGlass : iconButtonHero)}
            aria-label="Saved"
          >
            <Heart className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
          </Link>

          {mounted && isAuthenticated() ? (
            <div className="relative group">
              <button type="button" className={clsx(glassMode ? iconButtonGlass : iconButtonHero)}>
                <User className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
              </button>
              <div className="absolute right-0 mt-2 w-48 py-1.5 rounded-xl ring-1 ring-[#e3ddd4] bg-[#faf8f5] shadow-[0_12px_40px_-16px_rgba(42,38,35,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[1001]">
                <Link href="/account" className="block px-4 py-2 text-sm text-[#2a2623] hover:bg-[#ebe6e0]">
                  Account
                </Link>
                <Link href="/wardrobe" className="block px-4 py-2 text-sm text-[#2a2623] hover:bg-[#ebe6e0]">
                  My Wardrobe
                </Link>
                <Link href="/try-on" className="block px-4 py-2 text-sm text-[#2a2623] hover:bg-[#ebe6e0]">
                  Virtual Try-On
                </Link>
                {canSeeAdmin && (
                  <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-[#2a2623] hover:bg-[#ebe6e0]">
                    <Shield className="w-3.5 h-3.5" /> Admin
                  </Link>
                )}
                <div className="border-t border-[#e3ddd4] my-1" />
                <button
                  type="button"
                  onClick={logout}
                  className="w-full text-left px-4 py-2 text-sm text-[#2a2623] hover:bg-[#ebe6e0]"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login" className={loginBtnClass}>
                Login
              </Link>
              <Link href="/signup" className={signupBtnClass}>
                Sign up
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className={clsx('md:hidden', glassMode ? iconButtonGlass : iconButtonHero)}
            aria-label="Open menu"
          >
            {mobileOpen ? (
              <X className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
            ) : (
              <Menu className={compact ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
            )}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="md:hidden px-4 sm:px-8 lg:px-[48px] pb-3"
          >
            <motion.nav
              aria-label="Main"
              className={clsx(
                'rounded-2xl p-3 ring-1',
                glassMode
                  ? 'bg-white/95 backdrop-blur-xl ring-neutral-200/90 shadow-[0_12px_40px_-16px_rgba(15,15,15,0.12)]'
                  : isDarkHeroTop
                    ? 'bg-[rgba(42,38,35,0.88)] backdrop-blur-md ring-white/15 shadow-[0_8px_30px_rgba(0,0,0,0.2)]'
                    : 'bg-[#F9F8F6]/95 ring-[#e8e4df] shadow-[0_8px_30px_-18px_rgba(74,60,50,0.12)]',
              )}
            >
              <div className="grid grid-cols-2 gap-1 mb-2">
                {navLinks.map((link) => (
                  <Link
                    key={`${link.href}-${link.label}-m`}
                    href={link.href}
                    className={clsx(
                      'px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-center',
                      glassMode
                        ? navLinkActive(link.href)
                          ? navLinkGlassActive
                          : 'text-neutral-700 hover:bg-neutral-900/[0.05]'
                        : isDarkHeroTop
                          ? navLinkActive(link.href)
                            ? 'font-semibold bg-white/15 text-white visited:text-white ring-1 ring-white/25 [text-shadow:0_1px_8px_rgba(0,0,0,0.25)]'
                            : clsx(HOME_NAV_LINK_IDLE)
                          : navLinkActive(link.href)
                            ? 'font-semibold bg-[#2B2521]/10 text-[#2B2521] ring-1 ring-[#2B2521]/18'
                            : 'text-[#2B2521] hover:bg-black/[0.06]',
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
              {!isAuthenticated() && (
                <div
                  className={clsx(
                    'grid grid-cols-2 gap-2 pt-2 border-t',
                    glassMode ? 'border-neutral-200' : isDarkHeroTop ? 'border-white/15' : 'border-[#e3ddd4]',
                  )}
                >
                  <Link href="/login" className={clsx('text-center py-2.5 rounded-full font-semibold text-[13px]', loginBtnClass)}>
                    Login
                  </Link>
                  <Link href="/signup" className={clsx('text-center py-2.5 rounded-full font-semibold text-[13px]', signupBtnClass)}>
                    Sign up
                  </Link>
                </div>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
