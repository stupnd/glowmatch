"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence, Reorder, useMotionValue } from "framer-motion"
import { Sticker, SparkleSticker, FlowerSticker, BlobSticker } from "@/components/Stickers"

// ── Types ─────────────────────────────────────────────────────────────────────

type Tool = "move" | "draw" | "text" | "eraser"
type BrushSize = "S" | "M" | "L"
type StickerType = "flower" | "sparkle" | "heart" | "star" | "leaf" | "blob" | "swatch" | "ribbon"

interface LipProduct {
  id: string
  brand: string
  name: string
  shade: string
  imageUrl: string | null
  cutoutUrl: string | null
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

interface TextElement {
  id: string
  content: string
  x: number
  y: number
  fontSize: number
  color: string
  fontFamily: "serif" | "sans"
}

interface Stroke {
  id: string
  points: Array<{ x: number; y: number }>
  color: string
  size: number
  isEraser: boolean
}

interface CardSnapshot {
  products: LipProduct[]
  placedStickers: PlacedSticker[]
  textElements: TextElement[]
  strokes: Stroke[]
  vibeTag: string | null
  cardBg: string
  cardName: string
  cardNote: string
  productPositions: Record<string, { x: number; y: number }>
  stickerPositions: Record<string, { x: number; y: number }>
  textPositions: Record<string, { x: number; y: number }>
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

const DRAW_COLORS = ["#E85D75", "#E8A020", "#C4A8F0", "#6DBF8A", "#1A1612", "#ffffff"]
const BRUSH_SIZES: Record<BrushSize, number> = { S: 2, M: 4, L: 8 }

const DEFAULT_PRODUCT_POSITIONS = [
  { x: 10,  y: 20  },
  { x: 80,  y: 5   },
  { x: 150, y: 25  },
  { x: 220, y: 10  },
  { x: 120, y: 100 },
]

const PRODUCT_ROTATIONS = [-8, 3, -5, 7, -3]

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2) }
function rndBetween(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }

function renderStrokes(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  for (const stroke of strokes) {
    if (stroke.points.length < 2) continue
    ctx.save()
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.lineWidth = stroke.size
    if (stroke.isEraser) {
      ctx.globalCompositeOperation = "destination-out"
      ctx.strokeStyle = "rgba(0,0,0,1)"
    } else {
      ctx.globalCompositeOperation = "source-over"
      ctx.strokeStyle = stroke.color
    }
    ctx.beginPath()
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y)
    }
    ctx.stroke()
    ctx.restore()
  }
}

// ── ProductImg ─────────────────────────────────────────────────────────────────

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

// ── DraggableProduct ──────────────────────────────────────────────────────────

