"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase"
import { Sticker, FlowerSticker, SparkleSticker } from "./Stickers"

interface Props {
  isOpen: boolean
  onClose: () => void
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

export default function AuthModal({ isOpen, onClose }: Props) {
  const supabase = useRef(createClient()).current

  const [email,        setEmail]        = useState("")
  const [emailSent,    setEmailSent]    = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)

  const handleGoogle = () => {
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    })
  }

  const handleEmailContinue = async () => {
    if (!email.trim()) return
    setEmailLoading(true)
    await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setEmailLoading(false)
    setEmailSent(true)
  }

  const handleClose = () => {
    setEmail("")
    setEmailSent(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: "rgba(0,0,0,0.50)", backdropFilter: "blur(6px)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClose}
        >
          <motion.div
            className="scrapbook-card relative w-full max-w-sm mx-auto p-8 pt-10"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Washi tape across top */}
            <div className="washi-tape w-28 absolute -top-3 left-1/2 -translate-x-1/2 rotate-[-1deg]" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-4 cursor-pointer"
              style={{
                background: "none", border: "none",
                fontSize: 22, color: "var(--text-muted)", lineHeight: 1,
              }}
              aria-label="Close"
            >
              ×
            </button>

            {/* Flower icon */}
            <div className="flex justify-center mb-4">
              <FlowerSticker size={32} color="var(--rose)" />
            </div>

            {/* Title */}
            <h2
              className="text-center mb-3"
              style={{ fontFamily: "var(--font-display), serif", fontSize: 26, fontWeight: 400, color: "var(--text)" }}
            >
              join tinted
            </h2>

            {/* Subtitle sticky-note */}
            <div className="flex justify-center mb-6">
              <span
                className="sticky-note text-center"
                style={{ transform: "rotate(-1deg)", fontSize: 11, lineHeight: 1.55, maxWidth: 220, whiteSpace: "normal" }}
              >
                save your shades, build lip recipes, track your glow journey
              </span>
            </div>

            {emailSent ? (
              /* Success state */
              <div className="flex flex-col items-center gap-3 py-4">
                <span
                  className="sticky-note"
                  style={{ transform: "rotate(-0.5deg)", display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13 }}
                >
                  check your email! ✉️
                  <SparkleSticker size={14} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle" }} />
                </span>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 4 }}>
                  we sent a magic link to {email}
                </p>
              </div>
            ) : (
              <>
                {/* Google sign in */}
                <motion.button
                  onClick={handleGoogle}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="w-full flex items-center justify-center gap-3 cursor-pointer"
                  style={{
                    background: "white",
                    border: "1.5px solid #E0E0E0",
                    borderRadius: 9999,
                    padding: "12px 20px",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--text)",
                    marginBottom: 16,
                  }}
                >
                  <GoogleLogo />
                  continue with Google
                </motion.button>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-4">
                  <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.10)" }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)" }}>or</span>
                  <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.10)" }} />
                </div>

                {/* Email input */}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailContinue()}
                  placeholder="your@email.com"
                  style={{
                    width: "100%",
                    border: "1.5px dashed var(--text-muted)",
                    borderRadius: 9999,
                    padding: "12px 18px",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    color: "var(--text)",
                    background: "rgba(255,255,255,0.85)",
                    outline: "none",
                    marginBottom: 10,
                    boxSizing: "border-box",
                  }}
                />

                {/* Email CTA */}
                <motion.button
                  onClick={handleEmailContinue}
                  disabled={emailLoading || !email.trim()}
                  whileHover={email.trim() ? { scale: 1.02 } : {}}
                  whileTap={email.trim() ? { scale: 0.98 } : {}}
                  transition={{ duration: 0.15 }}
                  className="w-full cursor-pointer"
                  style={{
                    background: email.trim() ? "var(--rose)" : "rgba(0,0,0,0.12)",
                    border: "none",
                    borderRadius: 9999,
                    padding: "12px 20px",
                    fontFamily: "var(--font-body)",
                    fontSize: 14,
                    fontWeight: 600,
                    color: email.trim() ? "#fff" : "var(--text-muted)",
                    cursor: email.trim() ? "pointer" : "default",
                    transition: "background 0.2s, color 0.2s",
                  }}
                >
                  {emailLoading ? "sending..." : "continue with email →"}
                </motion.button>
              </>
            )}

            {/* Bottom sticker */}
            <div className="absolute bottom-3 right-3 pointer-events-none">
              <Sticker type="sparkle" size={14} color="#C4A8F0" rotate={20} style={{ opacity: 0.5 }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
