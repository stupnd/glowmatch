"use client"

import { useRef, useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"

interface Props {
  onComplete: () => void
}

const MESSAGES = [
  "Detecting facial landmarks...",
  "Analyzing skin tone...",
  "Matching foundation shades...",
]

export default function LoadingScreen({ onComplete }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null)
  const ringRef       = useRef<HTMLDivElement>(null)
  const particleRefs  = useRef<(HTMLDivElement | null)[]>([])

  const [msgIdx, setMsgIdx]           = useState(0)
  const [displayedText, setDisplayed] = useState("")
  const [isTyping, setIsTyping]       = useState(true)

  // Rotate ring + orbit particles
  useGSAP(
    () => {
      gsap.to(ringRef.current, {
        rotation: 360,
        duration: 2,
        repeat: -1,
        ease: "none",
        transformOrigin: "center center",
      })

      const angles = particleRefs.current.map((_, i) => (i / 6) * Math.PI * 2)

      const ticker = () => {
        const d = gsap.ticker.deltaRatio()
        particleRefs.current.forEach((el, i) => {
          if (!el) return
          angles[i] += 0.025 * d
          gsap.set(el, {
            x: Math.cos(angles[i]) * 90,
            y: Math.sin(angles[i]) * 110,
          })
        })
      }

      gsap.ticker.add(ticker)
      return () => gsap.ticker.remove(ticker)
    },
    { scope: containerRef },
  )

  // Typewriter per message
  useEffect(() => {
    if (msgIdx >= MESSAGES.length) return
    const msg = MESSAGES[msgIdx]
    let char = 0
    setDisplayed("")
    setIsTyping(true)

    const iv = setInterval(() => {
      char++
      setDisplayed(msg.slice(0, char))
      if (char >= msg.length) {
        clearInterval(iv)
        setIsTyping(false)
      }
    }, 45)

    return () => clearInterval(iv)
  }, [msgIdx])

  // Advance to next message after pause
  useEffect(() => {
    if (isTyping || msgIdx >= MESSAGES.length) return
    const t = setTimeout(() => setMsgIdx((n) => n + 1), 1000)
    return () => clearTimeout(t)
  }, [isTyping, msgIdx])

  // Transition to results at 4.5 s
  useEffect(() => {
    const t = setTimeout(onComplete, 4500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #EFE2DC 0%, var(--blush) 45%, #E5D0C8 100%)",
      }}
    >
      {/* Faint animated blobs behind everything */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 55% 45% at 30% 40%, rgba(201,168,154,0.3) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 35% at 70% 65%, rgba(212,168,83,0.18) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      <div className="relative flex flex-col items-center gap-12">
        {/* Face + ring + orbiting particles */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: 200, height: 240 }}
        >
          {/* Gradient ring */}
          <div
            ref={ringRef}
            className="absolute rounded-full"
            style={{
              width: 192,
              height: 234,
              background:
                "conic-gradient(transparent 0deg, var(--gold) 100deg, var(--rose) 220deg, transparent 360deg)",
              willChange: "transform",
            }}
          />

          {/* Inner mask makes ring hollow */}
          <div
            className="absolute rounded-full"
            style={{
              width: 172,
              height: 214,
              background:
                "linear-gradient(135deg, #EFE2DC 0%, var(--blush) 45%, #E5D0C8 100%)",
            }}
          />

          {/* Face silhouette */}
          <div className="relative z-10">
            <svg
              width="120"
              height="160"
              viewBox="0 0 120 160"
              fill="none"
              aria-hidden="true"
            >
              <ellipse
                cx="60" cy="80" rx="48" ry="68"
                stroke="var(--rose)" strokeWidth="2" opacity="0.65"
              />
              <circle cx="43" cy="65" r="4" fill="var(--rose)" opacity="0.65" />
              <circle cx="77" cy="65" r="4" fill="var(--rose)" opacity="0.65" />
              <path
                d="M 42 104 Q 60 120 78 104"
                stroke="var(--rose)" strokeWidth="2"
                strokeLinecap="round" opacity="0.65"
              />
            </svg>
          </div>

          {/* Orbiting particles (positioned relative to center) */}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              ref={(el) => { particleRefs.current[i] = el }}
              className="absolute rounded-full"
              style={{
                width: i % 2 === 0 ? 6 : 4,
                height: i % 2 === 0 ? 6 : 4,
                backgroundColor: i % 3 === 0 ? "var(--gold)" : "var(--rose)",
                opacity: 0.75,
                willChange: "transform",
              }}
            />
          ))}
        </div>

        {/* Status message with typewriter */}
        <div className="h-7 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {msgIdx < MESSAGES.length && (
              <motion.p
                key={msgIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 15,
                  color: "var(--text-muted)",
                  letterSpacing: "0.025em",
                  minWidth: "22ch",
                  textAlign: "center",
                }}
              >
                {displayedText}
                {isTyping && (
                  <span
                    className="inline-block w-px ml-0.5 bg-current animate-pulse"
                    style={{ height: "1em", verticalAlign: "text-bottom" }}
                    aria-hidden="true"
                  />
                )}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
