"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import MonkScaleBar from "./MonkScaleBar"
import type { Results, ShadeRec } from "@/app/page"

// ── Types ─────────────────────────────────────────────────────────────────────

type FoundationMatch = {
  brand:        string
  name:         string
  shade:        string
  price_tier:   string
  match_reason: string
}

type Tab      = "makeup" | "skincare"
type Category = "foundation" | "concealer" | "blush" | "bronzer" | "lip"

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "foundation", label: "Foundation" },
  { key: "concealer",  label: "Concealer"  },
  { key: "blush",      label: "Blush"      },
  { key: "bronzer",    label: "Bronzer"    },
  { key: "lip",        label: "Lip"        },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function undertoneColor(undertone: string) {
  const u = undertone.toLowerCase()
  if (u.includes("warm")) return "#c68642"
  if (u.includes("cool")) return "#7ea8c4"
  return "#82a682"
}

function priceLabel(price: string) {
  if (price === "$")   return { color: "#6dbf8a", label: "Drugstore" }
  if (price === "$$$") return { color: "#c4a8f0", label: "Luxury"    }
  return                      { color: "#c68642",  label: "Mid-range" }
}

// card width (w-52 = 208px) + gap (gap-4 = 16px)
const SHADE_CARD_STRIDE = 224

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  results: Results
  onReset: () => void
}

