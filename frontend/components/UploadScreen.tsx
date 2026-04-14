"use client"

import { useRef, useState, useCallback } from "react"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

interface Props {
  onUpload: () => void
}

const PARTICLES = [
  { left: "7%",  top: "78%", size: 5, color: "var(--rose)", dur: 4.2, delay: 0   },
  { left: "17%", top: "68%", size: 7, color: "var(--gold)", dur: 3.5, delay: 1.2 },
  { left: "31%", top: "83%", size: 4, color: "var(--rose)", dur: 5.1, delay: 0.7 },
  { left: "54%", top: "74%", size: 6, color: "var(--gold)", dur: 3.8, delay: 2.0 },
  { left: "67%", top: "87%", size: 5, color: "var(--rose)", dur: 4.6, delay: 0.4 },
  { left: "77%", top: "71%", size: 8, color: "var(--gold)", dur: 3.2, delay: 1.8 },
  { left: "88%", top: "79%", size: 4, color: "var(--rose)", dur: 5.4, delay: 3.0 },
  { left: "44%", top: "89%", size: 6, color: "var(--gold)", dur: 4.0, delay: 1.5 },
]

// ---------------------------------------------------------------------------
// Ticker content
// ---------------------------------------------------------------------------
const ROW_1 =
  "Warm Honey   ·   Golden Bronze   ·   Cool Ivory   ·   Deep Mahogany   ·   Rich Espresso   ·   Soft Peach   ·   Deep Sienna   ·   Warm Caramel   ·   Cool Rose   ·   Neutral Sand   ·   Warm Toffee   ·   Deep Ebony   ·   "
const ROW_2 =
  "MST-1   ·   MST-2   ·   MST-3   ·   MST-4   ·   MST-5   ·   MST-6   ·   MST-7   ·   MST-8   ·   MST-9   ·   MST-10   ·   Every shade   ·   Every tone   ·   "

// ---------------------------------------------------------------------------
// Morphing ring configs
// ---------------------------------------------------------------------------
const RINGS = [
  {
    w: 530, h: 330,
    color: "var(--rose)", opacity: 0.6,
    duration: 12, direction: 1,
    from: "60% 40% 55% 45% / 45% 55% 40% 60%",
    to:   "40% 60% 45% 55% / 55% 45% 60% 40%",
  },
  {
    w: 610, h: 390,
    color: "var(--gold)", opacity: 0.45,
    duration: 18, direction: -1,
    from: "45% 55% 60% 40% / 60% 40% 45% 55%",
    to:   "55% 45% 40% 60% / 40% 60% 55% 45%",
  },
  {
    w: 690, h: 450,
    color: "var(--rose)", opacity: 0.28,
    duration: 24, direction: 1,
    from: "55% 45% 50% 50% / 50% 50% 45% 55%",
    to:   "45% 55% 50% 50% / 50% 50% 55% 45%",
  },
]

