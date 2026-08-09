"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import MonkScaleBar from "./MonkScaleBar"

interface Props {
  qualityErrors: string[] | null
  onReset: () => void
}

const STATUS_MESSAGES = [
  "detecting facial landmarks...",
  "analyzing your undertone...",
  "finding your perfect shades...",
]

export default function AnalyzingScreen({ qualityErrors, onReset }: Props) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    if (qualityErrors) return
    const id = setInterval(() => {
      setMsgIdx((i) => (i + 1) % STATUS_MESSAGES.length)
    }, 1800)
    return () => clearInterval(id)
  }, [qualityErrors])

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center px-4">
      <AnimatePresence mode="wait">

        {qualityErrors ? (
          /* ── Error state ── */
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-8 max-w-sm w-full text-center"
          >
            {/* Warning icon */}
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="w-5 h-5 text-white/35"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>

            <div className="space-y-3">
              <p className="text-white/30 text-[10px] tracking-[0.18em] uppercase">
                photo needs adjustment
              </p>
              <ul className="space-y-2">
                {qualityErrors.map((err, i) => (
                  <li key={i} className="text-white/70 text-sm leading-relaxed">
                    {err}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={onReset}
              className="px-6 py-2.5 rounded-full border border-[#c68642]/45 text-[#c68642] text-sm hover:bg-[#c68642]/08 transition-colors"
              style={{ backgroundColor: "transparent" }}
            >
              try another photo
            </button>
          </motion.div>
        ) : (
          /* ── Loading state ── */
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-10 max-w-xs w-full"
          >
            <p className="text-white/15 text-[11px] tracking-[0.22em] uppercase">tinted.</p>

            {/* Monk Scale bar — shimmer sweep while analyzing */}
            <MonkScaleBar animate className="w-full" />

            {/* Cycling status text */}
            <div className="h-5 flex items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIdx}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="text-white/35 text-xs tracking-wide"
                >
                  {STATUS_MESSAGES[msgIdx]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* Staggered dots */}
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-white/20"
                  animate={{ opacity: [0.2, 0.7, 0.2] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
                />
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