export default function ResultsScreen({ results, onReset }: Props) {
  const [activeTab,      setActiveTab]      = useState<Tab>("makeup")
  const [activeCategory, setActiveCategory] = useState<Category>("foundation")
  const [foundInput,     setFoundInput]     = useState("")
  const [isMatching,     setIsMatching]     = useState(false)
  const [foundMatches,   setFoundMatches]   = useState<FoundationMatch[] | null>(null)
  const [activeShadeIdx, setActiveShadeIdx] = useState(0)

  const shadeScrollRef = useRef<HTMLDivElement>(null)

  const mstLevel = parseInt(results.monk_scale.split("-")[1], 10)
  const utColor  = undertoneColor(results.undertone)
  const hasRecs  =
    results.recommendations != null &&
    Object.keys(results.recommendations).length > 0
  const picks: ShadeRec[] =
    (results.recommendations[activeCategory] as ShadeRec[] | undefined) ?? []
  const shadeCount = results.matched_shades.length

  // ── Shade scroll tracker ──────────────────────────────────────────────────

  useEffect(() => {
    const el = shadeScrollRef.current
    if (!el) return
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / SHADE_CARD_STRIDE)
      setActiveShadeIdx(Math.min(Math.max(idx, 0), shadeCount - 1))
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [shadeCount])

  const scrollToShade = useCallback((idx: number) => {
    shadeScrollRef.current?.scrollTo({ left: idx * SHADE_CARD_STRIDE, behavior: "smooth" })
    setActiveShadeIdx(idx)
  }, [])

  // ── Foundation matcher ────────────────────────────────────────────────────

  const handleFoundationMatch = useCallback(async () => {
    const input = foundInput.trim()
    if (!input || isMatching) return
    setIsMatching(true)
    setFoundMatches(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/match-foundation`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shade_input: input,
          mst_level:   mstLevel,
          undertone:   results.undertone,
        }),
      })
      const data = await res.json().catch(() => ({ matches: [] }))
      setFoundMatches(data.matches ?? [])
    } catch {
      setFoundMatches([])
    } finally {
      setIsMatching(false)
    }
  }, [foundInput, isMatching, mstLevel, results.undertone])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0d0d0d] pt-16 px-4 pb-24">
      <div className="max-w-xl mx-auto">

        {/* ══ Always-visible header: skin tone + MST bar ══ */}
        <div className="mb-12 space-y-14">

          {/* Skin tone card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-6"
          >
            <motion.div
              className="w-20 h-20 rounded-full flex-shrink-0"
              style={{
                backgroundColor: results.avg_hex,
                boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 0 32px 4px ${results.avg_hex}55`,
              }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
            />
            <div className="flex flex-col gap-2">
              <p className="text-white/25 text-[10px] tracking-[0.18em] uppercase">
                Your Skin Tone
              </p>
              <MstCounter level={mstLevel} />
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="text-xs px-2.5 py-0.5 rounded-full border self-start"
                style={{ color: utColor, borderColor: `${utColor}45` }}
              >
                {results.undertone}
              </motion.span>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-white/20 text-[11px] font-mono tracking-wider"
              >
                {results.avg_hex}
              </motion.p>
            </div>
          </motion.div>

          {/* Monk Scale bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <MonkScaleBar highlightLevel={mstLevel} />
          </motion.div>
        </div>

        {/* ══ Makeup | Skincare tab bar ══ */}
        <div className="flex gap-8 border-b border-white/[0.06] mb-12">
          {(["makeup", "skincare"] as const).map((tab) => {
            const active = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative pb-3 text-sm capitalize transition-colors"
                style={{ color: active ? "white" : "rgba(255,255,255,0.3)" }}
              >
                {tab}
                {active && (
                  <motion.div
                    layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-px bg-[#c68642]"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* ══ Tab content ══ */}
        <AnimatePresence mode="wait">

          {activeTab === "makeup" ? (

            <motion.div
              key="makeup"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-14"
            >

              {/* ── Foundation matcher ── */}
              <section>
                <p className="text-white/25 text-[10px] tracking-[0.18em] uppercase mb-5">
                  Match My Foundation
                </p>
                <div className="flex gap-2 mb-5">
                  <input
                    type="text"
                    value={foundInput}
                    onChange={(e) => setFoundInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFoundationMatch()}
                    placeholder="e.g. Maybelline Fit Me 220"
                    className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none transition-colors"
                    style={{ background: "#111", border: "1px solid rgba(255,255,255,0.09)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(198,134,66,0.4)" }}
                    onBlur={(e)  => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)" }}
                  />
                  <button
                    onClick={handleFoundationMatch}
                    disabled={isMatching || !foundInput.trim()}
                    className="flex-shrink-0 px-5 py-3 rounded-xl text-sm transition-colors disabled:opacity-35"
                    style={{
                      background: "rgba(198,134,66,0.1)",
                      border:     "1px solid rgba(198,134,66,0.35)",
                      color:      "#c68642",
                    }}
                  >
                    {isMatching ? (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-3 h-3 rounded-full border border-[#c68642]/50 border-t-[#c68642] animate-spin" />
                        Finding
                      </span>
                    ) : "Find matches"}
                  </button>
                </div>
                <AnimatePresence>
                  {foundMatches && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      {foundMatches.length === 0 ? (
                        <p className="text-white/20 text-sm text-center py-6">
                          No matches found — try a more specific shade name.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {foundMatches.map((m, i) => (
                            <FoundationMatchCard key={i} match={m} />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* ── Shade matches ── */}
              <section>
                <p className="text-white/25 text-[10px] tracking-[0.18em] uppercase mb-5">
                  Shade Matches — Fenty Pro Filt&apos;r
                </p>
                <div
                  ref={shadeScrollRef}
                  className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4"
                  style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none" }}
                >
                  {results.matched_shades.map((shade, i) => (
                    <motion.div
                      key={shade.shade_name}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * i + 0.2, duration: 0.4 }}
                      className="flex-shrink-0 w-52 rounded-xl overflow-hidden"
                      style={{
                        scrollSnapAlign: "start",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <div className="h-28" style={{ backgroundColor: shade.hex }} />
                      <div className="p-4 bg-[#111] space-y-2">
                        <p className="text-white text-sm font-medium">{shade.shade_name}</p>
                        <p className="text-white/40 text-xs leading-relaxed">{shade.description}</p>
                        {shade.recommendation && (
                          <p className="text-[#c68642] text-xs leading-relaxed">
                            {shade.recommendation}
                          </p>
                        )}
                        {shade.match_score != null && (
                          <div className="pt-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-white/20 tracking-widest uppercase">
                                Match confidence
                              </span>
                              <span className="text-[9px] text-white/30 font-mono">
                                {(shade.match_score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div
                              className="h-0.5 rounded-full overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.06)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width:      `${(shade.match_score * 100).toFixed(0)}%`,
                                  background: "rgba(198,134,66,0.55)",
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Scroll dots */}
                {shadeCount > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    {results.matched_shades.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => scrollToShade(i)}
                        aria-label={`Go to shade ${i + 1}`}
                        className="rounded-full transition-all duration-300"
                        style={{
                          height:     "5px",
                          width:      i === activeShadeIdx ? "20px" : "5px",
                          background: i === activeShadeIdx
                            ? "#c68642"
                            : "rgba(255,255,255,0.18)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* ── Beauty picks ── */}
              {hasRecs && (
                <section>
                  <p className="text-white/25 text-[10px] tracking-[0.18em] uppercase mb-4">
                    Beauty Picks
                  </p>

                  {/* Sticky category tabs */}
                  <div
                    className="sticky top-0 z-10 -mx-4 px-4 py-3 mb-6"
                    style={{
                      background:   "#0d0d0d",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div
                      className="flex gap-2 overflow-x-auto"
                      style={{ scrollbarWidth: "none" }}
                    >
                      {CATEGORIES.map(({ key, label }) => {
                        const active = activeCategory === key
                        return (
                          <button
                            key={key}
                            onClick={() => setActiveCategory(key)}
                            className="flex-shrink-0 text-xs rounded-full px-4 py-1.5 border transition-colors"
                            style={{
                              borderColor: active ? "#c68642" : "rgba(255,255,255,0.09)",
                              color:       active ? "#c68642" : "rgba(255,255,255,0.35)",
                              backgroundColor: active
                                ? "rgba(198,134,66,0.08)"
                                : "transparent",
                            }}
                          >
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Product grid */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCategory}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      {picks.length === 0 ? (
                        <p className="col-span-2 text-white/20 text-sm text-center py-8">
                          No picks in this category.
                        </p>
                      ) : (
                        picks.map((rec, i) => (
                          <ProductCard key={`${rec.brand}-${rec.shade}-${i}`} rec={rec} />
                        ))
                      )}
                    </motion.div>
                  </AnimatePresence>
                </section>
              )}

            </motion.div>

          ) : (

            /* ── Skincare tab ── */
            <motion.div
              key="skincare"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="rounded-2xl p-10 flex flex-col items-center gap-4 text-center"
                style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#111" }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/30">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                    <path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <p className="text-white/60 text-sm font-medium mb-2">
                    Skincare recommendations coming soon.
                  </p>
                  <p className="text-white/30 text-xs leading-relaxed max-w-xs mx-auto">
                    We&apos;ll suggest moisturizers, SPF, and treatments matched to your
                    skin tone and undertone.
                  </p>
                </div>
              </div>
            </motion.div>

          )}
        </AnimatePresence>

        {/* ── Try again ── */}
        <div className="flex justify-center mt-16">
          <button
            onClick={onReset}
            className="text-sm text-white/25 hover:text-white/55 transition-colors"
          >
            ← try another photo
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ rec }: { rec: ShadeRec }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null)

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
    const query  = `${rec.brand} ${rec.product} ${rec.shade}`
    fetch(`${apiUrl}/search-product`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ query }),
    })
      .then(r => r.json().catch(() => ({ results: [] })))
      .then(data => {
        const first = data.results?.[0]
        if (first) setImgSrc(first.cutoutUrl ?? first.imageUrl ?? null)
      })
      .catch(() => { /* leave placeholder */ })
  }, [rec.brand, rec.product, rec.shade])

  const { color, label } = priceLabel(rec.price_range)
  const initial  = rec.brand.trim()[0]?.toUpperCase() ?? "?"
  const shopUrl  = rec.url
    ? (rec.url.startsWith("http") ? rec.url : `https://${rec.url}`)
    : null

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#111" }}
    >
      {/* Image area */}
      <div
        className="w-full aspect-square flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{
          background:   "linear-gradient(135deg, rgba(198,134,66,0.18) 0%, rgba(198,134,66,0.04) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={rec.product}
            className="w-full h-full object-contain"
            onError={() => setImgSrc(null)}
          />
        ) : (
          <span
            className="font-light select-none"
            style={{ fontSize: "clamp(40px, 12vw, 64px)", color: "rgba(198,134,66,0.45)" }}
          >
            {initial}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2.5 flex-1">
        <p className="text-white/25 text-[10px] tracking-widest uppercase leading-none">
          {rec.brand}
        </p>
        <p className="text-white text-sm font-medium leading-snug">{rec.product}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[11px] border rounded-full px-2.5 py-0.5"
            style={{ color: "#c68642", borderColor: "rgba(198,134,66,0.28)" }}
          >
            {rec.shade}
          </span>
          <span className="text-[11px]" style={{ color }}>
            {rec.price_range} · {label}
          </span>
        </div>
        <p className="text-white/35 text-xs leading-relaxed flex-1">{rec.why}</p>

        {shopUrl ? (
          <a
            href={shopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-xs text-center py-2 rounded-lg transition-colors"
            style={{ border: "1px solid rgba(198,134,66,0.35)", color: "#c68642" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(198,134,66,0.1)" }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent" }}
          >
            Shop now →
          </a>
        ) : (
          <div
            className="mt-1 text-xs text-center py-2 rounded-lg"
            style={{ border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.15)" }}
          >
            Shop now →
          </div>
        )}
      </div>
    </div>
  )
}

// ── Foundation match card ─────────────────────────────────────────────────────

function FoundationMatchCard({ match }: { match: FoundationMatch }) {
  const { color, label } = priceLabel(match.price_tier)

  return (
    <div
      className="rounded-xl p-4 space-y-2.5"
      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "#111" }}
    >
      <p className="text-white/25 text-[10px] tracking-widest uppercase leading-none">
        {match.brand}
      </p>
      <p className="text-white text-sm font-medium leading-snug">{match.name}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-[11px] border rounded-full px-2.5 py-0.5"
          style={{ color: "#c68642", borderColor: "rgba(198,134,66,0.28)" }}
        >
          {match.shade}
        </span>
        <span className="text-[11px]" style={{ color }}>
          {match.price_tier} · {label}
        </span>
      </div>
      <p className="text-white/35 text-xs leading-relaxed">{match.match_reason}</p>
    </div>
  )
}

// ── Animated MST counter ──────────────────────────────────────────────────────

function MstCounter({ level }: { level: number }) {
  const [displayed, setDisplayed] = useState(1)

  useEffect(() => {
    const duration  = 800
    const startTime = performance.now()

    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(1 + (level - 1) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [level])

  return (
    <p className="text-white text-3xl font-light tracking-tight">
      MST-{displayed}
    </p>
  )
}
