"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import AuthModal from "./AuthModal"

export default function AuthButton() {
  const supabase = useRef(createClient()).current
  const router   = useRouter()

  const [user,      setUser]      = useState<User | null>(null)
  const [showModal, setShowModal] = useState(false)

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

  if (user) {
    const initial = (user.email?.[0] ?? "?").toUpperCase()

    return (
      <button
        onClick={() => router.push("/profile")}
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
        aria-label="Go to profile"
        title={user.email}
      >
        {initial}
      </button>
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
