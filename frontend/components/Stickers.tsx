import React from "react"

// Drop shadow applied to every sticker SVG
const SHADOW = "drop-shadow(1px 2px 3px rgba(0,0,0,0.15))"

// ── Shared types ──────────────────────────────────────────────────────────────

interface BaseProps {
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

// ── Path helpers ──────────────────────────────────────────────────────────────

/** Standard n-pointed star polygon path */
function starPathD(
  cx: number, cy: number,
  outerR: number, innerR: number,
  numPoints: number,
): string {
  const pts: string[] = []
  for (let i = 0; i < numPoints * 2; i++) {
    const angle = (i * Math.PI) / numPoints - Math.PI / 2
    const r = i % 2 === 0 ? outerR : innerR
    pts.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`)
  }
  return "M " + pts.join(" L ") + " Z"
}

/** 8-point sparkle: 4 long arms (N/E/S/W) + 4 shorter diagonal arms */
function sparklePathD(
  cx: number, cy: number,
  R: number, r: number, rv: number,
): string {
  const pts: string[] = []
  for (let i = 0; i < 8; i++) {
    const tipAngle = (i * 45 - 90) * (Math.PI / 180)
    const valAngle = (i * 45 - 90 - 22.5) * (Math.PI / 180)
    const tipR = i % 2 === 0 ? R : r
    pts.push(
      `${(cx + rv * Math.cos(valAngle)).toFixed(2)},${(cy + rv * Math.sin(valAngle)).toFixed(2)}`,
      `${(cx + tipR * Math.cos(tipAngle)).toFixed(2)},${(cy + tipR * Math.sin(tipAngle)).toFixed(2)}`,
    )
  }
  return "M " + pts.join(" L ") + " Z"
}

// ── Individual sticker components ─────────────────────────────────────────────

/** 5-petal daisy — petals rotate 72° apart, slightly darker center */
export function FlowerSticker({ size = 32, color = "#E85D75", className, style }: BaseProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ color, filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="50" cy="27" rx="10" ry="22"
          fill="currentColor"
          opacity={0.88}
          transform={`rotate(${angle},50,50)`}
        />
      ))}
      {/* Center — brightness filter makes it slightly darker */}
      <circle cx="50" cy="50" r="15" fill="currentColor" style={{ filter: "brightness(0.76)" }} />
      {/* Small white glint */}
      <circle cx="50" cy="50" r="5.5" fill="white" opacity={0.35} />
    </svg>
  )
}

/** 8-point sparkle/glint — 4 long arms + 4 shorter diagonal arms */
export function SparkleSticker({ size = 32, color = "#E8A020", className, style }: BaseProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ color, filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d={sparklePathD(50, 50, 45, 22, 7)} fill="currentColor" />
    </svg>
  )
}

/** Chunky filled heart */
export function HeartSticker({ size = 32, color = "#E85D75", className, style }: BaseProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ color, filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path
        d="M 50 77 C 50 77, 11 54, 11 30 C 11 12, 29 7, 50 27 C 71 7, 89 12, 89 30 C 89 54, 50 77, 50 77 Z"
        fill="currentColor"
      />
      {/* Subtle glint */}
      <ellipse cx="36" cy="27" rx="7" ry="5" fill="white" opacity={0.22} transform="rotate(-30,36,27)" />
    </svg>
  )
}

/** Classic 5-point star, slightly rounded feel */
export function StarSticker({ size = 32, color = "#FFE566", className, style }: BaseProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ color, filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d={starPathD(50, 50, 45, 19, 5)} fill="currentColor" />
      {/* Glint on top-left arm */}
      <circle cx="42" cy="28" r="4" fill="white" opacity={0.28} />
    </svg>
  )
}

/** Leaf with center vein, naturally tilted */
export function LeafSticker({ size = 32, color = "#6DBF8A", className, style }: BaseProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ color, filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <g transform="rotate(28,50,50)">
        <ellipse cx="50" cy="50" rx="21" ry="39" fill="currentColor" opacity={0.92} />
        {/* Center vein */}
        <line x1="50" y1="13" x2="50" y2="87" stroke="white" strokeWidth={1.8} opacity={0.45} strokeLinecap="round" />
        {/* Side veins */}
        <line x1="50" y1="37" x2="37" y2="30" stroke="white" strokeWidth={1} opacity={0.3} strokeLinecap="round" />
        <line x1="50" y1="37" x2="63" y2="30" stroke="white" strokeWidth={1} opacity={0.3} strokeLinecap="round" />
        <line x1="50" y1="54" x2="35" y2="48" stroke="white" strokeWidth={1} opacity={0.3} strokeLinecap="round" />
        <line x1="50" y1="54" x2="65" y2="48" stroke="white" strokeWidth={1} opacity={0.3} strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** Organic paint-splat blob — good as a background accent */
export function BlobSticker({ size = 32, color = "#C4A8F0", className, style }: BaseProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ color, filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path
        d="M 58 9 C 78 7, 93 22, 91 43 C 94 64, 80 85, 60 87 C 39 91, 11 79, 9 58 C 5 36, 17 9, 38 9 C 45 5, 53 9, 58 9 Z"
        fill="currentColor"
        opacity={0.9}
      />
      <circle cx="35" cy="32" r="5" fill="white" opacity={0.18} />
    </svg>
  )
}

/** Row of colored paint-chip swatch rectangles */
interface SwatchProps {
  colors: string[]
  className?: string
  style?: React.CSSProperties
}

export function SwatchSticker({ colors, className, style }: SwatchProps) {
  const W = 28, H = 36, GAP = 3, RX = 5
  const totalW = Math.max(1, colors.length) * W + Math.max(0, colors.length - 1) * GAP

  return (
    <svg
      width={totalW} height={H}
      viewBox={`0 0 ${totalW} ${H}`}
      fill="none"
      className={className}
      style={{ filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {colors.map((c, i) => (
        <rect
          key={i}
          x={i * (W + GAP)} y={0}
          width={W} height={H}
          rx={RX} ry={RX}
          fill={c}
        />
      ))}
    </svg>
  )
}

/** Decorative bow/ribbon — two loops meeting at center */
export function RibbonSticker({ size = 32, color = "#E85D75", className, style }: BaseProps) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      style={{ color, filter: SHADOW, display: "inline-block", flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      {/* Left loop */}
      <path
        d="M 50 50 C 42 35, 18 27, 15 42 C 11 57, 36 63, 50 50 Z"
        fill="currentColor"
        opacity={0.88}
      />
      {/* Right loop */}
      <path
        d="M 50 50 C 58 35, 82 27, 85 42 C 89 57, 64 63, 50 50 Z"
        fill="currentColor"
        opacity={0.88}
      />
      {/* Center knot */}
      <ellipse cx="50" cy="50" rx="8" ry="10" fill="currentColor" style={{ filter: "brightness(0.80)" }} />
    </svg>
  )
}

// ── Generic <Sticker> dispatcher ──────────────────────────────────────────────

export interface StickerProps {
  type: "flower" | "sparkle" | "heart" | "star" | "leaf" | "blob" | "swatch" | "ribbon"
  size?: number
  color?: string
  rotate?: number
  className?: string
  style?: React.CSSProperties
  colors?: string[]
}

export function Sticker({ type, size = 32, color, rotate, className, style, colors }: StickerProps) {
  const rotateStyle: React.CSSProperties =
    rotate !== undefined ? { transform: `rotate(${rotate}deg)` } : {}
  const merged: React.CSSProperties = { ...rotateStyle, ...style }

  switch (type) {
    case "flower":  return <FlowerSticker  size={size} color={color} className={className} style={merged} />
    case "sparkle": return <SparkleSticker size={size} color={color} className={className} style={merged} />
    case "heart":   return <HeartSticker   size={size} color={color} className={className} style={merged} />
    case "star":    return <StarSticker    size={size} color={color} className={className} style={merged} />
    case "leaf":    return <LeafSticker    size={size} color={color} className={className} style={merged} />
    case "blob":    return <BlobSticker    size={size} color={color} className={className} style={merged} />
    case "swatch":  return <SwatchSticker  colors={colors ?? []}     className={className} style={merged} />
    case "ribbon":  return <RibbonSticker  size={size} color={color} className={className} style={merged} />
    default:        return null
  }
}
