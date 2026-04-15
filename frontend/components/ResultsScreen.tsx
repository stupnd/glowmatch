"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { Results, ShadeRec } from "@/app/page"
import { Sticker, SwatchSticker, type StickerProps } from "./Stickers"

interface Props {
  results: Results
  onReset: () => void
}

const CARD_ROTATIONS = ["-1deg", "0.5deg", "1.5deg"]

interface CardStickerConfig {
  type: StickerProps["type"]
  color: string
  rotate: number
}
const CARD_STICKERS: CardStickerConfig[] = [
  { type: "sparkle", color: "#E85D75", rotate: 10  },
  { type: "flower",  color: "#E8A020", rotate: -15 },
  { type: "star",    color: "#C4A8F0", rotate: 20  },
]

type Category = "foundation" | "concealer" | "blush" | "bronzer" | "lip"

const CATEGORIES: { key: Category; label: string }[] = [
  { key: "foundation", label: "Foundation" },
  { key: "concealer",  label: "Concealer"  },
  { key: "blush",      label: "Blush"      },
  { key: "bronzer",    label: "Bronzer"    },
  { key: "lip",        label: "Lip"        },
]

const CATEGORY_COLORS: Record<Category, { color: string; border: string; bg: string }> = {
  foundation: { color: "#CC5A30", border: "#FF8C69", bg: "rgba(255,140,105,0.12)" },
  concealer:  { color: "#B89A00", border: "#FFE566", bg: "rgba(255,229,102,0.15)" },
  blush:      { color: "#B83050", border: "#E85D75", bg: "rgba(232,93,117,0.12)"  },
  bronzer:    { color: "#A06010", border: "#E8A020", bg: "rgba(232,160,32,0.12)"  },
  lip:        { color: "#7B52C4", border: "#C4A8F0", bg: "rgba(196,168,240,0.14)" },
}

const PRODUCT_STICKERS: CardStickerConfig[] = [
  { type: "leaf",   color: "#6DBF8A", rotate: -8 },
  { type: "flower", color: "#E85D75", rotate: 12 },
]

function undertoneStyle(undertone: string): { color: string } {
  const u = undertone.toLowerCase()
  if (u.includes("warm")) return { color: "#CC5A30" }
  if (u.includes("cool")) return { color: "#7B52C4" }
  return                         { color: "#3D8A56" }
}

