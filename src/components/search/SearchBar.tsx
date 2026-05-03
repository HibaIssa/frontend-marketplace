'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search, X } from 'lucide-react'

interface SearchBarProps {
  variant?: 'default' | 'hero' | 'textSearch'
  placeholder?: string
  initialQuery?: string
  isLoading?: boolean
}

export function SearchBar({ variant = 'default', placeholder, initialQuery = '', isLoading = false }: SearchBarProps) {
  const [q, setQ] = useState(initialQuery)
  const router = useRouter()

  useEffect(() => {
    setQ(initialQuery)
  }, [initialQuery])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (q.trim()) {
      router.push(`/search?q=${encodeURIComponent(q.trim())}`)
    } else {
      router.push('/search')
    }
  }

  const isHero = variant === 'hero'
  const isTextSearch = variant === 'textSearch'

  if (isTextSearch) {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
        <div
          className="relative flex items-center h-14 sm:h-[3.75rem] rounded-full border border-[#e8e4df] bg-white shadow-[0_8px_40px_-12px_rgba(42,38,35,0.08)] transition-all duration-300 focus-within:border-[#d4cdc4] focus-within:shadow-[0_12px_48px_-14px_rgba(42,38,35,0.12)]"
        >
          <Search className="absolute left-5 sm:left-6 w-5 h-5 text-[#9c9590]" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder || 'Describe what you want in plain language…'}
            className="w-full h-full pl-14 sm:pl-[3.25rem] pr-24 sm:pr-28 bg-transparent rounded-full focus:outline-none text-[15px] sm:text-[16px] text-[#2a2623] placeholder:text-[#a39e98]"
          />
          <div className="absolute right-3 sm:right-4 flex items-center gap-1">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#9c9590]" aria-label="Searching" />
            ) : null}
            {q.length > 0 && !isLoading ? (
              <button
                type="button"
                onClick={() => {
                  setQ('')
                  router.push('/search')
                }}
                className="p-2 rounded-full text-[#9c9590] hover:bg-[#f3f1ee] hover:text-[#2a2623] transition-colors"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={`w-full ${isHero ? 'max-w-2xl' : 'max-w-xl mx-auto'}`}>
      <div
        className={`relative flex items-center rounded-2xl border transition-all duration-300
          ${isHero
            ? 'border-[#d8cbc4] bg-white/95 backdrop-blur-sm h-[3.5rem] sm:h-[4rem] shadow-lg shadow-brand/10 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 focus-within:shadow-xl focus-within:shadow-brand/15'
            : 'border-neutral-200 bg-white h-12 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/10 shadow-sm'
          }`}
      >
        <Search className={`absolute left-4 w-5 h-5 ${isHero ? 'text-orange-500' : 'text-neutral-400'}`} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder || 'Search "red summer dress", "casual sneakers"...'}
          className={`w-full pl-12 pr-[5.5rem] bg-transparent focus:outline-none
            ${isHero
              ? 'text-neutral-900 placeholder-neutral-400 text-base sm:text-lg'
              : 'text-neutral-800 placeholder-neutral-400 text-base'
            }`}
        />
        <button
          type="submit"
          disabled={isLoading}
          className={`absolute right-2 px-4 sm:px-5 py-2 rounded-xl text-sm font-semibold active:scale-[0.98] transition-all duration-200
            bg-brand text-white shadow-md shadow-brand/25 hover:bg-brand-hover disabled:opacity-70 disabled:pointer-events-none`}
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </span>
          ) : (
            'Search'
          )}
        </button>
      </div>
    </form>
  )
}
