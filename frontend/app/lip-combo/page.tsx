"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { Sticker, SparkleSticker, FlowerSticker, BlobSticker } from "@/components/Stickers"

// ── Types ─────────────────────────────────────────────────────────────────────

type StickerType = "flower" | "sparkle" | "heart" | "star" | "leaf" | "blob" | "swatch" | "ribbon"

interface LipProduct {
  id: string
  brand: string
  name: string
  shade: string
  imageUrl: string | null
  cutoutUrl: string | null   // base64 transparent PNG from remove.bg
  hexColor: string
}

interface SearchResult {
  brand: string
  name: string
  shade: string
  imageUrl: string | null
  cutoutUrl: string | null
}

interface PlacedSticker {
  id: string
  type: StickerType
  color: string
  x: number
  y: number
  rotate: number
  size: number
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VIBE_TAGS = ["MLBB", "Glazed", "Vampire", "Bold", "Strawberry", "Naked", "Retro", "Blurred"]

const CARD_BG_OPTIONS = [
  { color: "#FFE566", label: "butter" },
  { color: "#C4A8F0", label: "lilac"  },
  { color: "#FF8C69", label: "peach"  },
  { color: "#6DBF8A", label: "sage"   },
  { color: "#E85D75", label: "rose"   },
  { color: "#1A1612", label: "noir"   },
]

const PRODUCT_COLORS = ["#E85D75", "#C4A8F0", "#FF8C69", "#6DBF8A", "#FFE566"]


const STICKER_OPTIONS: Array<{ type: StickerType; color: string; label: string }> = [
  { type: "flower",  color: "#E85D75", label: "flower-pink"    },
  { type: "flower",  color: "#FFE566", label: "flower-yellow"  },
  { type: "sparkle", color: "#E8A020", label: "sparkle-gold"   },
  { type: "sparkle", color: "#C4A8F0", label: "sparkle-lilac"  },
  { type: "heart",   color: "#E85D75", label: "heart-rose"     },
  { type: "heart",   color: "#FF8C69", label: "heart-peach"    },
  { type: "star",    color: "#E8A020", label: "star-gold"      },
  { type: "star",    color: "#C4A8F0", label: "star-lilac"     },
  { type: "leaf",    color: "#6DBF8A", label: "leaf-sage"      },
  { type: "blob",    color: "#FF8C69", label: "blob-peach"     },
  { type: "blob",    color: "#C4A8F0", label: "blob-lilac"     },
  { type: "ribbon",  color: "#E85D75", label: "ribbon-rose"    },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

function rndBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ── Product image (polaroid interior: imageUrl or fallback circle) ────────────
// Used inside a polaroid frame when no cutoutUrl is available.

function ProductImg({ product, size }: { product: LipProduct; size: number }) {
  const [err, setErr] = useState(false)
  if (product.imageUrl && !err) {
    return (
      <img
        src={product.imageUrl}
        alt={product.name}
        onError={() => setErr(true)}
        style={{ width: size, height: size, objectFit: "contain" }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: product.hexColor,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
    }}>
      {(product.name[0] ?? "?").toUpperCase()}
    </div>
  )
}

// ── Placed sticker (with hover × button) ─────────────────────────────────────

function PlacedStickerEl({ sticker, onRemove }: { sticker: PlacedSticker; onRemove: (id: string) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        position: "absolute",
        left:     sticker.x,
        top:      sticker.y,
        transform: `rotate(${sticker.rotate}deg)`,
        cursor:   "pointer",
        zIndex:   10,
        userSelect: "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onRemove(sticker.id)}
    >
      <Sticker type={sticker.type} color={sticker.color} size={sticker.size} />
      {hovered && (
        <div style={{
          position: "absolute", top: -5, right: -5,
          width: 16, height: 16, borderRadius: "50%",
          background: "rgba(0,0,0,0.75)", color: "white",
          fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
          lineHeight: 1, fontWeight: 700,
        }}>
          ×
        </div>
      )}
    </div>
  )
}

// ── Card preview ──────────────────────────────────────────────────────────────

function CardPreview({
  products, vibeTag, cardBg, cardName, cardNote, placedStickers, onRemoveSticker,
}: {
  products: LipProduct[]
  vibeTag: string | null
  cardBg: string
  cardName: string
  cardNote: string
  placedStickers: PlacedSticker[]
  onRemoveSticker: (id: string) => void
}) {
  const count     = products.length
  const isDark    = cardBg === "#1A1612"
  const textColor = isDark ? "white"                  : "#1A1612"
  const textMuted = isDark ? "rgba(255,255,255,0.55)" : "#6B5E57"

  return (
    <div
      id="lip-combo-card"
      style={{
        width: 400, height: 500,
        background: cardBg,
        borderRadius: 16, padding: 24,
        position: "relative", overflow: "hidden",
        boxShadow: "4px 8px 32px rgba(0,0,0,0.15)",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Paper texture overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        borderRadius: 16, zIndex: 1,
        background: "repeating-linear-gradient(45deg,rgba(0,0,0,1),rgba(0,0,0,1) 1px,transparent 1px,transparent 6px)",
        opacity: 0.03,
      }} />

      {/* Placed stickers */}
      {placedStickers.map((sticker) => (
        <PlacedStickerEl key={sticker.id} sticker={sticker} onRemove={onRemoveSticker} />
      ))}

      {/* Washi tape */}
      <div style={{
        position: "absolute", top: 0, left: "50%",
        transform: "translateX(-50%)",
        width: 120, height: 22,
        background: "repeating-linear-gradient(45deg,rgba(200,160,240,0.5),rgba(200,160,240,0.5) 6px,rgba(255,229,102,0.5) 6px,rgba(255,229,102,0.5) 12px)",
        borderRadius: 2, opacity: 0.8, zIndex: 2,
      }} />

      {/* Card name */}
      <div style={{ textAlign: "center", marginTop: 20, marginBottom: 10, position: "relative", zIndex: 2 }}>
        <p style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400, color: textColor, marginBottom: 2 }}>
          {cardName || "my lip combo"}
        </p>
        <p style={{ fontSize: 10, color: textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          by tinted
        </p>
      </div>

      {/* Products — scattered polaroid layout */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2 }}>
        {count === 0 ? (
          <p style={{ color: textMuted, fontSize: 13, textAlign: "center" }}>
            add products to see them here
          </p>
        ) : (
          <div style={{ position: "relative", width: 320, height: 220 }}>
            {products.map((p, i) => {
              const offsets = [
                { left: 10,  top: 20  },
                { left: 80,  top: 5   },
                { left: 150, top: 25  },
                { left: 220, top: 10  },
                { left: 120, top: 100 },
              ]
              const rotations = [-8, 3, -5, 7, -3]
              const pos = offsets[i] ?? { left: 10 + i * 60, top: 20 }
              const rot = rotations[i] ?? 0
              const label = p.shade || p.name.slice(0, 14)

              if (p.cutoutUrl) {
                // Floating cutout — no polaroid frame
                return (
                  <div key={p.id} style={{
                    position: "absolute",
                    left: pos.left, top: pos.top,
                    width: 90,
                    transform: `rotate(${rot}deg)`,
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    zIndex: i,
                  }}>
                    <img
                      src={p.cutoutUrl}
                      alt={p.name}
                      style={{
                        width: 70, height: 70, objectFit: "contain",
                        filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.20))",
                      }}
                    />
                    <p style={{
                      fontFamily: "Georgia, serif", fontSize: 9,
                      color: textMuted, textAlign: "center",
                      maxWidth: 80, lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis",
                      whiteSpace: "nowrap", width: "100%",
                    }}>
                      {label}
                    </p>
                  </div>
                )
              }

              // Polaroid frame (imageUrl or fallback circle)
              return (
                <div key={p.id} style={{
                  position: "absolute",
                  left: pos.left, top: pos.top,
                  width: 90,
                  background: "white",
                  padding: "8px 8px 10px",
                  borderRadius: 4,
                  boxShadow: "2px 4px 14px rgba(0,0,0,0.13)",
                  transform: `rotate(${rot}deg)`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  zIndex: i,
                }}>
                  <ProductImg product={p} size={70} />
                  <p style={{
                    fontFamily: "Georgia, serif", fontSize: 9,
                    color: "#6B5E57", textAlign: "center",
                    maxWidth: 80, lineHeight: 1.3,
                    overflow: "hidden", textOverflow: "ellipsis",
                    whiteSpace: "nowrap", width: "100%",
                  }}>
                    {label}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Vibe tag — centered, larger, stickers on each side */}
      {vibeTag && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 10, position: "relative", zIndex: 2 }}>
          <SparkleSticker size={16} color="#E8A020" />
          <span style={{
            border: `1.5px dashed ${isDark ? "rgba(255,255,255,0.55)" : "#E85D75"}`,
            borderRadius: 9999,
            padding: "6px 20px",
            fontSize: 18, fontWeight: 600,
            color: isDark ? "white" : "#1A1612",
            background: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.85)",
          }}>
            {vibeTag}
          </span>
          <SparkleSticker size={16} color="#E8A020" />
        </div>
      )}

      {/* Color swatch strip */}
      {count > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8, position: "relative", zIndex: 2 }}>
          {products.map((p) => (
            <div key={p.id} style={{
              width: 16, height: 16, borderRadius: "50%",
              backgroundColor: p.hexColor,
              boxShadow: "1px 1px 4px rgba(0,0,0,0.15)",
            }} />
          ))}
        </div>
      )}

      {/* Card note sticky-note */}
      {cardNote && (
        <div style={{
          position: "absolute", bottom: 20, left: 16,
          transform: "rotate(-2deg)", zIndex: 5,
          background: "#FFE566",
          borderRadius: 4,
          boxShadow: "2px 2px 6px rgba(0,0,0,0.12)",
          padding: "5px 10px",
          maxWidth: 160,
        }}>
          <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: 9, color: "#1A1612", lineHeight: 1.5, wordBreak: "break-word" }}>
            {cardNote}
          </p>
        </div>
      )}

      {/* Attribution */}
      <div style={{ position: "absolute", bottom: 10, right: 14, display: "flex", alignItems: "center", gap: 3, zIndex: 2 }}>
        <span style={{ fontSize: 9, color: textMuted }}>made with tinted</span>
        <SparkleSticker size={10} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle" }} />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LipComboPage() {
  const router = useRouter()

  const [products,       setProducts]       = useState<LipProduct[]>([])
  const [vibeTag,        setVibeTag]        = useState<string | null>(null)
  const [cardBg,         setCardBg]         = useState(CARD_BG_OPTIONS[0].color)
  const [cardName,       setCardName]       = useState("my lip combo")
  const [cardNote,       setCardNote]       = useState("")
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([])
  const [searchQuery,    setSearchQuery]    = useState("")
  const [searchResults,  setSearchResults]  = useState<SearchResult[]>([])
  const [searchError,    setSearchError]    = useState(false)
  const [noResults,      setNoResults]      = useState(false)
  const [isSearching,    setIsSearching]    = useState(false)
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [showToast,      setShowToast]      = useState(false)

  // Debounced search (300ms)
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([])
      setSearchError(false)
      setNoResults(false)
      return
    }
    const timer = setTimeout(() => runSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  const runSearch = async (query: string) => {
    setIsSearching(true)
    setSearchError(false)
    setNoResults(false)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/search-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      const data = await res.json()
      const results: SearchResult[] = data.results ?? []
      setSearchResults(results)
      if (results.length === 0) setNoResults(true)
    } catch {
      setSearchError(true)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const addProduct = (result: SearchResult) => {
    if (products.length >= 5) return
    setProducts((prev) => [...prev, {
      id:        uid(),
      brand:     result.brand,
      name:      result.name,
      shade:     result.shade,
      imageUrl:  result.imageUrl,
      cutoutUrl: result.cutoutUrl,
      hexColor:  PRODUCT_COLORS[products.length % PRODUCT_COLORS.length],
    }])
    setSearchQuery("")
    setSearchResults([])
    setNoResults(false)
    setSearchError(false)
  }

  const removeProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id))

  const addSticker = (opt: typeof STICKER_OPTIONS[number]) => {
    const newSticker: PlacedSticker = {
      id:     uid(),
      type:   opt.type,
      color:  opt.color,
      x:      rndBetween(20, 330),
      y:      rndBetween(80, 420),
      rotate: rndBetween(-20, 20),
      size:   32,
    }
    setPlacedStickers((prev) => [...prev, newSticker])
  }

  const removeSticker = (id: string) =>
    setPlacedStickers((prev) => prev.filter((s) => s.id !== id))

  const handleGenerate = async () => {
    const el = document.getElementById("lip-combo-card")
    if (!el) return
    setIsGenerating(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: null,
        logging: false,
      })
      const link = document.createElement("a")
      link.download = `${(cardName || "my-lip-combo").replace(/\s+/g, "-")}-tinted.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    } catch (e) {
      console.error("Canvas failed:", e)
    } finally {
      setIsGenerating(false)
    }
  }

  const textColorOnCard = cardBg === "#1A1612" ? "white" : "var(--text)"

  return (
    <div className="animated-bg paper-texture min-h-screen px-4 py-12">

      {/* ── Floating bg stickers ── */}
      <motion.div
        className="fixed pointer-events-none"
        style={{ top: "5rem", left: "2.5rem", zIndex: 0 }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <BlobSticker size={100} color="#E85D75" style={{ opacity: 0.08 }} />
      </motion.div>

      <motion.div
        className="fixed pointer-events-none"
        style={{ bottom: "8rem", right: "2.5rem", zIndex: 0 }}
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <FlowerSticker size={80} color="#FFE566" style={{ opacity: 0.07 }} />
      </motion.div>

      <motion.div
        className="fixed pointer-events-none"
        style={{ top: "50%", right: "1.25rem", zIndex: 0 }}
        animate={{ rotate: [0, 180, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      >
        <SparkleSticker size={50} color="#C4A8F0" style={{ opacity: 0.10 }} />
      </motion.div>

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Back */}
        <motion.button
          onClick={() => router.push("/")}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="tag-pill cursor-pointer mb-8"
          style={{ color: "var(--rose)", borderColor: "var(--rose)", background: "rgba(255,255,255,0.88)", fontWeight: 600, fontSize: 13, display: "inline-flex" }}
        >
          ← back
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">

          {/* ── LEFT PANEL (wrapped in scrapbook-card) ── */}
          <div
            className="scrapbook-card flex flex-col gap-6"
            style={{ padding: "1.5rem", borderRadius: "1rem" }}
          >
            {/* Header */}
            <div>
              <h1
                className="title-shimmer font-[family-name:var(--font-display)]"
                style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 400, marginBottom: 8 }}
              >
                build your lip recipe
              </h1>
              <span className="sticky-note" style={{ transform: "rotate(-1deg)", fontSize: 12 }}>
                add up to 5 products
              </span>
            </div>

            {/* Search */}
            <div>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim().length >= 3) {
                      runSearch(searchQuery)
                    }
                  }}
                  placeholder="search a product... e.g. Rhode Peptide Gloss"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    border: "1.5px dashed var(--text-muted)",
                    borderRadius: 9999, padding: "12px 44px 12px 20px",
                    fontFamily: "var(--font-body)", fontSize: 14,
                    color: "var(--text)", background: "rgba(255,255,255,0.88)",
                    outline: "none",
                  }}
                />
                {/* Spinning loader */}
                {isSearching && (
                  <div className="absolute right-4 pointer-events-none">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <SparkleSticker size={18} color="var(--rose)" />
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Error state */}
              {searchError && (
                <div className="mt-3 flex justify-start">
                  <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 12, color: "var(--rose)" }}>
                    couldn&apos;t find that product, try again!
                  </span>
                </div>
              )}

              {/* No results state */}
              {noResults && !isSearching && !searchError && (
                <div className="mt-3 flex justify-start">
                  <span className="sticky-note" style={{ transform: "rotate(0.5deg)", fontSize: 12 }}>
                    no results found — try a different name
                  </span>
                </div>
              )}

              {/* Search results */}
              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mt-3 flex flex-col gap-2"
                  >
                    {searchResults.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="scrapbook-card"
                        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}
                      >
                        {result.cutoutUrl ? (
                          <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <img
                              src={result.cutoutUrl}
                              alt={result.name}
                              style={{ width: 36, height: 36, objectFit: "contain", filter: "drop-shadow(1px 2px 4px rgba(0,0,0,0.15))" }}
                            />
                          </div>
                        ) : result.imageUrl ? (
                          <img
                            src={result.imageUrl}
                            alt={result.name}
                            style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, flexShrink: 0 }}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                          />
                        ) : (
                          <div style={{ width: 36, height: 36, borderRadius: "50%", background: PRODUCT_COLORS[i % PRODUCT_COLORS.length], flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {result.brand && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{result.brand} · </span>}
                            {result.name}
                          </p>
                          {result.shade && (
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>{result.shade}</p>
                          )}
                        </div>
                        <button
                          onClick={() => addProduct(result)}
                          disabled={products.length >= 5}
                          className="tag-pill cursor-pointer flex-shrink-0"
                          style={{
                            color:       products.length >= 5 ? "var(--text-muted)" : "var(--rose)",
                            borderColor: products.length >= 5 ? "var(--text-muted)" : "var(--rose)",
                            background: "transparent", fontSize: 18, padding: "1px 10px", lineHeight: 1,
                          }}
                        >
                          +
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Added products */}
            {products.length > 0 && (
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  your combo ({products.length}/5)
                </p>
                <Reorder.Group
                  axis="y"
                  values={products}
                  onReorder={setProducts}
                  style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {products.map((product) => (
                    <Reorder.Item key={product.id} value={product}>
                      <div
                        className="scrapbook-card"
                        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "grab", userSelect: "none" }}
                      >
                        <span style={{ color: "var(--text-muted)", fontSize: 18 }}>⠿</span>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: product.hexColor, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {product.brand && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{product.brand} · </span>}
                            {product.name}
                          </p>
                          {product.shade && (
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>{product.shade}</p>
                          )}
                        </div>
                        <button
                          onClick={() => removeProduct(product.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, padding: "0 4px", lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </div>
            )}

            {/* Vibe tags */}
            <div>
              <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 12, display: "inline-block", marginBottom: 10 }}>
                pick your vibe
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {VIBE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setVibeTag(vibeTag === tag ? null : tag)}
                    className="tag-pill cursor-pointer"
                    style={{
                      background:  vibeTag === tag ? "var(--rose)"  : "rgba(255,255,255,0.80)",
                      color:       vibeTag === tag ? "#fff"         : "var(--text-muted)",
                      borderColor: vibeTag === tag ? "var(--rose)"  : "var(--text-muted)",
                      fontWeight:  vibeTag === tag ? 600            : 500,
                      fontSize: 12,
                      transition: "all 0.15s",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Card name */}
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                name your combo
              </p>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px dashed var(--text-muted)",
                  borderRadius: 9999, padding: "10px 18px",
                  fontFamily: "var(--font-body)", fontSize: 14,
                  color: "var(--text)", background: "rgba(255,255,255,0.85)",
                  outline: "none", textAlign: "center",
                }}
              />
            </div>

            {/* Card note textarea */}
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                add a note
              </p>
              <textarea
                value={cardNote}
                onChange={(e) => setCardNote(e.target.value.slice(0, 80))}
                placeholder="write something... e.g. 'my everyday look 🌸'"
                maxLength={80}
                rows={2}
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px dashed var(--text-muted)",
                  borderRadius: 12, padding: "10px 14px",
                  fontFamily: "var(--font-body)", fontSize: 13,
                  color: "var(--text)", background: "rgba(255,255,255,0.82)",
                  outline: "none", resize: "none",
                  backdropFilter: "blur(10px)",
                  boxShadow: "4px 4px 0px rgba(0,0,0,0.08)",
                }}
              />
              <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-muted)", textAlign: "right", marginTop: 2 }}>
                {cardNote.length}/80
              </p>
            </div>

            {/* Background color */}
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                card vibe
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {CARD_BG_OPTIONS.map((opt) => (
                  <div key={opt.color} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <button
                      onClick={() => setCardBg(opt.color)}
                      title={opt.label}
                      style={{
                        width: 40, height: 40, borderRadius: "50%",
                        backgroundColor: opt.color, cursor: "pointer", outline: "none",
                        border: cardBg === opt.color ? "2.5px solid #1A1612" : "2px solid rgba(0,0,0,0.10)",
                        boxShadow: cardBg === opt.color ? "0 0 0 3px white, 0 0 0 5px #1A1612" : "0 2px 6px rgba(0,0,0,0.15)",
                        transition: "box-shadow 0.15s",
                      }}
                    />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--text-muted)", textAlign: "center" }}>
                      {opt.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sticker picker */}
            <div>
              <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 12, display: "inline-block", marginBottom: 10 }}>
                add stickers
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                {STICKER_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.label}
                    onClick={() => addSticker(opt)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.90 }}
                    title={opt.label}
                    style={{
                      width: 40, height: 40,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.75)",
                      border: "1.5px dashed rgba(0,0,0,0.12)",
                      borderRadius: 8, cursor: "pointer",
                      padding: 4,
                    }}
                  >
                    <Sticker type={opt.type} color={opt.color} size={24} />
                  </motion.button>
                ))}
              </div>
              {placedStickers.length > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>
                    {placedStickers.length} sticker{placedStickers.length !== 1 ? "s" : ""} placed — click to remove
                  </span>
                  <button
                    onClick={() => setPlacedStickers([])}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rose)", fontSize: 11, fontFamily: "var(--font-body)", textDecoration: "underline", padding: 0 }}
                  >
                    clear all
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="flex flex-col items-center gap-6">
            <div style={{ overflowX: "auto", maxWidth: "100%", display: "flex", justifyContent: "center" }}>
              <CardPreview
                products={products}
                vibeTag={vibeTag}
                cardBg={cardBg}
                cardName={cardName}
                cardNote={cardNote}
                placedStickers={placedStickers}
                onRemoveSticker={removeSticker}
              />
            </div>

            {/* Generate */}
            <motion.button
              onClick={handleGenerate}
              disabled={isGenerating}
              whileHover={!isGenerating ? { scale: 1.03, boxShadow: "0 10px 36px rgba(232,93,117,0.4)" } : {}}
              whileTap={!isGenerating ? { scale: 0.97 } : {}}
              style={{
                background: "var(--rose)", color: "#fff",
                border: "none", borderRadius: 9999,
                padding: "16px 36px",
                fontFamily: "var(--font-body)", fontSize: 16, fontWeight: 600,
                cursor: isGenerating ? "wait" : "pointer",
                opacity: isGenerating ? 0.7 : 1,
                display: "inline-flex", alignItems: "center", gap: 8,
                boxShadow: "0 6px 24px rgba(232,93,117,0.30)",
              }}
            >
              {isGenerating ? "generating..." : "generate my card"}
              {!isGenerating && (
                <SparkleSticker size={16} color="#fff" style={{ display: "inline-block", verticalAlign: "middle" }} />
              )}
            </motion.button>

            {/* Dark card note */}
            {cardBg === "#1A1612" && (
              <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 11 }}>
                noir mode — text auto-switches to white ✦
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full"
            style={{
              background: "rgba(44,24,16,0.88)", color: "#FAF7F2",
              fontFamily: "var(--font-body)", fontSize: 14,
              backdropFilter: "blur(8px)", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              whiteSpace: "nowrap",
            }}
          >
            saved! check your downloads ✦
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
