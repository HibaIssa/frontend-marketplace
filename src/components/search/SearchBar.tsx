'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Search } from 'lucide-react'

interface SearchBarProps {
  variant?: 'default' | 'hero'
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

  return (
    <form onSubmit={handleSubmit} className={`w-full ${isHero ? 'max-w-2xl' : 'max-w-xl mx-auto'}`}>
      <div
        className={`relative flex items-center rounded-2xl border transition-all duration-300
          ${isHero
            ? 'border-[#d8cbc4] bg-white/95 backdrop-blur-sm h-[3.5rem] sm:h-[4rem] shadow-lg shadow-[#2a2623]/10 focus-within:border-[#99624E] focus-within:ring-4 focus-within:ring-[#2a2623]/12 focus-within:shadow-xl focus-within:shadow-[#2a2623]/15'
            : 'border-neutral-200 bg-white h-12 focus-within:border-[#cdb8ac] focus-within:ring-2 focus-within:ring-[#2a2623]/10 shadow-sm'
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
            ${isHero
              ? 'bg-gradient-to-r from-[#2a2623] to-[#99624E] text-white shadow-md shadow-[#2a2623]/25 hover:from-[#1a1816] hover:to-[#7d4b3a]'
              : 'bg-gradient-to-r from-[#2a2623] to-[#99624E] text-white hover:from-[#1a1816] hover:to-[#7d4b3a]'
            } disabled:opacity-70 disabled:pointer-events-none`}
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