export default function UploadScreen({ onUpload }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef     = useRef<HTMLHeadingElement>(null)
  const taglineRef   = useRef<HTMLDivElement>(null)
  const cardWrapRef  = useRef<HTMLDivElement>(null)
  const tipsRef      = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const particleRefs = useRef<(HTMLDivElement | null)[]>([])
  const [isDragging, setIsDragging] = useState(false)

  useGSAP(
    () => {
      gsap.fromTo(titleRef.current,   { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1,   ease: "power3.out" })
      gsap.fromTo(taglineRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power2.out" })
      gsap.fromTo(cardWrapRef.current,{ opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, delay: 0.5, ease: "power2.out" })
      if (tipsRef.current) {
        gsap.fromTo(
          tipsRef.current.children,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, delay: 0.8, ease: "power2.out" },
        )
      }
      particleRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.fromTo(el, { y: 0, opacity: 0.4 }, {
          y: -120, opacity: 0,
          duration: PARTICLES[i].dur, delay: PARTICLES[i].delay,
          repeat: -1, ease: "none",
        })
      })
    },
    { scope: containerRef },
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.length) onUpload() },
    [onUpload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files.length) onUpload() },
    [onUpload],
  )

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden animated-bg flex flex-col items-center justify-center px-4"
    >
      {/* Spline background placeholder */}
      <div
        id="spline-bg"
        className="absolute inset-0 z-0 pointer-events-none blob-pulse"
        style={{
          background: [
            "radial-gradient(ellipse 70% 55% at 50% 50%, var(--blush) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 35% at 18% 28%, rgba(201,168,154,0.45) 0%, transparent 55%)",
            "radial-gradient(ellipse 35% 30% at 82% 72%, rgba(212,168,83,0.25) 0%, transparent 50%)",
          ].join(", "),
        }}
      >
        {/* TODO: replace with Spline scene */}
      </div>

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          ref={(el) => { particleRefs.current[i] = el }}
          className="absolute rounded-full pointer-events-none z-10"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, backgroundColor: p.color, opacity: 0.4, willChange: "transform, opacity" }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center text-center w-full max-w-lg">

        {/* Title */}
        <h1
          ref={titleRef}
          className="title-shimmer opacity-0 mb-4"
          style={{ fontFamily: "var(--font-display), serif", fontSize: "clamp(48px, 10vw, 72px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}
        >
          GlowMatch
        </h1>

        {/* Tagline — two lines + mission line */}
        <div ref={taglineRef} className="opacity-0 mb-8 flex flex-col items-center gap-1">
          <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 18, color: "var(--text-muted)", letterSpacing: "0.01em" }}>
            Finding your shade
          </p>
          <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 18, color: "var(--rose)", letterSpacing: "0.01em" }}>
            shouldn&apos;t be this hard.
          </p>
          <p style={{ fontFamily: "var(--font-body), sans-serif", fontSize: 13, color: "var(--text-muted)", opacity: 0.7, marginTop: 8, letterSpacing: "0.02em" }}>
            Built for every skin tone. Especially the ones overlooked.
          </p>
        </div>

        {/* Card + morphing rings */}
        <motion.div
          className="mt-10"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform", width: "100%" }}
        >
          {/* Relative wrapper so rings are centered on the card */}
          <div className="relative w-full flex items-center justify-center">

            {/* Morphing rings — behind the card */}
            {RINGS.map((ring, i) => (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  width:  ring.w,
                  height: ring.h,
                  border: `1.5px solid ${ring.color}`,
                  opacity: ring.opacity,
                  top: "50%",
                  left: "50%",
                  x: "-50%",
                  y: "-50%",
                  zIndex: 0,
                  willChange: "transform, border-radius",
                }}
                animate={{
                  borderRadius: [ring.from, ring.to, ring.from],
                  rotate: ring.direction === 1 ? [0, 360] : [0, -360],
                }}
                transition={{
                  duration: ring.duration,
                  repeat: Infinity,
                  ease: "linear",
                  repeatType: "loop",
                }}
              />
            ))}

            {/* Card itself */}
            <div ref={cardWrapRef} className="opacity-0 w-full relative" style={{ zIndex: 1 }}>
              <motion.div
                className="relative rounded-3xl p-10 cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.6)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.4)",
                  boxShadow: "0 25px 50px rgba(44,24,16,0.08)",
                }}
                animate={{
                  borderColor: isDragging ? "rgba(201,168,154,0.7)" : "rgba(255,255,255,0.4)",
                  backgroundColor: isDragging ? "rgba(245,237,232,0.85)" : "rgba(255,255,255,0.6)",
                }}
                transition={{ duration: 0.2 }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {/* Animated SVG dashed border */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ overflow: "visible" }}
                  preserveAspectRatio="none"
                >
                  <rect
                    x={2} y={2} rx={22}
                    fill="none" stroke="var(--rose)" strokeWidth={1.5}
                    strokeDasharray="8 6" vectorEffect="non-scaling-stroke"
                    className="dash-border"
                    style={{ width: "calc(100% - 4px)", height: "calc(100% - 4px)", opacity: isDragging ? 1 : 0.5, transition: "opacity 0.2s" }}
                  />
                </svg>

                <div className="flex flex-col items-center gap-4">
                  <motion.div
                    animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ color: "var(--rose)", fontSize: 48, lineHeight: 1, willChange: "transform" }}
                  >
                    ✦
                  </motion.div>

                  <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: 28, fontWeight: 600, color: "var(--text)" }}>
                    Drop your photo here
                  </h2>

                  <p style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)", fontSize: 15 }}>
                    or{" "}
                    <span
                      className="cursor-pointer underline underline-offset-2"
                      style={{ color: "var(--rose)" }}
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                    >
                      browse files
                    </span>
                  </p>

                  <p style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)", fontSize: 13, opacity: 0.8 }}>
                    JPG, PNG, WEBP — max 10 MB
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Tips row */}
        <div ref={tipsRef} className="mt-8 flex items-center gap-8">
          {["Face forward", "Natural light", "No filters"].map((tip) => (
            <span
              key={tip}
              className="opacity-0"
              style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.06em" }}
            >
              {tip}
            </span>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Scrolling words ticker — full width, pinned to bottom               */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col gap-2 pointer-events-none select-none">

        {/* Row 1 — left to right */}
        <div className="overflow-hidden w-full">
          <motion.div
            className="flex whitespace-nowrap"
            style={{ width: "fit-content" }}
            animate={{ x: ["0%", "-33.33%"] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear", repeatType: "loop" }}
          >
            {[ROW_1, ROW_1, ROW_1].map((text, i) => (
              <span
                key={i}
                style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", opacity: 0.65, fontWeight: 400 }}
              >
                {text}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Row 2 — right to left */}
        <div className="overflow-hidden w-full">
          <motion.div
            className="flex whitespace-nowrap"
            style={{ width: "fit-content" }}
            animate={{ x: ["-33.33%", "0%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }}
          >
            {[ROW_2, ROW_2, ROW_2].map((text, i) => (
              <span
                key={i}
                style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text-muted)", opacity: 0.65, fontWeight: 400 }}
              >
                {text}
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
