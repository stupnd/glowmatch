"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import UploadScreen from "@/components/UploadScreen"
import LoadingScreen from "@/components/LoadingScreen"
import ResultsScreen from "@/components/ResultsScreen"

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

  const [state,    setState]    = useState<AppState>("upload")
  const [results,  setResults]  = useState<Results | null>(null)
  const [error,    setError]    = useState<string | null>(null)
  const [budget,   setBudget]   = useState<string>("all")
  const [user,     setUser]     = useState<User | null>(null)

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
      saveToHistory(mapped, budget)
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
          <UploadScreen onUpload={handleUpload} />
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
        <ResultsScreen results={results} onReset={handleReset} />
      )}
    </main>
  )
}
