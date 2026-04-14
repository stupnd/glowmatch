"use client"

import { useRef, useState } from "react"
import { motion } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import type { Results } from "@/app/page"

interface Props {
  results: Results
  onReset: () => void
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return (r * 299 + g * 587 + b * 114) / 1000
}

export default function ResultsScreen({ results, onReset }: Props) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const titleRef         = useRef<HTMLHeadingElement>(null)
  const heroRef          = useRef<HTMLDivElement>(null)
  const shadesHeadingRef = useRef<HTMLHeadingElement>(null)
  const mstCounterRef    = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline()
      tl.fromTo(
        titleRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
      )
        .fromTo(
          heroRef.current,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.55, ease: "power2.out" },
          "-=0.2",
        )
        .fromTo(
          shadesHeadingRef.current,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
          "-=0.1",
        )

      // MST count-up
      const mstNum = parseInt(results.monk_scale.split("-")[1], 10)
      const obj = { v: 0 }
      gsap.to(obj, {
        v: mstNum,
        duration: 1.2,
        delay: 0.5,
        ease: "power2.out",
        snap: { v: 1 },
        onUpdate() {
          if (mstCounterRef.current) {
            mstCounterRef.current.textContent = `MST-${Math.round(obj.v)}`
          }
        },
      })
    },
    { scope: containerRef },
  )

  return (
    <div ref={containerRef} className="min-h-screen animated-bg py-16 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Page title */}
        <h1
          ref={titleRef}
          className="title-shimmer text-center mb-10 opacity-0"
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "clamp(32px, 6vw, 48px)",
            fontWeight: 700,
          }}
        >
          Your Glow Profile
        </h1>

        {/* Skin tone hero card */}
        <div
          ref={heroRef}
          className="flex items-center gap-8 rounded-3xl p-8 mb-12 opacity-0"
          style={{
            background: "rgba(250,247,242,0.75)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 25px 50px rgba(44,24,16,0.08)",
          }}
        >
          {/* Swatch */}
          <div className="relative flex-shrink-0" style={{ width: 160, height: 160 }}>
            {/* Pulsing glow — sits behind */}
            <motion.div
              className="absolute inset-0 rounded-full"
              animate={{
                boxShadow: [
                  `0 0 22px 6px ${results.avg_hex}55`,
                  `0 0 40px 18px ${results.avg_hex}80`,
                  `0 0 22px 6px ${results.avg_hex}55`,
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Clip-path reveal */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: results.avg_hex, willChange: "clip-path" }}
              initial={{ clipPath: "circle(0% at 50% 50%)" }}
              animate={{ clipPath: "circle(50% at 50% 50%)" }}
              transition={{ duration: 0.85, ease: "easeOut", delay: 0.3 }}
            />
          </div>

          {/* Text info */}
          <div className="flex flex-col gap-2.5">
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 11,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Your Skin Tone
            </p>

            <span
              ref={mstCounterRef}
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: 38,
                fontWeight: 700,
                color: "var(--text)",
                lineHeight: 1,
              }}
            >
              MST-0
            </span>

            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", delay: 0.9, stiffness: 200 }}
              className="inline-flex self-start items-center rounded-full px-3 py-1 text-xs"
              style={{
                background: results.undertone.toLowerCase().includes("warm")
                  ? "#FDF0E8"
                  : results.undertone.toLowerCase().includes("cool")
                  ? "#EEF0FD"
                  : "#F5F5F0",
                border: `1px solid ${
                  results.undertone.toLowerCase().includes("warm")
                    ? "#E8C4A0"
                    : results.undertone.toLowerCase().includes("cool")
                    ? "#C4CAF0"
                    : "#D4D4C4"
                }`,
                color: results.undertone.toLowerCase().includes("warm")
                  ? "#8B4513"
                  : results.undertone.toLowerCase().includes("cool")
                  ? "#4B5BA8"
                  : "#6B6B5B",
                fontFamily: "var(--font-body)",
                textTransform: "capitalize",
              }}
            >
              {results.undertone} undertone
            </motion.span>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: "var(--text-muted)",
                letterSpacing: "0.05em",
              }}
            >
              {results.avg_hex}
            </motion.p>
          </div>
        </div>

        {/* Shades heading */}
        <h2
          ref={shadesHeadingRef}
          className="mb-12 opacity-0"
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: 24,
            fontWeight: 600,
            color: "var(--text)",
          }}
        >
          Your Foundation Matches
        </h2>

        {/* Shade cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {results.matched_shades.map((shade, i) => (
            <ShadeCard key={shade.shade_name} shade={shade} index={i} />
          ))}
        </div>

        {/* Reset */}
        <div className="flex justify-center">
          <motion.button
            onClick={onReset}
            whileHover={{ backgroundColor: "var(--rose)", color: "#fff" }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="px-8 py-3 rounded-full text-sm cursor-pointer"
            style={{
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              border: "1.5px solid var(--rose)",
              color: "var(--rose)",
              background: "transparent",
              letterSpacing: "0.02em",
            }}
          >
            Try another photo
          </motion.button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

type Shade = Results["matched_shades"][0]

function ShadeCard({ shade, index }: { shade: Shade; index: number }) {
  const [isHovered, setIsHovered] = useState(false)
  const isLight = luminance(shade.hex) > 135

  const textColor       = isHovered ? (isLight ? "var(--text)"       : "#fff")               : "var(--text)"
  const mutedColor      = isHovered ? (isLight ? "var(--text-muted)" : "rgba(255,255,255,0.75)") : "var(--text-muted)"
  const recColor        = isHovered ? (isLight ? "var(--text)"       : "rgba(255,255,255,0.9)")  : "var(--text)"
  const borderAccent    = isHovered ? (isLight ? "var(--rose)"       : "rgba(255,255,255,0.4)")  : "var(--rose)"

  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.15, ease: "easeOut" }}
      whileHover={{ scale: 1.03, y: -4, boxShadow: "0 22px 44px rgba(0,0,0,0.13)" }}
      style={{ perspective: 1000, willChange: "transform" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative overflow-hidden rounded-2xl cursor-default"
    >
      {/* Background + swatch */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "rgba(250,247,242,0.70)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: "0 8px 22px rgba(44,24,16,0.06)",
        }}
      />

      {/* Expanding colour swatch */}
      <motion.div
        className="absolute top-0 left-0 w-full"
        style={{ backgroundColor: shade.hex, zIndex: 1, borderRadius: "16px 16px 0 0" }}
        animate={{ height: isHovered ? "100%" : 96 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      />

      {/* Content */}
      <div className="relative z-20 p-5">
        {/* Swatch spacer */}
        <div className="h-24" />

        <motion.h3
          animate={{ color: textColor }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: 20,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {shade.shade_name}
        </motion.h3>

        <motion.p
          animate={{ color: mutedColor }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            lineHeight: 1.55,
            marginBottom: 10,
          }}
        >
          {shade.description}
        </motion.p>

        <motion.p
          animate={{ color: recColor, borderLeftColor: borderAccent }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            lineHeight: 1.65,
            borderLeftWidth: 3,
            borderLeftStyle: "solid",
            borderLeftColor: "var(--rose)",
            paddingLeft: 10,
          }}
        >
          {shade.recommendation}
        </motion.p>
      </div>
    </motion.div>
  )
}