function DraggableProduct({
  product, position, rotation, canDrag, isDark, textMuted,
  onPositionChange,
}: {
  product: LipProduct
  position: { x: number; y: number }
  rotation: number
  canDrag: boolean
  isDark: boolean
  textMuted: string
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const label = product.shade || product.name.slice(0, 14)

  if (product.cutoutUrl) {
    return (
      <motion.div
        drag={canDrag}
        dragMomentum={false}
        style={{
          position: "absolute", left: position.x, top: position.y,
          x: mx, y: my,
          width: 90,
          transform: `rotate(${rotation}deg)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
          cursor: canDrag ? "grab" : "default",
          zIndex: 5,
        }}
        whileDrag={{ scale: 1.08, zIndex: 50, cursor: "grabbing" }}
        onDragEnd={() => {
          onPositionChange(product.id, position.x + mx.get(), position.y + my.get())
          mx.set(0); my.set(0)
        }}
      >
        <img
          src={product.cutoutUrl}
          alt={product.name}
          style={{
            width: 70, height: 70, objectFit: "contain",
            filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.20))",
            pointerEvents: "none",
          }}
        />
        <p style={{
          fontFamily: "Georgia, serif", fontSize: 9,
          color: textMuted, textAlign: "center",
          maxWidth: 80, lineHeight: 1.3,
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: "nowrap", width: "100%",
          pointerEvents: "none",
        }}>
          {label}
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      drag={canDrag}
      dragMomentum={false}
      style={{
        position: "absolute", left: position.x, top: position.y,
        x: mx, y: my,
        width: 90,
        background: "white",
        padding: "8px 8px 10px",
        borderRadius: 4,
        boxShadow: "2px 4px 14px rgba(0,0,0,0.13)",
        transform: `rotate(${rotation}deg)`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        cursor: canDrag ? "grab" : "default",
        zIndex: 5,
      }}
      whileDrag={{ scale: 1.08, zIndex: 50, cursor: "grabbing", boxShadow: "4px 8px 24px rgba(0,0,0,0.22)" }}
      onDragEnd={() => {
        onPositionChange(product.id, position.x + mx.get(), position.y + my.get())
        mx.set(0); my.set(0)
      }}
    >
      <ProductImg product={product} size={70} />
      <p style={{
        fontFamily: "Georgia, serif", fontSize: 9,
        color: "#6B5E57", textAlign: "center",
        maxWidth: 80, lineHeight: 1.3,
        overflow: "hidden", textOverflow: "ellipsis",
        whiteSpace: "nowrap", width: "100%",
        pointerEvents: "none",
      }}>
        {label}
      </p>
    </motion.div>
  )
}

// ── DraggableStickerEl ────────────────────────────────────────────────────────

function DraggableStickerEl({
  sticker, position, canDrag,
  onRemove, onResize, onPositionChange,
}: {
  sticker: PlacedSticker
  position: { x: number; y: number }
  canDrag: boolean
  onRemove: (id: string) => void
  onResize: (id: string, delta: number) => void
  onPositionChange: (id: string, x: number, y: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)

  return (
    <motion.div
      drag={canDrag}
      dragMomentum={false}
      style={{
        position: "absolute", left: position.x, top: position.y,
        x: mx, y: my,
        transform: `rotate(${sticker.rotate}deg)`,
        cursor: canDrag ? "grab" : "pointer",
        zIndex: 10,
        userSelect: "none",
      }}
      whileDrag={{ scale: 1.1, zIndex: 50, cursor: "grabbing" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragEnd={() => {
        onPositionChange(sticker.id, position.x + mx.get(), position.y + my.get())
        mx.set(0); my.set(0)
      }}
    >
      <Sticker type={sticker.type} color={sticker.color} size={sticker.size} />
      {hovered && (
        <>
          {/* Remove button top-right */}
          <div
            onClick={(e) => { e.stopPropagation(); onRemove(sticker.id) }}
            style={{
              position: "absolute", top: -6, right: -6,
              width: 16, height: 16, borderRadius: "50%",
              background: "rgba(0,0,0,0.75)", color: "white",
              fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 20, fontWeight: 700,
            }}
          >×</div>
          {/* Resize handle bottom-right */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: -6, right: -6,
              display: "flex", gap: 2, zIndex: 20,
            }}
          >
            <div
              onClick={(e) => { e.stopPropagation(); onResize(sticker.id, -6) }}
              style={{
                width: 14, height: 14, borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, cursor: "pointer", fontWeight: 700, color: "#333",
              }}
            >−</div>
            <div
              onClick={(e) => { e.stopPropagation(); onResize(sticker.id, 6) }}
              style={{
                width: 14, height: 14, borderRadius: "50%",
                background: "rgba(255,255,255,0.95)",
                border: "1px solid rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, cursor: "pointer", fontWeight: 700, color: "#333",
              }}
            >+</div>
          </div>
          {/* Hover border */}
          <div style={{
            position: "absolute",
            inset: -4,
            border: "1.5px dashed rgba(232,93,117,0.6)",
            borderRadius: 6,
            pointerEvents: "none",
          }} />
        </>
      )}
    </motion.div>
  )
}

// ── TextElementEl ─────────────────────────────────────────────────────────────

function TextElementEl({
  el, position, canDrag, isEditing, pendingText,
  onPositionChange, onRemove, onCommit, onPendingChange,
}: {
  el: TextElement
  position: { x: number; y: number }
  canDrag: boolean
  isEditing: boolean
  pendingText: string
  onPositionChange: (id: string, x: number, y: number) => void
  onRemove: (id: string) => void
  onCommit: () => void
  onPendingChange: (v: string) => void
}) {
  const [hovered, setHovered] = useState(false)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  const fontFamily = el.fontFamily === "serif" ? "Georgia, serif" : "var(--font-body, sans-serif)"

  return (
    <motion.div
      drag={canDrag && !isEditing}
      dragMomentum={false}
      style={{
        position: "absolute", left: position.x, top: position.y,
        x: mx, y: my,
        cursor: isEditing ? "text" : canDrag ? "grab" : "default",
        zIndex: 12,
        minWidth: 60,
      }}
      whileDrag={{ scale: 1.05, zIndex: 50, cursor: "grabbing" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragEnd={() => {
        onPositionChange(el.id, position.x + mx.get(), position.y + my.get())
        mx.set(0); my.set(0)
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={pendingText}
          onChange={(e) => onPendingChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => { if (e.key === "Enter") onCommit() }}
          style={{
            background: "rgba(255,255,255,0.85)",
            border: "1.5px dashed var(--rose, #E85D75)",
            borderRadius: 4,
            padding: "2px 6px",
            fontFamily,
            fontSize: el.fontSize,
            color: el.color,
            outline: "none",
            minWidth: 80,
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div style={{
          fontFamily,
          fontSize: el.fontSize,
          color: el.color,
          whiteSpace: "nowrap",
          userSelect: "none",
          textShadow: "0 1px 2px rgba(0,0,0,0.08)",
          padding: "2px 4px",
        }}>
          {el.content}
        </div>
      )}
      {hovered && !isEditing && el.content && (
        <div
          onClick={(e) => { e.stopPropagation(); onRemove(el.id) }}
          style={{
            position: "absolute", top: -6, right: -6,
            width: 16, height: 16, borderRadius: "50%",
            background: "rgba(0,0,0,0.75)", color: "white",
            fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", zIndex: 20, fontWeight: 700,
          }}
        >×</div>
      )}
    </motion.div>
  )
}

// ── DrawingCanvas ─────────────────────────────────────────────────────────────

function DrawingCanvas({
  active, strokes, currentStroke, color, size, isEraser,
  onStrokeStart, onStrokeMove, onStrokeEnd,
}: {
  active: boolean
  strokes: Stroke[]
  currentStroke: { x: number; y: number }[]
  color: string
  size: number
  isEraser: boolean
  onStrokeStart: (pt: { x: number; y: number }) => void
  onStrokeMove: (pt: { x: number; y: number }) => void
  onStrokeEnd: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const getPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * 400,
      y: ((e.clientY - rect.top) / rect.height) * 500,
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    renderStrokes(canvas, strokes)
    // Also draw current in-progress stroke
    if (currentStroke.length >= 2) {
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.save()
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.lineWidth = size
      if (isEraser) {
        ctx.globalCompositeOperation = "destination-out"
        ctx.strokeStyle = "rgba(0,0,0,1)"
      } else {
        ctx.globalCompositeOperation = "source-over"
        ctx.strokeStyle = color
      }
      ctx.beginPath()
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y)
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y)
      }
      ctx.stroke()
      ctx.restore()
    }
  }, [strokes, currentStroke, color, size, isEraser])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={500}
      style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
        borderRadius: 16,
        zIndex: 20,
        pointerEvents: active ? "auto" : "none",
        cursor: isEraser ? "cell" : "crosshair",
        touchAction: "none",
      }}
      onMouseDown={(e) => { if (!active) return; onStrokeStart(getPos(e)) }}
      onMouseMove={(e) => { if (!active) return; onStrokeMove(getPos(e)) }}
      onMouseUp={() => { if (!active) return; onStrokeEnd() }}
      onMouseLeave={() => { if (!active) return; onStrokeEnd() }}
    />
  )
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

function Toolbar({
  activeTool, setActiveTool,
  drawColor, setDrawColor,
  brushSize, setBrushSize,
  textColor, setTextColor,
  textFontSize, setTextFontSize,
  textFont, setTextFont,
  onUndo, onClearAll, canUndo,
  isDraw,
}: {
  activeTool: Tool
  setActiveTool: (t: Tool) => void
  drawColor: string
  setDrawColor: (c: string) => void
  brushSize: BrushSize
  setBrushSize: (s: BrushSize) => void
  textColor: string
  setTextColor: (c: string) => void
  textFontSize: number
  setTextFontSize: (s: number) => void
  textFont: "serif" | "sans"
  setTextFont: (f: "serif" | "sans") => void
  onUndo: () => void
  onClearAll: () => void
  canUndo: boolean
  isDraw: boolean
}) {
  const toolBtn = (tool: Tool, icon: string, label: string) => (
    <button
      key={tool}
      onClick={() => setActiveTool(tool)}
      title={label}
      style={{
        width: 36, height: 36,
        borderRadius: 8,
        background: activeTool === tool ? "var(--rose, #E85D75)" : "rgba(255,255,255,0.80)",
        color: activeTool === tool ? "#fff" : "var(--text-muted, #6B5E57)",
        border: activeTool === tool ? "none" : "1.5px dashed rgba(0,0,0,0.12)",
        cursor: "pointer", fontSize: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
        flexShrink: 0,
      }}
    >
      {icon}
    </button>
  )

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      flexWrap: "wrap",
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(8px)",
      borderRadius: 12,
      padding: "8px 12px",
      border: "1.5px dashed rgba(0,0,0,0.10)",
      boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
      maxWidth: 400,
    }}>
      {/* Tool buttons */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        {toolBtn("move",   "✥", "move")}
        {toolBtn("draw",   "✏", "draw")}
        {toolBtn("text",   "T",  "text")}
        {toolBtn("eraser", "◌", "eraser")}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.10)", flexShrink: 0 }} />

      {/* Context controls */}
      {(activeTool === "draw" || activeTool === "eraser") && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Color swatches */}
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setDrawColor(c)}
              style={{
                width: 20, height: 20, borderRadius: "50%",
                backgroundColor: c,
                border: drawColor === c ? "2.5px solid #1A1612" : "1.5px solid rgba(0,0,0,0.15)",
                cursor: "pointer",
                boxShadow: drawColor === c ? "0 0 0 2px white, 0 0 0 4px #1A1612" : "0 1px 3px rgba(0,0,0,0.15)",
                transition: "box-shadow 0.12s",
                flexShrink: 0,
              }}
            />
          ))}
          {/* Size buttons */}
          <div style={{ display: "flex", gap: 3, marginLeft: 2 }}>
            {(["S","M","L"] as BrushSize[]).map((s) => (
              <button
                key={s}
                onClick={() => setBrushSize(s)}
                style={{
                  width: 26, height: 22, borderRadius: 6,
                  background: brushSize === s ? "var(--text, #1A1612)" : "rgba(255,255,255,0.9)",
                  color: brushSize === s ? "#fff" : "var(--text-muted, #6B5E57)",
                  border: "1.5px solid rgba(0,0,0,0.12)",
                  cursor: "pointer", fontSize: 10, fontWeight: 600,
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {activeTool === "text" && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {DRAW_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setTextColor(c)}
              style={{
                width: 20, height: 20, borderRadius: "50%",
                backgroundColor: c,
                border: textColor === c ? "2.5px solid #1A1612" : "1.5px solid rgba(0,0,0,0.15)",
                cursor: "pointer",
                boxShadow: textColor === c ? "0 0 0 2px white, 0 0 0 4px #1A1612" : "0 1px 3px rgba(0,0,0,0.15)",
                transition: "box-shadow 0.12s",
                flexShrink: 0,
              }}
            />
          ))}
          {/* Font size */}
          <div style={{ display: "flex", gap: 3, marginLeft: 2 }}>
            {[10, 14, 20].map((s) => (
              <button
                key={s}
                onClick={() => setTextFontSize(s)}
                style={{
                  width: 26, height: 22, borderRadius: 6,
                  background: textFontSize === s ? "var(--text, #1A1612)" : "rgba(255,255,255,0.9)",
                  color: textFontSize === s ? "#fff" : "var(--text-muted, #6B5E57)",
                  border: "1.5px solid rgba(0,0,0,0.12)",
                  cursor: "pointer", fontSize: 10, fontWeight: 600,
                }}
              >{s === 10 ? "S" : s === 14 ? "M" : "L"}</button>
            ))}
          </div>
          {/* Font toggle */}
          <button
            onClick={() => setTextFont(textFont === "serif" ? "sans" : "serif")}
            style={{
              height: 22, padding: "0 8px", borderRadius: 6,
              background: "rgba(255,255,255,0.9)",
              border: "1.5px solid rgba(0,0,0,0.12)",
              cursor: "pointer", fontSize: 10, fontWeight: 600,
              color: "var(--text-muted, #6B5E57)",
            }}
          >
            {textFont === "serif" ? "serif" : "sans"}
          </button>
        </div>
      )}

      {activeTool === "move" && (
        <span style={{ fontSize: 11, color: "var(--text-muted, #6B5E57)", fontFamily: "var(--font-body)" }}>
          drag to rearrange
        </span>
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 28, background: "rgba(0,0,0,0.10)", flexShrink: 0, marginLeft: "auto" }} />

      {/* Undo + Clear */}
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="undo"
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(255,255,255,0.80)",
            border: "1.5px dashed rgba(0,0,0,0.12)",
            cursor: canUndo ? "pointer" : "default",
            opacity: canUndo ? 1 : 0.4,
            fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >↩</button>
        <button
          onClick={onClearAll}
          title="clear all drawing"
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: "rgba(255,255,255,0.80)",
            border: "1.5px dashed rgba(0,0,0,0.12)",
            cursor: "pointer", fontSize: 15,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--rose, #E85D75)",
          }}
        >🗑</button>
      </div>
    </div>
  )
}

// ── CollapsibleSection ────────────────────────────────────────────────────────

function CollapsibleSection({
  title, open, onToggle, children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="sticky-note"
        style={{
          transform: "rotate(-0.5deg)",
          fontSize: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
          background: "none",
          border: "none",
          padding: "5px 10px",
          marginBottom: open ? 10 : 0,
          fontFamily: "var(--font-body, sans-serif)",
          fontWeight: 600,
          width: "100%",
          textAlign: "left",
        }}
      >
        <span style={{
          display: "inline-block",
          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
          transition: "transform 0.2s",
          fontSize: 10,
        }}>▼</span>
        {title}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LipComboPage() {
  const router = useRouter()

  // ── Card element state ──
  const [products,       setProducts]       = useState<LipProduct[]>([])
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([])
  const [textElements,   setTextElements]   = useState<TextElement[]>([])
  const [strokes,        setStrokes]        = useState<Stroke[]>([])

  // ── Position state (separate for clean undo) ──
  const [productPositions, setProductPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [stickerPositions, setStickerPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [textPositions,    setTextPositions]    = useState<Record<string, { x: number; y: number }>>({})

  // ── Card customization ──
  const [vibeTag,  setVibeTag]  = useState<string | null>(null)
  const [cardBg,   setCardBg]   = useState(CARD_BG_OPTIONS[0].color)
  const [cardName, setCardName] = useState("my lip combo")
  const [cardNote, setCardNote] = useState("")

  // ── Tool state ──
  const [activeTool,    setActiveTool]    = useState<Tool>("move")
  const [drawColor,     setDrawColor]     = useState(DRAW_COLORS[0])
  const [brushSize,     setBrushSize]     = useState<BrushSize>("M")
  const [textColor,     setTextColor]     = useState("#1A1612")
  const [textFontSize,  setTextFontSize]  = useState<number>(14)
  const [textFont,      setTextFont]      = useState<"serif" | "sans">("serif")
  const [editingTextId, setEditingTextId] = useState<string | null>(null)
  const [pendingText,   setPendingText]   = useState("")

  // ── Drawing refs ──
  const isDrawingRef     = useRef(false)
  const currentPointsRef = useRef<{ x: number; y: number }[]>([])
  const [currentStroke,  setCurrentStroke] = useState<{ x: number; y: number }[]>([])

  // ── History ──
  const [history, setHistory] = useState<CardSnapshot[]>([])

  // ── UI state ──
  const [sections, setSections] = useState({ search: true, vibe: false, customize: false, stickers: false })
  const [isGenerating,   setIsGenerating]   = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showToast,      setShowToast]      = useState(false)
  const [searchQuery,    setSearchQuery]    = useState("")
  const [searchResults,  setSearchResults]  = useState<SearchResult[]>([])
  const [searchError,    setSearchError]    = useState(false)
  const [noResults,      setNoResults]      = useState(false)
  const [isSearching,    setIsSearching]    = useState(false)

  // ── Snapshot helpers ──
  const buildSnapshot = useCallback((): CardSnapshot => ({
    products: [...products],
    placedStickers: [...placedStickers],
    textElements: [...textElements],
    strokes: [...strokes],
    vibeTag,
    cardBg,
    cardName,
    cardNote,
    productPositions: { ...productPositions },
    stickerPositions: { ...stickerPositions },
    textPositions:    { ...textPositions },
  }), [products, placedStickers, textElements, strokes, vibeTag, cardBg, cardName, cardNote, productPositions, stickerPositions, textPositions])

  const pushHistory = useCallback(() => {
    const snap = buildSnapshot()
    setHistory(h => [...h.slice(-19), snap])
  }, [buildSnapshot])

  const undo = () => {
    setHistory(h => {
      if (h.length === 0) return h
      const last = h[h.length - 1]
      setProducts(last.products)
      setPlacedStickers(last.placedStickers)
      setTextElements(last.textElements)
      setStrokes(last.strokes)
      setVibeTag(last.vibeTag)
      setCardBg(last.cardBg)
      setCardName(last.cardName)
      setCardNote(last.cardNote)
      setProductPositions(last.productPositions)
      setStickerPositions(last.stickerPositions)
      setTextPositions(last.textPositions)
      return h.slice(0, -1)
    })
  }

  // ── Search ──
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

  // ── Product actions ──
  const addProduct = (result: SearchResult) => {
    if (products.length >= 5) return
    pushHistory()
    const newProduct: LipProduct = {
      id: uid(),
      brand: result.brand,
      name: result.name,
      shade: result.shade,
      imageUrl: result.imageUrl,
      cutoutUrl: result.cutoutUrl,
      hexColor: PRODUCT_COLORS[products.length % PRODUCT_COLORS.length],
    }
    setProducts(prev => [...prev, newProduct])
    setProductPositions(prev => ({
      ...prev,
      [newProduct.id]: DEFAULT_PRODUCT_POSITIONS[products.length] ?? { x: 10, y: 20 },
    }))
    setSearchQuery("")
    setSearchResults([])
    setNoResults(false)
    setSearchError(false)
  }

  const removeProduct = (id: string) => {
    pushHistory()
    setProducts(prev => prev.filter(p => p.id !== id))
    setProductPositions(prev => { const p = { ...prev }; delete p[id]; return p })
  }

  // ── Sticker actions ──
  const addSticker = (opt: typeof STICKER_OPTIONS[number]) => {
    pushHistory()
    const x = rndBetween(20, 300)
    const y = rndBetween(80, 380)
    const id = uid()
    const newSticker: PlacedSticker = {
      id,
      type: opt.type,
      color: opt.color,
      x, y,
      rotate: rndBetween(-20, 20),
      size: 32,
    }
    setPlacedStickers(prev => [...prev, newSticker])
    setStickerPositions(prev => ({ ...prev, [id]: { x, y } }))
  }

  const removeSticker = (id: string) => {
    pushHistory()
    setPlacedStickers(prev => prev.filter(s => s.id !== id))
    setStickerPositions(prev => { const p = { ...prev }; delete p[id]; return p })
  }

  const resizeSticker = (id: string, delta: number) => {
    setPlacedStickers(prev => prev.map(s =>
      s.id === id ? { ...s, size: Math.max(20, Math.min(120, s.size + delta)) } : s
    ))
  }

  // ── Text actions ──
  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool !== "text") return
    if (editingTextId) { commitText(); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = uid()
    setPendingText("")
    setEditingTextId(id)
    setTextElements(prev => [...prev, {
      id, content: "", x, y,
      fontSize: textFontSize,
      color: textColor,
      fontFamily: textFont,
    }])
    setTextPositions(prev => ({ ...prev, [id]: { x, y } }))
  }

  const commitText = () => {
    if (!editingTextId) return
    if (!pendingText.trim()) {
      setTextElements(prev => prev.filter(t => t.id !== editingTextId))
      setTextPositions(prev => { const p = { ...prev }; delete p[editingTextId]; return p })
    } else {
      pushHistory()
      setTextElements(prev => prev.map(t =>
        t.id === editingTextId ? { ...t, content: pendingText } : t
      ))
    }
    setEditingTextId(null)
    setPendingText("")
  }

  const removeTextElement = (id: string) => {
    pushHistory()
    setTextElements(prev => prev.filter(t => t.id !== id))
    setTextPositions(prev => { const p = { ...prev }; delete p[id]; return p })
  }

  // ── Drawing actions ──
  const handleStrokeStart = (pt: { x: number; y: number }) => {
    isDrawingRef.current = true
    currentPointsRef.current = [pt]
    setCurrentStroke([pt])
  }

  const handleStrokeMove = (pt: { x: number; y: number }) => {
    if (!isDrawingRef.current) return
    currentPointsRef.current = [...currentPointsRef.current, pt]
    setCurrentStroke([...currentPointsRef.current])
  }

  const handleStrokeEnd = () => {
    if (!isDrawingRef.current) return
    isDrawingRef.current = false
    const points = currentPointsRef.current
    if (points.length >= 2) {
      pushHistory()
      setStrokes(prev => [...prev, {
        id: uid(),
        points,
        color: drawColor,
        size: BRUSH_SIZES[brushSize],
        isEraser: activeTool === "eraser",
      }])
    }
    currentPointsRef.current = []
    setCurrentStroke([])
  }

  // ── Clear all ──
  const clearAll = () => {
    pushHistory()
    setStrokes([])
    setTextElements([])
    setTextPositions({})
    setPlacedStickers([])
    setStickerPositions({})
  }

  // ── Generate ──
  const handleGenerate = async () => {
    const el = document.getElementById("lip-combo-card")
    if (!el) return
    setIsGenerating(true)
    setShowCelebration(true)
    await new Promise(r => setTimeout(r, 700))
    try {
      const html2canvas = (await import("html2canvas")).default
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: false,
        scale: 2,
        backgroundColor: null,
        logging: false,
      })
      setShowCelebration(false)
      const link = document.createElement("a")
      link.download = `${(cardName || "my-lip-combo").replace(/\s+/g, "-")}-tinted.png`
      link.href = canvas.toDataURL("image/png")
      link.click()
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
    } catch (e) {
      console.error("Canvas failed:", e)
      setShowCelebration(false)
    } finally {
      setIsGenerating(false)
    }
  }

  const isDark    = cardBg === "#1A1612"
  const textColor_ = isDark ? "white"                  : "#1A1612"
  const textMuted  = isDark ? "rgba(255,255,255,0.55)" : "#6B5E57"
  const isDrawMode = activeTool === "draw" || activeTool === "eraser"

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

          {/* ── LEFT PANEL ── */}
          <div
            className="scrapbook-card flex flex-col gap-4"
            style={{ padding: "1.5rem", borderRadius: "1rem" }}
          >
            <div>
              <h1
                className="title-shimmer font-[family-name:var(--font-display)]"
                style={{ fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 400, marginBottom: 8 }}
              >
                build your lip recipe
              </h1>
            </div>

            {/* ── Search & Products ── */}
            <CollapsibleSection
              title="search & products"
              open={sections.search}
              onToggle={() => setSections(s => ({ ...s, search: !s.search }))}
            >
              <div className="flex flex-col gap-3">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchQuery.trim().length >= 3) runSearch(searchQuery)
                    }}
                    placeholder="e.g. Rhode Peptide Gloss"
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: "1.5px dashed var(--text-muted)",
                      borderRadius: 9999, padding: "12px 44px 12px 20px",
                      fontFamily: "var(--font-body)", fontSize: 14,
                      color: "var(--text)", background: "rgba(255,255,255,0.88)",
                      outline: "none",
                    }}
                  />
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

                {searchError && (
                  <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 12, color: "var(--rose)" }}>
                    couldn&apos;t find that, try again!
                  </span>
                )}
                {noResults && !isSearching && !searchError && (
                  <span className="sticky-note" style={{ transform: "rotate(0.5deg)", fontSize: 12 }}>
                    no results — try a different name
                  </span>
                )}

                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col gap-2"
                    >
                      {searchResults.map((result, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="scrapbook-card"
                          style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}
                        >
                          {result.cutoutUrl ? (
                            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                              <img src={result.cutoutUrl} alt={result.name} style={{ width: 36, height: 36, objectFit: "contain", filter: "drop-shadow(1px 2px 4px rgba(0,0,0,0.15))" }} />
                            </div>
                          ) : result.imageUrl ? (
                            <img src={result.imageUrl} alt={result.name} style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                          ) : (
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: PRODUCT_COLORS[i % PRODUCT_COLORS.length], flexShrink: 0 }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {result.brand && <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>{result.brand} · </span>}
                              {result.name}
                            </p>
                            {result.shade && <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>{result.shade}</p>}
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
                          >+</button>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {products.length > 0 && (
                  <div>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                      your combo ({products.length}/5)
                    </p>
                    <Reorder.Group
                      axis="y" values={products} onReorder={setProducts}
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
                              {product.shade && <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)" }}>{product.shade}</p>}
                            </div>
                            <button
                              onClick={() => removeProduct(product.id)}
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 18, padding: "0 4px", lineHeight: 1 }}
                            >×</button>
                          </div>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* ── Vibe ── */}
            <CollapsibleSection
              title="pick your vibe"
              open={sections.vibe}
              onToggle={() => setSections(s => ({ ...s, vibe: !s.vibe }))}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {VIBE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => { pushHistory(); setVibeTag(vibeTag === tag ? null : tag) }}
                    className="tag-pill cursor-pointer"
                    style={{
                      background:  vibeTag === tag ? "var(--rose)"  : "rgba(255,255,255,0.80)",
                      color:       vibeTag === tag ? "#fff"         : "var(--text-muted)",
                      borderColor: vibeTag === tag ? "var(--rose)"  : "var(--text-muted)",
                      fontWeight:  vibeTag === tag ? 600            : 500,
                      fontSize: 12, transition: "all 0.15s",
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </CollapsibleSection>

            {/* ── Customize ── */}
            <CollapsibleSection
              title="customize"
              open={sections.customize}
              onToggle={() => setSections(s => ({ ...s, customize: !s.customize }))}
            >
              <div className="flex flex-col gap-4">
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
                {/* Card note */}
                <div>
                  <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                    add a note
                  </p>
                  <textarea
                    value={cardNote}
                    onChange={(e) => setCardNote(e.target.value.slice(0, 80))}
                    placeholder="e.g. 'my everyday look 🌸'"
                    maxLength={80} rows={2}
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
                          onClick={() => { pushHistory(); setCardBg(opt.color) }}
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
              </div>
            </CollapsibleSection>

            {/* ── Stickers ── */}
            <CollapsibleSection
              title="add stickers"
              open={sections.stickers}
              onToggle={() => setSections(s => ({ ...s, stickers: !s.stickers }))}
            >
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                {STICKER_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.label}
                    onClick={() => addSticker(opt)}
                    whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.90 }}
                    title={opt.label}
                    style={{
                      width: 40, height: 40,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(255,255,255,0.75)",
                      border: "1.5px dashed rgba(0,0,0,0.12)",
                      borderRadius: 8, cursor: "pointer", padding: 4,
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
                    onClick={() => { pushHistory(); setPlacedStickers([]); setStickerPositions({}) }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--rose)", fontSize: 11, fontFamily: "var(--font-body)", textDecoration: "underline", padding: 0 }}
                  >
                    clear all
                  </button>
                </div>
              )}
            </CollapsibleSection>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="flex flex-col items-center gap-4">

            {/* Toolbar */}
            <Toolbar
              activeTool={activeTool}
              setActiveTool={(t) => { if (editingTextId) commitText(); setActiveTool(t) }}
              drawColor={drawColor}
              setDrawColor={setDrawColor}
              brushSize={brushSize}
              setBrushSize={setBrushSize}
              textColor={textColor}
              setTextColor={setTextColor}
              textFontSize={textFontSize}
              setTextFontSize={setTextFontSize}
              textFont={textFont}
              setTextFont={setTextFont}
              onUndo={undo}
              onClearAll={clearAll}
              canUndo={history.length > 0}
              isDraw={isDrawMode}
            />

            {/* Card wrapper with celebration */}
            <div style={{ overflowX: "auto", maxWidth: "100%", display: "flex", justifyContent: "center" }}>
              <motion.div
                animate={showCelebration ? { scale: [1, 1.04, 1] } : {}}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                {/* The card */}
                <div
                  id="lip-combo-card"
                  onClick={handleCardClick}
                  style={{
                    width: 400, height: 500,
                    background: cardBg,
                    borderRadius: 16, padding: 24,
                    position: "relative", overflow: "hidden",
                    boxShadow: isDrawMode
                      ? `4px 8px 32px rgba(0,0,0,0.15), inset 0 0 0 2px ${drawColor}60`
                      : "4px 8px 32px rgba(0,0,0,0.15)",
                    flexShrink: 0,
                    display: "flex", flexDirection: "column",
                    cursor: activeTool === "text" ? "text" : "default",
                    transition: "box-shadow 0.2s",
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
                    <DraggableStickerEl
                      key={sticker.id}
                      sticker={sticker}
                      position={stickerPositions[sticker.id] ?? { x: sticker.x, y: sticker.y }}
                      canDrag={activeTool === "move"}
                      onRemove={removeSticker}
                      onResize={resizeSticker}
                      onPositionChange={(id, x, y) => {
                        setStickerPositions(prev => ({ ...prev, [id]: { x, y } }))
                      }}
                    />
                  ))}

                  {/* Text elements */}
                  {textElements.map((el) => (
                    <TextElementEl
                      key={el.id}
                      el={el}
                      position={textPositions[el.id] ?? { x: el.x, y: el.y }}
                      canDrag={activeTool === "move"}
                      isEditing={editingTextId === el.id}
                      pendingText={pendingText}
                      onPositionChange={(id, x, y) => {
                        setTextPositions(prev => ({ ...prev, [id]: { x, y } }))
                      }}
                      onRemove={removeTextElement}
                      onCommit={commitText}
                      onPendingChange={setPendingText}
                    />
                  ))}

                  {/* Washi tape */}
                  <div style={{
                    position: "absolute", top: 0, left: "50%",
                    transform: "translateX(-50%)",
                    width: 120, height: 22,
                    background: "repeating-linear-gradient(45deg,rgba(200,160,240,0.5),rgba(200,160,240,0.5) 6px,rgba(255,229,102,0.5) 6px,rgba(255,229,102,0.5) 12px)",
                    borderRadius: 2, opacity: 0.8, zIndex: 2,
                    pointerEvents: "none",
                  }} />

                  {/* Card name */}
                  <div style={{ textAlign: "center", marginTop: 20, marginBottom: 10, position: "relative", zIndex: 2, pointerEvents: "none" }}>
                    <p style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 400, color: textColor_, marginBottom: 2 }}>
                      {cardName || "my lip combo"}
                    </p>
                    <p style={{ fontSize: 10, color: textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      by tinted
                    </p>
                  </div>

                  {/* Products — draggable scattered layout */}
                  <div style={{ flex: 1, position: "relative", zIndex: 3 }}>
                    {products.length === 0 && (
                      <p style={{ color: textMuted, fontSize: 13, textAlign: "center", position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        add products to see them here
                      </p>
                    )}
                    {products.map((p, i) => (
                      <DraggableProduct
                        key={p.id}
                        product={p}
                        position={productPositions[p.id] ?? DEFAULT_PRODUCT_POSITIONS[i] ?? { x: 10, y: 20 }}
                        rotation={PRODUCT_ROTATIONS[i] ?? 0}
                        canDrag={activeTool === "move"}
                        isDark={isDark}
                        textMuted={textMuted}
                        onPositionChange={(id, x, y) => {
                          setProductPositions(prev => ({ ...prev, [id]: { x, y } }))
                        }}
                      />
                    ))}
                  </div>

                  {/* Vibe tag */}
                  {vibeTag && (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 10, position: "relative", zIndex: 2, pointerEvents: "none" }}>
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
                  {products.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8, position: "relative", zIndex: 2, pointerEvents: "none" }}>
                      {products.map((p) => (
                        <div key={p.id} style={{
                          width: 16, height: 16, borderRadius: "50%",
                          backgroundColor: p.hexColor,
                          boxShadow: "1px 1px 4px rgba(0,0,0,0.15)",
                        }} />
                      ))}
                    </div>
                  )}

                  {/* Card note */}
                  {cardNote && (
                    <div style={{
                      position: "absolute", bottom: 20, left: 16,
                      transform: "rotate(-2deg)", zIndex: 5,
                      background: "#FFE566",
                      borderRadius: 4,
                      boxShadow: "2px 2px 6px rgba(0,0,0,0.12)",
                      padding: "5px 10px",
                      maxWidth: 160,
                      pointerEvents: "none",
                    }}>
                      <p style={{ fontFamily: "var(--font-body, sans-serif)", fontSize: 9, color: "#1A1612", lineHeight: 1.5, wordBreak: "break-word" }}>
                        {cardNote}
                      </p>
                    </div>
                  )}

                  {/* Attribution */}
                  <div style={{ position: "absolute", bottom: 10, right: 14, display: "flex", alignItems: "center", gap: 3, zIndex: 2, pointerEvents: "none" }}>
                    <span style={{ fontSize: 9, color: textMuted }}>made with tinted</span>
                    <SparkleSticker size={10} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle" }} />
                  </div>

                  {/* Drawing canvas overlay */}
                  <DrawingCanvas
                    active={isDrawMode}
                    strokes={strokes}
                    currentStroke={currentStroke}
                    color={drawColor}
                    size={BRUSH_SIZES[brushSize]}
                    isEraser={activeTool === "eraser"}
                    onStrokeStart={handleStrokeStart}
                    onStrokeMove={handleStrokeMove}
                    onStrokeEnd={handleStrokeEnd}
                  />

                  {/* Celebration shimmer */}
                  <AnimatePresence>
                    {showCelebration && (
                      <motion.div
                        initial={{ x: "-110%" }}
                        animate={{ x: "110%" }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: "easeInOut" }}
                        style={{
                          position: "absolute", inset: 0, zIndex: 100,
                          background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)",
                          pointerEvents: "none",
                          borderRadius: 16,
                        }}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </div>

            {/* Tool hint */}
            {activeTool === "text" && (
              <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 11 }}>
                click anywhere on the card to add text ✦
              </span>
            )}
            {isDrawMode && (
              <span className="sticky-note" style={{ transform: "rotate(0.3deg)", fontSize: 11 }}>
                {activeTool === "eraser" ? "drag to erase" : "drag to draw on the card ✏"}
              </span>
            )}
            {isDark && (
              <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 11 }}>
                noir mode — text auto-switches to white ✦
              </span>
            )}

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
            your lip recipe is ready! ✦
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
