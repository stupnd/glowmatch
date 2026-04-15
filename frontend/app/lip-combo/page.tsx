"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, Reorder } from "framer-motion"
import { SparkleSticker } from "@/components/Stickers"

// ── Types ─────────────────────────────────────────────────────────────────────

interface LipProduct {
  id: string
  brand: string
  name: string
  shade: string
  imageUrl: string | null
  hexColor: string
}

interface SearchResult {
  brand: string
  name: string
  shade: string
  imageUrl: string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VIBE_TAGS = ["MLBB", "Glazed", "Vampire", "Bold", "Strawberry", "Naked", "Retro", "Blurred"]

const BG_COLORS = ["#FFF8F0", "#FFE8F5", "#F0F8FF", "#F5FFE8", "#FFF8E0", "#F8F0FF"]

const PRODUCT_COLORS = ["#E85D75", "#C4A8F0", "#FF8C69", "#6DBF8A", "#FFE566"]

const CARD_ROTATIONS = [-3, 3, -2, 2, -4]

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }

// ── Product image (with error fallback) ───────────────────────────────────────

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

// ── Card preview (captured by html2canvas) ─────────────────────────────────────

function CardPreview({
  products, vibeTag, cardBg, cardName,
}: {
  products: LipProduct[]
  vibeTag: string | null
  cardBg: string
  cardName: string
}) {
  const count = products.length

  return (
    <div
      id="lip-combo-card"
      style={{
        width: 400, height: 500,
        background: cardBg,
        borderRadius: 16, padding: 24,
        position: "relative", overflow: "hidden",
        fontFamily: "Georgia, serif",
        boxShadow: "4px 8px 32px rgba(0,0,0,0.12)",
        flexShrink: 0,
        display: "flex", flexDirection: "column",
      }}
    >
      {/* Washi tape */}
      <div style={{
        position: "absolute", top: 0, left: "50%",
        transform: "translateX(-50%)",
        width: 120, height: 22,
        background: "repeating-linear-gradient(45deg,rgba(200,160,240,0.5),rgba(200,160,240,0.5) 6px,rgba(255,229,102,0.5) 6px,rgba(255,229,102,0.5) 12px)",
        borderRadius: 2, opacity: 0.8,
      }} />

      {/* Card name */}
      <div style={{ textAlign: "center", marginTop: 20, marginBottom: 12 }}>
        <p style={{ fontSize: 22, fontWeight: 400, color: "#1A1612", marginBottom: 2 }}>
          {cardName || "my lip combo"}
        </p>
        <p style={{ fontSize: 10, color: "#6B5E57", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          by tinted
        </p>
      </div>

      {/* Products */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {count === 0 ? (
          <p style={{ color: "#6B5E57", fontSize: 13, textAlign: "center" }}>
            add products to see them here
          </p>
        ) : count <= 2 ? (
          <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "flex-end" }}>
            {products.map((p, i) => (
              <div key={p.id} style={{
                background: "white", padding: 8, borderRadius: 4,
                boxShadow: "2px 4px 12px rgba(0,0,0,0.10)",
                transform: `rotate(${CARD_ROTATIONS[i]}deg)`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              }}>
                <ProductImg product={p} size={90} />
                <p style={{ fontSize: 9, color: "#6B5E57", textAlign: "center", maxWidth: 80, lineHeight: 1.3 }}>
                  {p.shade || p.name.slice(0, 16)}
                </p>
              </div>
            ))}
          </div>
        ) : count <= 4 ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end" }}>
            {products.map((p, i) => (
              <div key={p.id} style={{
                background: "white", padding: 6, borderRadius: 4,
                boxShadow: "2px 4px 12px rgba(0,0,0,0.10)",
                transform: `rotate(${CARD_ROTATIONS[i]}deg)`,
                marginLeft: i > 0 ? -12 : 0,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                zIndex: i,
                position: "relative",
              }}>
                <ProductImg product={p} size={72} />
                <p style={{ fontSize: 8, color: "#6B5E57", textAlign: "center", maxWidth: 68, lineHeight: 1.3 }}>
                  {p.shade || p.name.slice(0, 14)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* Fan layout for 5 */
          <div style={{ position: "relative", width: 340, height: 190 }}>
            {products.map((p, i) => {
              const rots   = [-22, -11, 0, 11, 22]
              const lefts  = [10,  65, 135, 205, 260]
              return (
                <div key={p.id} style={{
                  position: "absolute",
                  left: lefts[i], top: 20,
                  background: "white", padding: 6, borderRadius: 4,
                  boxShadow: "2px 4px 12px rgba(0,0,0,0.10)",
                  transform: `rotate(${rots[i]}deg)`,
                  transformOrigin: "bottom center",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <ProductImg product={p} size={58} />
                  <p style={{ fontSize: 7, color: "#6B5E57", textAlign: "center", maxWidth: 56, lineHeight: 1.3 }}>
                    {p.shade || p.name.slice(0, 12)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Vibe tag */}
      {vibeTag && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <span style={{
            border: "1.5px dashed #E85D75", borderRadius: 9999,
            padding: "4px 16px", fontSize: 17,
            color: "#1A1612", background: "rgba(255,255,255,0.85)",
          }}>
            {vibeTag}
          </span>
        </div>
      )}

      {/* Color swatch strip */}
      {count > 0 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
          {products.map((p) => (
            <div key={p.id} style={{
              width: 16, height: 16, borderRadius: "50%",
              backgroundColor: p.hexColor, boxShadow: "1px 1px 4px rgba(0,0,0,0.15)",
            }} />
          ))}
        </div>
      )}

      {/* Attribution */}
      <div style={{ position: "absolute", bottom: 10, right: 14, display: "flex", alignItems: "center", gap: 3 }}>
        <span style={{ fontSize: 9, color: "#6B5E57" }}>made with tinted</span>
        <SparkleSticker size={10} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle" }} />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LipComboPage() {
  const router = useRouter()

  const [products,      setProducts]      = useState<LipProduct[]>([])
  const [vibeTag,       setVibeTag]       = useState<string | null>(null)
  const [cardBg,        setCardBg]        = useState(BG_COLORS[0])
  const [cardName,      setCardName]      = useState("my lip combo")
  const [searchQuery,   setSearchQuery]   = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching,   setIsSearching]   = useState(false)
  const [isGenerating,  setIsGenerating]  = useState(false)
  const [showToast,     setShowToast]     = useState(false)

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length < 3) { setSearchResults([]); return }
    const timer = setTimeout(() => runSearch(searchQuery), 500)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const runSearch = async (query: string) => {
    setIsSearching(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/search-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      setSearchResults(data.results ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const addProduct = (result: SearchResult) => {
    if (products.length >= 5) return
    setProducts((prev) => [...prev, {
      id:       uid(),
      brand:    result.brand,
      name:     result.name,
      shade:    result.shade,
      imageUrl: result.imageUrl,
      hexColor: PRODUCT_COLORS[products.length % PRODUCT_COLORS.length],
    }])
    setSearchQuery("")
    setSearchResults([])
  }

  const removeProduct = (id: string) =>
    setProducts((prev) => prev.filter((p) => p.id !== id))

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

  return (
    <div className="animated-bg min-h-screen px-4 py-12">
      <div className="max-w-5xl mx-auto">

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

          {/* ── LEFT PANEL ── */}
          <div className="flex flex-col gap-6">

            {/* Header */}
            <div>
              <h1 className="title-shimmer font-[family-name:var(--font-display)]"
                style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 400, marginBottom: 8 }}>
                build your lip recipe
              </h1>
              <span className="sticky-note" style={{ transform: "rotate(-1deg)", fontSize: 12 }}>
                add up to 5 products
              </span>
            </div>

            {/* Search */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="search a product... e.g. Rhode Peptide Gloss"
                style={{
                  width: "100%", boxSizing: "border-box",
                  border: "1.5px dashed var(--text-muted)",
                  borderRadius: 9999, padding: "12px 20px",
                  fontFamily: "var(--font-body)", fontSize: 14,
                  color: "var(--text)", background: "rgba(255,255,255,0.88)",
                  outline: "none",
                }}
              />

              {isSearching && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", marginTop: 8, paddingLeft: 8 }}>
                  searching...
                </p>
              )}

              <AnimatePresence>
                {searchResults.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 flex flex-col gap-2">
                    {searchResults.map((result, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="scrapbook-card"
                        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}
                      >
                        {result.imageUrl ? (
                          <img src={result.imageUrl} alt={result.name}
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
                            color: products.length >= 5 ? "var(--text-muted)" : "var(--rose)",
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
                      <div className="scrapbook-card"
                        style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "grab", userSelect: "none" }}>
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
                      background:  vibeTag === tag ? "var(--rose)"           : "rgba(255,255,255,0.80)",
                      color:       vibeTag === tag ? "#fff"                  : "var(--text-muted)",
                      borderColor: vibeTag === tag ? "var(--rose)"           : "var(--text-muted)",
                      fontWeight:  vibeTag === tag ? 600                     : 500,
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

            {/* Background color */}
            <div>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                card vibe
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {BG_COLORS.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setCardBg(hex)}
                    title={hex}
                    style={{
                      width: 32, height: 32, borderRadius: "50%",
                      backgroundColor: hex, cursor: "pointer", outline: "none",
                      border: cardBg === hex ? "2.5px solid #1A1612" : "2px solid rgba(0,0,0,0.10)",
                      boxShadow: cardBg === hex ? "0 0 0 3px white, 0 0 0 5px #1A1612" : "0 2px 6px rgba(0,0,0,0.12)",
                      transition: "box-shadow 0.15s",
                    }}
                  />
                ))}
              </div>
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
