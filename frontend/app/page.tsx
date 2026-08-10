"use client"

import { useState, useCallback } from "react"
import { AnimatePresence, motion } from "framer-motion"
import UploadScreen    from "@/components/UploadScreen"
import AnalyzingScreen from "@/components/AnalyzingScreen"
import ResultsScreen   from "@/components/ResultsScreen"
import LiveAnalyzer    from "@/components/LiveAnalyzer"
import type { AnalyseMode } from "@/components/UploadScreen"
import type { AnalyzeResult } from "@/lib/api"

// These used to be declared here and imported by the screens, which meant the
// canonical response shape lived in a page component and listed only five of
// the ten recommendation categories the API returns. It lives in lib/api now;
// the re-exports keep existing imports working.
export type { AnalyzeResult as Results, Product as ShadeRec } from "@/lib/api"

// ── State machine ─────────────────────────────────────────────────────────────

type AppState = "upload" | "analyzing" | "live-analyzing" | "results"

export default function Home() {
  const [appState,      setAppState]      = useState<AppState>("upload")
  const [results,       setResults]       = useState<AnalyzeResult | null>(null)
  const [qualityErrors, setQualityErrors] = useState<string[] | null>(null)
  const [liveFile,      setLiveFile]      = useState<File | null>(null)
  const [liveBudget,    setLiveBudget]    = useState<string>("all")

  const handleUpload = useCallback(async (file: File, budget: string, mode: AnalyseMode = "normal") => {
    if (mode === "stream") {
      setLiveFile(file)
      setLiveBudget(budget)
      setQualityErrors(null)
      setAppState("live-analyzing")
      return
    }
    setAppState("analyzing")
    setQualityErrors(null)

    const fd = new FormData()
    fd.append("file", file)
    fd.append("budget", budget)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const res    = await fetch(`${apiUrl}/analyze`, { method: "POST", body: fd })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (Array.isArray(data.detail)) {
          // Normalize both formats:
          //   quality-gate 422  → ["Face is tilted…"]          (strings)
          //   FastAPI field 422 → [{type,loc,msg,input}]        (objects)
          const msgs = data.detail.map((item: unknown) =>
            typeof item === "string"
              ? item
              : typeof (item as Record<string, unknown>)?.msg === "string"
                ? (item as Record<string, unknown>).msg as string
                : `Analysis failed (${res.status}). Please try again.`
          )
          setQualityErrors(msgs)
        } else {
          const msg =
            typeof data.detail === "string"
              ? data.detail
              : `Analysis failed (${res.status}). Please try again.`
          setQualityErrors([msg])
        }
        return
      }

      const mapped: AnalyzeResult = {
        pixel_count:    data.pixel_count,
        monk_scale:     data.monk_scale,
        undertone:      data.undertone,
        avg_hex:        data.avg_hex,
        matched_shades: (data.matched_shades ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => ({
            shade_name:     s.shade_name,
            hex:            s.hex,
            description:    s.description,
            recommendation: s.recommendation ?? "",
            match_score:    typeof s.match_score === "number" ? s.match_score : undefined,
          }),
        ),
        recommendations: data.recommendations ?? {},
      }
      setResults(mapped)
      setAppState("results")
    } catch {
      setQualityErrors([
        "Network error — make sure the server is running and try again.",
      ])
    }
  }, [])

  const handleReset = useCallback(() => {
    setAppState("upload")
    setResults(null)
    setQualityErrors(null)
    setLiveFile(null)
  }, [])

  return (
    <AnimatePresence mode="wait">
      {appState === "upload" && (
        <motion.div
          key="upload"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <UploadScreen onUpload={handleUpload} />
        </motion.div>
      )}

      {appState === "analyzing" && (
        <motion.div
          key="analyzing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <AnalyzingScreen qualityErrors={qualityErrors} onReset={handleReset} />
        </motion.div>
      )}

      {appState === "live-analyzing" && liveFile && (
        <motion.div
          key="live-analyzing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LiveAnalyzer
            file={liveFile}
            budget={liveBudget}
            onComplete={(r) => { setResults(r); setAppState("results") }}
            onReset={handleReset}
          />
        </motion.div>
      )}

      {appState === "results" && results && (
        <motion.div
          key="results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ResultsScreen results={results} onReset={handleReset} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
