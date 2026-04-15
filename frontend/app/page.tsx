"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import UploadScreen from "@/components/UploadScreen"
import LoadingScreen from "@/components/LoadingScreen"
import ResultsScreen from "@/components/ResultsScreen"
import AuthModal from "@/components/AuthModal"

type AppState = "upload" | "loading" | "results"

export type ShadeRec = {
  brand: string
  product: string
  shade: string
  price_range: string
  why: string
}

// Shape returned by the FastAPI /analyze endpoint.
type ApiResponse = {
  pixel_count: number
  monk_scale: string
  undertone: string
  avg_hex: string
  matched_shades: { shade_name: string; hex: string; description: string }[]
  recommendations?: {
    foundation?: ShadeRec[]
    concealer?: ShadeRec[]
    blush?: ShadeRec[]
    bronzer?: ShadeRec[]
    lip?: ShadeRec[]
  }
}

export type Results = {
  pixel_count: number
  monk_scale: string
  undertone: string
  avg_hex: string
  matched_shades: {
    shade_name: string
    hex: string
    description: string
    recommendation: string
  }[]
  recommendations: {
    foundation?: ShadeRec[]
    concealer?: ShadeRec[]
    blush?: ShadeRec[]
    bronzer?: ShadeRec[]
    lip?: ShadeRec[]
  }
}

function mapApiResponse(data: ApiResponse): Results {
  return {
    pixel_count: data.pixel_count,
    monk_scale:  data.monk_scale,
    undertone:   data.undertone,
    avg_hex:     data.avg_hex,
    matched_shades: data.matched_shades.map((shade) => ({
      ...shade,
      recommendation: (shade as { recommendation?: string }).recommendation ?? "",
    })),
    recommendations: data.recommendations ?? {},
  }
}

export default function Home() {
  const supabase = useMemo(() => createClient(), [])

  const [state,          setState]          = useState<AppState>("upload")
  const [results,        setResults]        = useState<Results | null>(null)
  const [error,          setError]          = useState<string | null>(null)
  const [budget,         setBudget]         = useState<string>("all")
  const [user,           setUser]           = useState<User | null>(null)
  const [showSavedToast, setShowSavedToast] = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [showAuthModal,  setShowAuthModal]  = useState(false)

  // Track auth state so we can save results for logged-in users
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  // Coordination flags: transition to results only when BOTH the API has
  // responded AND the loading animation has finished playing.
  const apiDoneRef  = useRef(false)
  const animDoneRef = useRef(false)

  function tryTransition() {
    if (apiDoneRef.current && animDoneRef.current) {
      setState("results")
    }
  }

  const saveToHistory = useCallback(async (analysisResults: Results, currentBudget: string) => {
    if (!user) return
    await supabase.from("shade_history").insert({
      user_id:         user.id,
      monk_scale:      analysisResults.monk_scale,
      undertone:       analysisResults.undertone,
      avg_hex:         analysisResults.avg_hex,
      matched_shades:  analysisResults.matched_shades,
      recommendations: analysisResults.recommendations,
      budget:          currentBudget,
    })
  }, [user])

  const handleUpload = useCallback(async (file: File) => {
    // Reset coordination flags for this request.
    apiDoneRef.current  = false
    animDoneRef.current = false
    setError(null)
    setState("loading")

    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("budget", budget)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res = await fetch(`${apiUrl}/analyze`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail?.detail ?? `Server error ${res.status}`)
      }
      const data: ApiResponse = await res.json()
      const mapped = mapApiResponse(data)
      setResults(mapped)
      if (user) {
        saveToHistory(mapped, budget)
        setShowSavedToast(true)
        setTimeout(() => setShowSavedToast(false), 3000)
      } else {
        setShowAuthPrompt(true)
      }
      apiDoneRef.current = true
      tryTransition()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setState("upload")
    }
  }, [budget, saveToHistory])

  // Called by LoadingScreen after its 4.5 s animation finishes.
  const handleLoadingComplete = useCallback(() => {
    animDoneRef.current = true
    tryTransition()
  }, [])

  const handleReset = useCallback(() => {
    setResults(null)
    setError(null)
    setState("upload")
  }, [])

  return (
    <main className="min-h-screen">
      {state === "upload" && (
        <>
          <UploadScreen onUpload={handleUpload} budget={budget} onBudgetChange={setBudget} />
          {error && (
            <div
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm"
              style={{
                background: "rgba(44,24,16,0.88)",
                color: "#FAF7F2",
                fontFamily: "var(--font-body)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              }}
            >
              {error}
            </div>
          )}
        </>
      )}
      {state === "loading" && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}
      {state === "results" && results && (
        <>
          <ResultsScreen results={results} onReset={handleReset} />

          {/* Saved toast — logged in */}
          <AnimatePresence>
            {showSavedToast && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
              >
                <span
                  className="sticky-note"
                  style={{ transform: "rotate(-0.5deg)", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  saved to your journal! ✦
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sign-in prompt — not logged in */}
          <AnimatePresence>
            {showAuthPrompt && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 9999,
                  padding: "10px 18px",
                  boxShadow: "0 6px 24px rgba(0,0,0,0.14)",
                  border: "1.5px dashed rgba(0,0,0,0.15)",
                }}
              >
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
                  sign in to save your results
                </span>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="tag-pill cursor-pointer"
                  style={{ color: "var(--rose)", borderColor: "var(--rose)", fontWeight: 600, fontSize: 12 }}
                >
                  sign in ✦
                </button>
                <button
                  onClick={() => setShowAuthPrompt(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16, lineHeight: 1 }}
                >
                  ×
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </main>
  )
}
