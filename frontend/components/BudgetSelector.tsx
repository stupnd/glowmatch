"use client"

import { motion } from "framer-motion"
import { Sticker } from "./Stickers"

interface Props {
  selected: string | null
  onSelect: (budget: string) => void
}

const OPTIONS = [
  {
    key:         "drugstore",
    symbol:      "$",
    label:       "drugstore",
    description: "Maybelline, NYX, e.l.f",
    sticker:     "flower" as const,
    stickerColor: "#6DBF8A",
    stickerRotate: 12,
  },
  {
    key:         "mid-range",
    symbol:      "$$",
    label:       "mid-range",
    description: "MAC, Urban Decay, Morphe",
    sticker:     "sparkle" as const,
    stickerColor: "#E8A020",
    stickerRotate: -10,
  },
  {
    key:         "high-end",
    symbol:      "$$$",
    label:       "high-end",
    description: "Fenty, NARS, Charlotte Tilbury",
    sticker:     "flower" as const,
    stickerColor: "#C4A8F0",
    stickerRotate: 15,
  },
  {
    key:         "all",
    symbol:      "✦",
    label:       "surprise me",
    description: "mix of everything",
    sticker:     "sparkle" as const,
    stickerColor: "#E85D75",
    stickerRotate: -8,
  },
]

export default function BudgetSelector({ selected, onSelect }: Props) {
  return (
    <div className="w-full">
      {/* Header sticky-note */}
      <div className="flex justify-center mb-5">
        <span
          className="sticky-note"
          style={{ transform: "rotate(-0.8deg)", display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          how are we shopping? 💸
          <Sticker
            type="sparkle"
            size={14}
            color="#E8A020"
            style={{ display: "inline-block", verticalAlign: "middle" }}
          />
        </span>
      </div>

      {/* 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const isSelected = selected === opt.key
          return (
            <motion.button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className="scrapbook-card relative text-left cursor-pointer"
              style={{
                padding: "14px 14px 12px",
                border: isSelected
                  ? "2px solid var(--rose)"
                  : "1.5px dashed rgba(0,0,0,0.15)",
                background: isSelected
                  ? "rgba(232,93,117,0.12)"
                  : "rgba(255,255,255,0.82)",
                transition: "border 0.2s, background 0.2s",
              }}
            >
              {/* Corner sticker */}
              <div className="absolute top-2 right-2 pointer-events-none select-none">
                <Sticker
                  type={opt.sticker}
                  size={16}
                  color={opt.stickerColor}
                  rotate={opt.stickerRotate}
                  style={{ opacity: isSelected ? 1 : 0.55 }}
                />
              </div>

              {/* Price symbol */}
              <p
                style={{
                  fontFamily: "var(--font-display), serif",
                  fontSize: 28,
                  fontWeight: 400,
                  color: isSelected ? "var(--rose)" : "var(--rose)",
                  lineHeight: 1,
                  marginBottom: 4,
                  opacity: isSelected ? 1 : 0.7,
                }}
              >
                {opt.symbol}
              </p>

              {/* Label */}
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: isSelected ? 700 : 600,
                  color: "var(--text)",
                  marginBottom: 2,
                }}
              >
                {opt.label}
              </p>

              {/* Description */}
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  lineHeight: 1.4,
                }}
              >
                {opt.description}
              </p>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
