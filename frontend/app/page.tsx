"use client"

import { useState, useRef, useCallback } from "react"
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

const FALLBACK_RECOMMENDATIONS = [
  "This shade is an ideal match for your complexion. The undertone complements your skin's natural warmth without oxidizing.",
  "A versatile option that works beautifully as a mixer or on days when your skin reads more neutral.",
  "Your go-to for a slightly different finish — perfect for evening looks or when you want more depth.",
]

function mapApiResponse(data: ApiResponse): Results {
  return {
    pixel_count: data.pixel_count,
    monk_scale:  data.monk_scale,
    undertone:   data.undertone,
    avg_hex:     data.avg_hex,
    matched_shades: data.matched_shades.map((shade, i) => ({
      ...shade,
      recommendation: FALLBACK_RECOMMENDATIONS[i] ?? FALLBACK_RECOMMENDATIONS[0],
    })),
    recommendations: data.recommendations ?? {},
  }
}

export default function Home() {
  const [state,   setState]   = useState<AppState>("upload")
  const [results, setResults] = useState<Results | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  // Coordination flags: transition to results only when BOTH the API has
  // responded AND the loading animation has finished playing.
  const apiDoneRef  = useRef(false)
  const animDoneRef = useRef(false)

  function tryTransition() {
    if (apiDoneRef.current && animDoneRef.current) {
      setState("results")
    }
  }

  const handleUpload = useCallback(async (file: File) => {
    // Reset coordination flags for this request.
    apiDoneRef.current  = false
    animDoneRef.current = false
    setError(null)
    setState("loading")

    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: fd,
      })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail?.detail ?? `Server error ${res.status}`)
      }
      const data: ApiResponse = await res.json()
      setResults(mapApiResponse(data))
      apiDoneRef.current = true
      tryTransition()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setState("upload")
    }
  }, [])

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
