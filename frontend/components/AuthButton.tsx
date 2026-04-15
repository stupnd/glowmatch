"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import AuthModal from "./AuthModal"

export default function AuthButton() {
  const supabase = useRef(createClient()).current

  const [user,         setUser]         = useState<User | null>(null)
  const [showModal,    setShowModal]    = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Subscribe to auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showDropdown])

  const handleSignOut = async () => {
    setShowDropdown(false)
    await supabase.auth.signOut()
  }

  if (user) {
    const initial = (user.email?.[0] ?? "?").toUpperCase()

    return (
      <div ref={dropdownRef} className="relative">
        <button
          onClick={() => setShowDropdown((v) => !v)}
          className="flex items-center justify-center rounded-full cursor-pointer select-none"
          style={{
            width: 36, height: 36,
            background: "var(--lilac)",
            border: "none",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text)",
          }}
          aria-label="Account menu"
        >
          {initial}
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              className="scrapbook-card absolute right-0 mt-2 py-1"
              style={{ minWidth: 152, zIndex: 60 }}
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
            >
              <div
                style={{
                  fontFamily: "var(--font-body)", fontSize: 11,
                  color: "var(--text-muted)", padding: "6px 14px 4px",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: 152,
                }}
              >
                {user.email}
              </div>
              <hr style={{ border: "none", borderTop: "1px dashed rgba(0,0,0,0.10)", margin: "4px 0" }} />
              <button
                onClick={() => setShowDropdown(false)}
                className="w-full text-left cursor-pointer"
                style={{
                  fontFamily: "var(--font-body)", fontSize: 13,
                  color: "var(--text)", background: "none", border: "none",
                  padding: "7px 14px", fontWeight: 500,
                }}
              >
                my profile
              </button>
              <button
                onClick={handleSignOut}
                className="w-full text-left cursor-pointer"
                style={{
                  fontFamily: "var(--font-body)", fontSize: 13,
                  color: "var(--rose)", background: "none", border: "none",
                  padding: "7px 14px", fontWeight: 500,
                }}
              >
                sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="tag-pill cursor-pointer"
        style={{
          borderColor: "var(--text-muted)",
          color: "var(--text-muted)",
          background: "rgba(255,255,255,0.80)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        sign in
      </button>
      <AuthModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  )
}