export default function ResultsScreen({ results, onReset }: Props) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const titleRef         = useRef<HTMLHeadingElement>(null)
  const heroRef          = useRef<HTMLDivElement>(null)
  const shadesHeadingRef = useRef<HTMLDivElement>(null)
  const mstCounterRef    = useRef<HTMLSpanElement>(null)

  const [activeCategory, setActiveCategory] = useState<Category>("foundation")

  useGSAP(
    () => {
      const tl = gsap.timeline()
      tl.fromTo(titleRef.current,         { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" })
        .fromTo(heroRef.current,          { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" }, "-=0.2")
        .fromTo(shadesHeadingRef.current, { opacity: 0, y: 20  }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" }, "-=0.1")

      const mstNum = parseInt(results.monk_scale.split("-")[1], 10)
      const obj = { v: 0 }
      gsap.to(obj, {
        v: mstNum, duration: 1.2, delay: 0.5, ease: "power2.out", snap: { v: 1 },
        onUpdate() {
          if (mstCounterRef.current)
            mstCounterRef.current.textContent = `MST-${Math.round(obj.v)}`
        },
      })
    },
    { scope: containerRef },
  )

  const utStyle = undertoneStyle(results.undertone)
  const activePicks: ShadeRec[] = results.recommendations[activeCategory] ?? []

  return (
    <div ref={containerRef} className="animated-bg min-h-screen py-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Page title */}
        <div className="text-center mb-10">
          <h1
            ref={titleRef}
            className="title-shimmer font-[family-name:var(--font-display)] opacity-0"
            style={{ fontSize: "clamp(32px, 6vw, 48px)", fontWeight: 400 }}
          >
            your tinted profile ✦
          </h1>
          <div className="flex justify-center mt-3">
            <span className="sticky-note" style={{ transform: "rotate(1deg)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              here&apos;s what we found
              <Sticker type="blob" size={18} color="#E8A020" rotate={10} style={{ display: "inline-block", verticalAlign: "middle" }} />
            </span>
          </div>
        </div>

        {/* Skin tone hero — polaroid */}
        <div
          ref={heroRef}
          className="polaroid relative flex items-center gap-8 mb-12 opacity-0"
        >
          <div className="washi-tape w-16 absolute -top-2 left-1/2 -translate-x-1/2 rotate-[1deg]" />

          {/* Swatch */}
          <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
            <motion.div
              className="absolute inset-0 rounded-sm"
              animate={{
                boxShadow: [
                  `0 0 22px 6px ${results.avg_hex}55`,
                  `0 0 40px 18px ${results.avg_hex}80`,
                  `0 0 22px 6px ${results.avg_hex}55`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 rounded-sm"
              style={{ backgroundColor: results.avg_hex, willChange: "clip-path" }}
              initial={{ clipPath: "circle(0% at 50% 50%)" }}
              animate={{ clipPath: "circle(50% at 50% 50%)" }}
              transition={{ duration: 0.85, ease: "easeOut", delay: 0.3 }}
            />
          </div>

          {/* Text info */}
          <div className="flex flex-col gap-2.5">
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Your Skin Tone
            </p>
            <span
              ref={mstCounterRef}
              style={{ fontFamily: "var(--font-display), serif", fontSize: 38, fontWeight: 400, color: "var(--text)", lineHeight: 1 }}
            >
              MST-0
            </span>
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.9, stiffness: 200 }}
              className="tag-pill self-start"
              style={{ color: utStyle.color }}
            >
              {results.undertone} undertone
            </motion.span>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.05em" }}
            >
              {results.avg_hex}
            </motion.p>
          </div>
        </div>

        {/* Shades heading */}
        <div ref={shadesHeadingRef} className="mb-10 opacity-0">
          {/* Swatch strip showing matched shade hex colors */}
          <div className="mb-4">
            <SwatchSticker colors={results.matched_shades.map((s) => s.hex)} />
          </div>

          <h2
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: 28, fontWeight: 400, color: "var(--text)", marginBottom: 8,
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            your shade picks
            <Sticker type="flower" size={20} color="#E85D75" rotate={15} style={{ display: "inline-block", verticalAlign: "middle" }} />
          </h2>

          <span className="sticky-note" style={{ transform: "rotate(-1deg)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            curated for your exact tone
            <Sticker type="leaf" size={14} color="#6DBF8A" rotate={-5} style={{ display: "inline-block", verticalAlign: "middle" }} />
          </span>
        </div>

        {/* Shade cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
          {results.matched_shades.map((shade, i) => (
            <ShadeCard
              key={shade.shade_name}
              shade={shade}
              index={i}
              rotation={CARD_ROTATIONS[i] ?? "0deg"}
              sticker={CARD_STICKERS[i]}
            />
          ))}
        </div>

        {/* ── Beauty picks section ── */}
        <div className="mb-12">
          {/* Section header */}
          <div className="mb-6">
            <h2
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: 28, fontWeight: 400, color: "var(--text)", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              your beauty picks
              <Sticker type="sparkle" size={20} color="#E8A020" rotate={10} style={{ display: "inline-block", verticalAlign: "middle" }} />
            </h2>
            <span className="sticky-note" style={{ transform: "rotate(0.8deg)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              across foundation, concealer, blush, bronzer + lip
              <Sticker type="ribbon" size={14} color="#E85D75" rotate={-5} style={{ display: "inline-block", verticalAlign: "middle" }} />
            </span>
          </div>

          {/* Category tabs */}
          <div
            className="flex gap-2 mb-8 overflow-x-auto pb-1"
            style={{ scrollbarWidth: "none" }}
          >
            {CATEGORIES.map(({ key, label }) => {
              const isActive = activeCategory === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className="tag-pill cursor-pointer flex-shrink-0"
                  style={{
                    background: isActive ? "var(--rose)" : "rgba(255,255,255,0.80)",
                    color:      isActive ? "#fff"        : "var(--text-muted)",
                    borderColor: isActive ? "var(--rose)" : "rgba(0,0,0,0.15)",
                    fontWeight: isActive ? 600 : 500,
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Product cards */}
          {activePicks.length === 0 ? (
            <div className="flex justify-center">
              <span className="sticky-note" style={{ transform: "rotate(-0.5deg)" }}>
                still analyzing... check back!
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {activePicks.map((rec, i) => (
                <ProductCard
                  key={`${rec.brand}-${rec.shade}-${i}`}
                  rec={rec}
                  category={activeCategory}
                  index={i}
                  sticker={PRODUCT_STICKERS[i % PRODUCT_STICKERS.length]}
                />
              ))}
            </div>
          )}
        </div>

        {/* Reset */}
        <div className="flex justify-center">
          <motion.button
            onClick={onReset}
            whileHover={{ backgroundColor: "var(--rose)", color: "#fff", borderStyle: "solid" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="tag-pill cursor-pointer"
            style={{
              color: "var(--rose)",
              borderColor: "var(--rose)",
              background: "rgba(255,255,255,0.90)",
              fontSize: 14,
              padding: "8px 20px",
              fontWeight: 600,
            }}
          >
            ↩ Try another photo
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ── ShadeCard ─────────────────────────────────────────────────────────────────

type Shade = Results["matched_shades"][0]

function ShadeCard({
  shade, index, rotation, sticker,
}: {
  shade: Shade
  index: number
  rotation: string
  sticker: CardStickerConfig
}) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.15, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -4 }}
      style={{ perspective: 1000, willChange: "transform", transform: `rotate(${rotation})` }}
      className="polaroid relative"
    >
      {/* Flat hex swatch */}
      <div className="w-full rounded-sm mb-3" style={{ height: 112, backgroundColor: shade.hex }} />

      {/* Corner sticker component */}
      <div className="absolute top-2 right-2 pointer-events-none select-none">
        <Sticker type={sticker.type} size={18} color={sticker.color} rotate={sticker.rotate} />
      </div>

      {/* Shade name */}
      <h3 style={{ fontFamily: "var(--font-display), serif", fontSize: 20, fontWeight: 400, color: "var(--text)", marginBottom: 6 }}>
        {shade.shade_name}
      </h3>

      {/* Description */}
      <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55, marginBottom: 10 }}>
        {shade.description}
      </p>

      {/* Recommendation as sticky-note */}
      <div className="sticky-note" style={{ transform: "rotate(1deg)", fontSize: 12, display: "block" }}>
        {shade.recommendation}
      </div>
    </motion.div>
  )
}

// ── ProductCard ───────────────────────────────────────────────────────────────

function ProductCard({
  rec, category, index, sticker,
}: {
  rec: ShadeRec
  category: Category
  index: number
  sticker: CardStickerConfig
}) {
  const catStyle = CATEGORY_COLORS[category]
  const rotation = index % 2 === 0 ? "-0.8deg" : "0.8deg"
  const noteRotation = index % 2 === 0 ? "0.8deg" : "-0.8deg"

  return (
    <motion.div
      key={category}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -3 }}
      className="polaroid relative"
      style={{ transform: `rotate(${rotation})` }}
    >
      {/* Corner sticker */}
      <div className="absolute top-2 right-2 pointer-events-none select-none">
        <Sticker type={sticker.type} size={18} color={sticker.color} rotate={sticker.rotate} />
      </div>

      {/* Brand */}
      <p style={{
        fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-muted)",
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4,
      }}>
        {rec.brand}
      </p>

      {/* Product name */}
      <h3 style={{
        fontFamily: "var(--font-display), serif", fontSize: 18,
        fontWeight: 400, color: "var(--text)", marginBottom: 8, lineHeight: 1.2,
      }}>
        {rec.product}
      </h3>

      {/* Shade pill + price */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span
          className="tag-pill"
          style={{
            color: catStyle.color,
            borderColor: catStyle.border,
            background: catStyle.bg,
            fontSize: 11, fontWeight: 600,
          }}
        >
          {rec.shade}
        </span>
        <span style={{
          fontFamily: "var(--font-body)", fontSize: 13,
          color: "var(--sage)", fontWeight: 600, letterSpacing: "0.05em",
        }}>
          {rec.price_range}
        </span>
      </div>

      {/* Why sticky-note */}
      <div
        className="sticky-note"
        style={{ transform: `rotate(${noteRotation})`, fontSize: 11, display: "block", lineHeight: 1.5 }}
      >
        {rec.why}
      </div>
    </motion.div>
  )
}
