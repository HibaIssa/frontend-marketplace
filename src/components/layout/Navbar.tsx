'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, User, Store, Shield, Heart, Shirt, Layers, Tag, Menu, X, GitCompare } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/auth'
import { useCompareStore } from '@/store/compare'

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

const ACTIVE_PILL = 'bg-[#5a1814] text-white shadow-sm'
const IDLE_PILL = 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'

export function Navbar() {
  const [mounted, setMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const navLinkActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || (href !== '/' && pathname.startsWith(href))
  }

  const { isAuthenticated, logout, user } = useAuthStore()
  const canSeeAdmin = mounted && isAuthenticated() && !!user?.is_admin
  const canSeeBusinessDashboard = mounted && isAuthenticated() && (user?.user_type === 'business' || user?.is_admin)
  const compareCount = useCompareStore((s) => s.productIds.length)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname, searchParams])

  return (
    <motion.header
      initial={{ y: -12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-8 pt-3">
        <div
          className={clsx(
            'flex items-center justify-between gap-3 h-14 px-4 sm:px-5 rounded-2xl transition-all duration-300',
            scrolled
              ? 'bg-[#f1ece9]/95 backdrop-blur-md shadow-[0_12px_34px_-20px_rgba(90,24,20,0.24)] ring-1 ring-[#d8cbc4]'
              : 'bg-[#f1ece9]/90 backdrop-blur-sm ring-1 ring-[#d8cbc4]/80'
          )}
        >
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#5a1814] text-white text-[0.72rem] font-extrabold tracking-tight">
              TZ
            </span>
            <span className="font-display text-[15px] font-bold text-[#100809] tracking-tight">TrendZone</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 flex-1 justify-center min-w-0 mx-3 overflow-x-auto scrollbar-none">
            {navLinks.map((link) => {
              const active = navLinkActive(link.href)
              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  className={clsx('px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors whitespace-nowrap', active ? ACTIVE_PILL : IDLE_PILL)}
                >
                  {link.label}
                </Link>
              )
            })}

            {canSeeAdmin && (
              <Link href="/admin" className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors', pathname.startsWith('/admin') ? ACTIVE_PILL : IDLE_PILL)}>
                <Shield className="w-3.5 h-3.5" /> Admin
              </Link>
            )}
            {canSeeBusinessDashboard && (
              <Link href="/dashboard" className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold transition-colors', pathname.startsWith('/dashboard') ? ACTIVE_PILL : IDLE_PILL)}>
                <Store className="w-3.5 h-3.5" /> Dashboard
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-1 shrink-0">
            <Link href="/search" className="p-2 rounded-full text-slate-800 hover:bg-slate-100 transition-colors" aria-label="Search"><Search className="w-[18px] h-[18px]" /></Link>
            <Link href="/favorites" className="hidden sm:inline-flex p-2 rounded-full text-slate-800 hover:bg-slate-100 transition-colors" aria-label="Saved"><Heart className="w-[18px] h-[18px]" /></Link>
            <Link href="/compare" className={clsx('relative hidden sm:inline-flex p-2 rounded-full transition-colors', pathname.startsWith('/compare') ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-200' : 'text-slate-800 hover:bg-slate-100')} aria-label="Compare">
              <GitCompare className="w-[18px] h-[18px]" />
              {mounted && compareCount > 0 && <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#5a1814] text-white text-[10px] font-bold px-1 ring-2 ring-white">{compareCount}</span>}
            </Link>
            <Link href="/products" className="p-2 rounded-full text-slate-800 hover:bg-slate-100 transition-colors" aria-label="Bag"><ShoppingBag className="w-[18px] h-[18px]" /></Link>

            {mounted && isAuthenticated() ? (
              <div className="relative group">
                <button type="button" className="p-2 rounded-full text-slate-800 hover:bg-slate-100 transition-colors"><User className="w-[18px] h-[18px]" /></button>
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
                <Link href="/login" className="text-[13px] py-2 px-4 rounded-full border border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors font-semibold">Login</Link>
                <Link href="/signup" className="text-[13px] py-2 px-4 rounded-full bg-[#5a1814] text-white hover:bg-[#43110e] transition-colors font-semibold">Sign up</Link>
              </div>
            )}

            <button type="button" onClick={() => setMobileOpen((v) => !v)} className="md:hidden p-2 rounded-full text-slate-800 hover:bg-slate-100 transition-colors" aria-label="Open menu">
              {mobileOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.nav initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="md:hidden mt-2 rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 p-3" aria-label="Main">
              <div className="grid grid-cols-2 gap-1 mb-2">
                {navLinks.map((link) => (
                  <Link key={`${link.href}-${link.label}-m`} href={link.href} className={clsx('px-3 py-2 rounded-xl text-sm font-semibold transition-colors', navLinkActive(link.href) ? ACTIVE_PILL : 'text-slate-700 hover:bg-slate-100')}>
                    {link.label}
                  </Link>
                ))}
              </div>
              {!isAuthenticated() && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <Link href="/login" className="text-center px-3 py-2 rounded-xl border border-slate-300 text-slate-800 font-semibold">Login</Link>
                  <Link href="/signup" className="text-center px-3 py-2 rounded-xl bg-[#5a1814] text-white font-semibold">Sign up</Link>
                </div>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}
