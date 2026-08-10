"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Sticker, SwatchSticker } from "./Stickers"

interface Props {
  onComplete: () => void
}

const SWATCH_COLORS = ["#FFE566", "#C4A8F0", "#FF8C69", "#6DBF8A", "#E85D75"]

const MESSAGES = [
  { text: "detecting facial landmarks", sticker: "sparkle" as const, stickerColor: "#E8A020" },
  { text: "analyzing your undertone",   sticker: "leaf"    as const, stickerColor: "#6DBF8A" },
  { text: "finding your perfect shades",sticker: "sparkle" as const, stickerColor: "#C4A8F0" },
]

export default function LoadingScreen({ onComplete }: Props) {
  const [msgIdx, setMsgIdx]           = useState(0)
  const [displayedText, setDisplayed] = useState("")
  const [isTyping, setIsTyping]       = useState(true)

  // Typewriter per message
  useEffect(() => {
    if (msgIdx >= MESSAGES.length) return
    const msg = MESSAGES[msgIdx].text
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
    }, 40)

    return () => clearInterval(iv)
  }, [msgIdx])

  // Advance to next message after pause
  useEffect(() => {
    if (isTyping || msgIdx >= MESSAGES.length) return
    const t = setTimeout(() => setMsgIdx((n) => n + 1), 700)
    return () => clearTimeout(t)
  }, [isTyping, msgIdx])

  // Transition to results at 4.5s
  useEffect(() => {
    const t = setTimeout(onComplete, 4500)
    return () => clearTimeout(t)
  }, [onComplete])

  const currentMsg = MESSAGES[msgIdx]

  return (
    <div className="animated-bg relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Vivid blobs */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 55% 45% at 30% 40%, rgba(196,168,240,0.28) 0%, transparent 60%)",
            "radial-gradient(ellipse 40% 35% at 70% 65%, rgba(255,140,105,0.22) 0%, transparent 55%)",
          ].join(", "),
        }}
      />

      <div className="relative flex flex-col items-center gap-8 px-4">

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "clamp(20px, 5vw, 24px)",
            color: "var(--text)",
            fontWeight: 400,
            letterSpacing: "0.01em",
          }}
        >
          putting it together...
        </motion.h2>

        {/* Scrapbook canvas wrapper */}
        <div className="relative" style={{ width: "min(400px, 90vw)" }}>

          {/* 1. Washi tape across top — 0.1s */}
          <motion.div
            className="washi-tape w-32 absolute z-10"
            style={{ top: -10, left: "50%", transform: "translateX(-50%) rotate(-2deg)", transformOrigin: "center" }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          />

          {/* Card */}
          <div className="scrapbook-card relative" style={{ height: 320, overflow: "hidden" }}>

            {/* 2. Color swatch strip — 0.6s, spring stamp */}
            <motion.div
              className="absolute"
              style={{ top: 32, left: 24 }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.6 }}
            >
              <SwatchSticker colors={SWATCH_COLORS} />
            </motion.div>

            {/* 3. Sticky note "skin tone: analyzing..." — 1.2s */}
            <motion.div
              style={{
                position: "absolute", top: 26, right: 16,
                background: "#FFE566", borderRadius: 4,
                boxShadow: "2px 2px 6px rgba(0,0,0,0.12)",
                padding: "7px 11px",
                fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text)",
                transform: "rotate(2deg)", maxWidth: 108, lineHeight: 1.45,
              }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 1.2, ease: "easeOut" }}
            >
              skin tone:<br />analyzing...
            </motion.div>

            {/* 4. Polaroid placeholder — 1.8s */}
            <motion.div
              className="polaroid absolute"
              style={{ left: 24, top: "50%", transform: "translateY(-50%) rotate(-1deg)" }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 1.8, ease: "easeOut" }}
            >
              <div style={{ width: 60, height: 48, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" }}>
                <motion.div
                  style={{
                    height: "100%", width: "100%",
                    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.75) 50%, transparent 100%)",
                  }}
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
              </div>
            </motion.div>

            {/* 5. Sticky note "matching shades..." — 2.4s */}
            <motion.div
              style={{
                position: "absolute", bottom: 44, right: 16,
                background: "#FFE8DC", borderRadius: 4,
                boxShadow: "2px 2px 6px rgba(0,0,0,0.12)",
                padding: "8px 12px",
                fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text)",
                transform: "rotate(-1.5deg)", maxWidth: 132, lineHeight: 1.4,
              }}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 2.4, ease: "easeOut" }}
            >
              matching shades...
            </motion.div>

            {/* 6a. Sparkle sticker gold — top-right, 0.8s */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ top: 10, right: 26 }}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.35, delay: 0.8, times: [0, 0.6, 1] }}
            >
              <Sticker type="sparkle" size={20} color="#E8A020" rotate={15} />
            </motion.div>

            {/* 6b. Flower sticker rose — bottom-left, 1.4s */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ bottom: 24, left: 10 }}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.35, delay: 1.4, times: [0, 0.6, 1] }}
            >
              <Sticker type="flower" size={18} color="#E85D75" rotate={-10} />
            </motion.div>

            {/* 6c. Blob sticker lilac — middle-right, 2.0s */}
            <motion.div
              className="absolute pointer-events-none"
              style={{ top: "50%", right: 10, transform: "translateY(-50%)" }}
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.35, delay: 2.0, times: [0, 0.6, 1] }}
            >
              <Sticker type="blob" size={16} color="#C4A8F0" rotate={5} />
            </motion.div>

            {/* 7. Progress line — grows 0% → 100% over 4.5s */}
            <div
              className="absolute bottom-0 left-0 right-0"
              style={{ height: 2, background: "rgba(0,0,0,0.06)" }}
            >
              <motion.div
                style={{ height: "100%", backgroundColor: "var(--rose)" }}
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 4.5, ease: "linear" }}
              />
            </div>
          </div>
        </div>

        {/* Status messages — tag-pill + typewriter + inline sticker */}
        <div className="h-9 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {msgIdx < MESSAGES.length && (
              <motion.div
                key={msgIdx}
                className="tag-pill"
                style={{ color: "#7B52C4", borderColor: "#7B52C4", background: "rgba(255,255,255,0.88)", fontWeight: 600 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-body)", fontSize: 14,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  {displayedText}
                  {isTyping ? (
                    <span
                      className="inline-block w-px ml-0.5 bg-current animate-pulse"
                      style={{ height: "1em", verticalAlign: "text-bottom" }}
                      aria-hidden="true"
                    />
                  ) : (
                    <Sticker
                      type={currentMsg.sticker}
                      size={14}
                      color={currentMsg.stickerColor}
                      style={{ display: "inline-block", verticalAlign: "middle" }}
                    />
                  )}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom tip sticky-note with flower sticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
        >
          <span
            className="sticky-note"
            style={{
              transform: "rotate(0.8deg)", fontSize: 12, opacity: 0.85,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}
          >
            this only takes a sec!
            <Sticker type="flower" size={14} color="#E85D75" style={{ display: "inline-block", verticalAlign: "middle" }} />
          </span>
        </motion.div>

      </div>
    </div>
  )
}
