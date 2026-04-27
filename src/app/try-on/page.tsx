'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import {
  Shirt,
  Upload,
  Loader2,
  Sparkles,
  Download,
  Share2,
  CheckCircle2,
  ArrowRight,
  User,
  RefreshCcw,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useTryOn } from '@/context/try-on-context'
import { TryOnCompleteStylePanel } from '@/components/try-on/TryOnCompleteStylePanel'
import { api } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'

const TRYON_SHOP_SESSION_KEY = 'styleai_tryon_shop_payload'

export default function TryOnPage() {
  const router = useRouter()
  const isAuth = useAuthStore((s) => s.isAuthenticated())
  const [personFile, setPersonFile] = useState<File | null>(null)
  const [garmentFile, setGarmentFile] = useState<File | null>(null)
  const [copyDone, setCopyDone] = useState(false)
  const [shopFromResultPending, setShopFromResultPending] = useState(false)
  const [shopFromResultError, setShopFromResultError] = useState<string | null>(null)
  const personRef = useRef<HTMLInputElement>(null)
  const garmentRef = useRef<HTMLInputElement>(null)

  const personPreview = useMemo(
    () => (personFile ? URL.createObjectURL(personFile) : null),
    [personFile],
  )
  const garmentPreview = useMemo(
    () => (garmentFile ? URL.createObjectURL(garmentFile) : null),
    [garmentFile],
  )

  useEffect(() => {
    return () => {
      if (personPreview) URL.revokeObjectURL(personPreview)
    }
  }, [personPreview])

  useEffect(() => {
    return () => {
      if (garmentPreview) URL.revokeObjectURL(garmentPreview)
    }
  }, [garmentPreview])

  const {
    jobId,
    job,
    jobStatus,
    polling,
    jobPollError,
    jobPollErr,
    stuckNotice,
    isSubmitting,
    submitError,
    submitTryOn,
    clearTryOn,
    lastGarmentFile,
  } = useTryOn()

  const resultUrl = job?.result_image_url
  const showCompleteStyle = jobStatus === 'completed' && !!resultUrl
  const garmentForStyle = lastGarmentFile ?? garmentFile

  const handleShareResult = async () => {
    if (!resultUrl) return
    try {
      await navigator.clipboard.writeText(resultUrl)
      setCopyDone(true)
      window.setTimeout(() => setCopyDone(false), 2000)
    } catch {
      window.open(resultUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleShopTheLook = useCallback(async () => {
    if (!resultUrl) {
      router.push('/search?mode=shop')
      return
    }
    if (shopFromResultPending) return
    setShopFromResultError(null)
    setShopFromResultPending(true)
    try {
      // Backend expects `url` (not `image_url`) for /api/images/search/url
      const res = await api.post<unknown>(endpoints.images.searchUrl, { url: resultUrl })
      const raw = res as Record<string, unknown>
      if (raw?.success === false) {
        const err = raw.error as { message?: string } | string | undefined
        const msg = typeof err === 'string' ? err : err?.message
        throw new Error(msg ?? 'Shop the look failed')
      }
      const sp = (raw.similarProducts ?? raw.data) as {
        byDetection?: unknown[]
        shopTheLookStats?: unknown
      } | undefined
      const byDetection = Array.isArray(sp?.byDetection ?? raw.byDetection) ? (sp?.byDetection ?? raw.byDetection) : []
      const image = raw.image as { width?: number; height?: number } | undefined
      const payload = {
        byDetection,
        shopImageMeta:
          image && typeof image.width === 'number' && typeof image.height === 'number'
            ? { width: image.width, height: image.height }
            : undefined,
        shopTheLookStats: sp?.shopTheLookStats,
        outfitImageUrl: resultUrl,
        source: 'try-on',
        savedAt: Date.now(),
      }
      sessionStorage.setItem(TRYON_SHOP_SESSION_KEY, JSON.stringify(payload))
      router.push('/search?mode=shop')
    } catch (e) {
      setShopFromResultError((e as Error)?.message ?? 'Could not analyze the generated image.')
    } finally {
      setShopFromResultPending(false)
    }
  }, [resultUrl, router, shopFromResultPending])

  if (!isAuth) {
    return (
      <div className="relative min-h-[70vh] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-100/80 via-white to-sky-100/60" />
        <div className="relative mx-auto max-w-lg px-4 py-24 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-600 shadow-lg shadow-blue-600/30">
            <Shirt className="h-10 w-10 text-white" />
          </div>
          <h2 className="font-display text-3xl font-bold text-neutral-900">Virtual try-on</h2>
          <p className="mt-3 text-neutral-600">Sign in to upload your photo and any garment — we&apos;ll blend them with AI.</p>
          <Link href="/login?next=%2Ftry-on" className="btn-primary mt-8 inline-flex items-center gap-2">
            Sign in to continue
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.15),transparent),radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(236,72,153,0.08),transparent)]" />

      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100/80 bg-white/90 px-3 py-1 text-xs font-semibold text-blue-900 shadow-sm backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                AI virtual fitting room
              </div>
              <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
                Virtual try-on
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-600">
                Upload your photo and a garment image. Processing runs in the background — use the floating chip or come
                back here anytime.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleShopTheLook()}
                disabled={shopFromResultPending}
                className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 shadow-sm transition hover:border-blue-100 hover:text-blue-900 disabled:opacity-60 disabled:pointer-events-none"
              >
                <Sparkles className="h-4 w-4" />
                {shopFromResultPending ? 'Analyzing look…' : 'Shop the look'}
              </button>
              {showCompleteStyle ? (
                <button
                  type="button"
                  onClick={() => {
                    clearTryOn()
                    setPersonFile(null)
                    setGarmentFile(null)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-100 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-blue-900 shadow-sm transition hover:bg-sky-100 hover:border-sky-200"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Try another image
                </button>
              ) : null}
            </div>
          </div>
          {shopFromResultError ? (
            <p className="mb-5 text-sm text-blue-700">{shopFromResultError}</p>
          ) : null}

          {jobStatus === 'completed' && resultUrl ? (
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-7">
                <div className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white shadow-xl shadow-blue-600/5 ring-1 ring-neutral-100">
                  <div className="flex items-center justify-between border-b border-neutral-100 bg-gradient-to-r from-emerald-50/80 to-white px-5 py-3">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                      <span className="text-sm font-semibold">Try-on complete</span>
                    </div>
                    <span className="text-xs font-medium text-neutral-400">Result preview</span>
                  </div>
                  <div className="relative aspect-[3/4] max-h-[min(78vh,820px)] w-full bg-neutral-100">
                    <Image src={resultUrl} alt="Try-on result" fill className="object-cover" unoptimized priority />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 lg:col-span-5">
                <div className="rounded-2xl border border-neutral-200/80 bg-white/90 p-5 shadow-lg shadow-neutral-200/40 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Actions</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <a
                      href={resultUrl}
                      download="styleai-try-on.jpg"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:opacity-95"
                    >
                      <Download className="h-4 w-4" />
                      Open / save image
                    </a>
                    <button
                      type="button"
                      onClick={() => void handleShareResult()}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:border-blue-100 hover:bg-sky-50/50"
                    >
                      <Share2 className="h-4 w-4" />
                      {copyDone ? 'Link copied' : 'Copy image URL'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        clearTryOn()
                        setPersonFile(null)
                        setGarmentFile(null)
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-blue-900 transition hover:bg-sky-100 hover:border-sky-200"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Try another image
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-neutral-500">
                    Tip: copy the URL to share with friends, or save from the opened tab if your browser blocks downloads
                    for remote images.
                  </p>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-gradient-to-b from-white to-sky-50/30 p-6 shadow-md shadow-blue-600/5">
                  <TryOnCompleteStylePanel
                    garmentFile={garmentForStyle}
                    jobId={jobId}
                    enabled={showCompleteStyle}
                  />
                </div>

                <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-5">
                  <p className="text-sm font-medium text-neutral-800">Keep shopping</p>
                  <p className="mt-1 text-xs text-neutral-500">Browse pieces that match your vibe.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/products" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-900 shadow-sm ring-1 ring-neutral-200 hover:ring-blue-100">
                      Shop all
                    </Link>
                    <Link href="/sales" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-blue-800 shadow-sm ring-1 ring-neutral-200 hover:ring-blue-100">
                      Sale
                    </Link>
                    <Link href="/search" className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-200 hover:ring-blue-100">
                      Discover
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : jobStatus === 'failed' ? (
            <div className="max-w-xl rounded-2xl border border-blue-100 bg-sky-50/80 p-8 shadow-lg">
              <p className="font-display text-lg font-bold text-blue-950">Try-on couldn&apos;t finish</p>
              <p className="mt-2 text-sm text-red-600">{job?.error_message ?? 'Unknown error'}</p>
              <button type="button" onClick={() => clearTryOn()} className="btn-primary mt-6">
                Start over
              </button>
            </div>
          ) : jobPollError && jobId ? (
            <div className="max-w-xl rounded-2xl border border-blue-100 bg-white p-8 shadow-lg">
              <p className="font-medium text-blue-950">Couldn&apos;t load try-on status</p>
              <p className="mt-2 text-sm text-neutral-600">
                {(jobPollErr as Error)?.message ?? 'Check your connection and try again.'}
              </p>
              <p className="mt-3 text-xs text-neutral-500">
                If this persists, the job may belong to a different account or the server may be misconfigured.
              </p>
              <button type="button" onClick={() => clearTryOn()} className="btn-secondary mt-6">
                Start over
              </button>
            </div>
          ) : jobId && (polling || jobStatus === 'processing' || jobStatus === 'pending') ? (
            <div className="mx-auto max-w-lg rounded-3xl border border-sky-100 bg-white p-12 text-center shadow-xl shadow-blue-600/10">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
              </div>
              <p className="font-display text-xl font-bold text-neutral-900">Processing your try-on</p>
              <p className="mt-2 text-sm text-neutral-500">Usually 30–60 seconds. Safe to browse the store meanwhile.</p>
              {stuckNotice && (
                <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  Still waiting? The server may need a longer timeout. Try starting over or try again later.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-10">
              <div className="flex flex-wrap gap-2 text-xs font-medium text-neutral-500">
                <span className="rounded-full bg-sky-100 px-3 py-1 text-blue-950">1 · Your photo</span>
                <span className="rounded-full bg-neutral-100 px-3 py-1">2 · Garment</span>
                <span className="rounded-full bg-neutral-100 px-3 py-1">3 · Generate</span>
              </div>

              <input
                ref={personRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setPersonFile(e.target.files?.[0] || null)}
              />
              <input
                ref={garmentRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setGarmentFile(e.target.files?.[0] || null)}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => personRef.current?.click()}
                  className="group relative overflow-hidden rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-8 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md hover:shadow-blue-600/10"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-blue-800 transition group-hover:bg-blue-800 group-hover:text-white">
                    <User className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-neutral-900">Your photo</h3>
                  <p className="mt-1 text-sm text-neutral-500">Full-body or upper-body, good lighting.</p>
                  {personPreview ? (
                    <div className="relative mt-6 aspect-[3/4] w-full max-w-[200px] overflow-hidden rounded-2xl bg-neutral-100">
                      <Image src={personPreview} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <Upload className="h-4 w-4" />
                      Choose file
                    </div>
                  )}
                  {personFile && (
                    <p className="mt-3 truncate text-xs text-neutral-400" title={personFile.name}>
                      {personFile.name}
                    </p>
                  )}
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => garmentRef.current?.click()}
                  className="group relative overflow-hidden rounded-3xl border-2 border-dashed border-neutral-200 bg-white p-8 text-left shadow-sm transition hover:border-sky-200 hover:shadow-md hover:shadow-blue-600/10"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-blue-800 transition group-hover:bg-blue-800 group-hover:text-white">
                    <Shirt className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-neutral-900">Garment</h3>
                  <p className="mt-1 text-sm text-neutral-500">Flat lay or product shot works best.</p>
                  {garmentPreview ? (
                    <div className="relative mt-6 aspect-square w-full max-w-[200px] overflow-hidden rounded-2xl bg-neutral-100">
                      <Image src={garmentPreview} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-blue-800">
                      <Upload className="h-4 w-4" />
                      Choose file
                    </div>
                  )}
                  {garmentFile && (
                    <p className="mt-3 truncate text-xs text-neutral-400" title={garmentFile.name}>
                      {garmentFile.name}
                    </p>
                  )}
                </motion.button>
              </div>

              {personFile && garmentFile && !jobId && (
                <div className="flex flex-col items-start gap-4 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50/80 to-sky-50/50 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-neutral-700">
                    Ready when you are — we&apos;ll queue a job and keep it synced while you browse.
                  </p>
                  <button
                    type="button"
                    onClick={() => submitTryOn(personFile, garmentFile)}
                    disabled={isSubmitting}
                    className="inline-flex min-w-[200px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-800 to-blue-800 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/30 transition hover:opacity-95 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Start try-on
                      </>
                    )}
                  </button>
                </div>
              )}
              {submitError && (
                <p className="text-sm text-blue-700">{submitError.message}</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
