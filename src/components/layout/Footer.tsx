'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto px-3 sm:px-5 lg:px-8 pb-6">
      <div className="tz-sheet  px-6 sm:px-10 py-12 lg:py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-10 lg:gap-12">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight tz-burgundy"
            >
              TrendZone
            </Link>
            <p className="mt-4 text-sm text-[#6d6863] leading-relaxed max-w-xs">
              Fashion discovery powered by AI: search, compare, wardrobe, and try-on in one seamless experience.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/#about" className="px-3 py-1.5 rounded-full text-[12px] font-semibold tz-burgundy bg-white/80 ring-1 ring-[#d8d3cf] hover:bg-[#f3efec] transition-all hover:-translate-y-0.5 transition-colors">
                About us
              </Link>
            </div>
          </div>

          <div>
            <h4 className="tz-eyebrow mb-4">Shop</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/products" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">All products</Link></li>
              <li><Link href="/search" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">Discover</Link></li>
              <li><Link href="/sales" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">Sale</Link></li>
              <li><Link href="/favorites" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">Favorites</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="tz-eyebrow mb-4">Tools</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/search?mode=shop" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">Shop the look</Link></li>
              <li><Link href="/wardrobe" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">Wardrobe</Link></li>
              <li><Link href="/try-on" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">Virtual try-on</Link></li>
              <li><Link href="/compare" className="text-[#6d6863] hover:text-[#2a2623] transition-colors">Compare</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#cdb8ac]/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#6d6863]">
          <p>&copy; {new Date().getFullYear()} TrendZone. All rights reserved.</p>
          <p className="font-semibold tz-burgundy">We don&apos;t follow trends — we create them.</p>
        </div>
      </div>
    </footer>
  )
}
