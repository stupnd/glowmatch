"use client"

import { useState } from "react"
import UploadScreen from "@/components/UploadScreen"
import LoadingScreen from "@/components/LoadingScreen"
import ResultsScreen from "@/components/ResultsScreen"

type AppState = "upload" | "loading" | "results"

const mockResults = {
  monk_scale: "MST-6",
  undertone: "warm",
  avg_hex: "#a27e66",
  matched_shades: [
    {
      shade_name: "240W",
      hex: "#a07850",
      description: "medium deep with warm bronze undertone",
      recommendation:
        "240W is an ideal match for your medium-deep warm complexion. The bronze undertone complements your skin's golden warmth without oxidizing orange.",
    },
    {
      shade_name: "250N",
      hex: "#9a7048",
      description: "medium deep with neutral chestnut undertone",
      recommendation:
        "250N offers a versatile neutral option that works beautifully as a mixer or on days when your skin reads more neutral.",
    },
    {
      shade_name: "260C",
      hex: "#956e48",
      description: "medium deep with cool olive undertone",
      recommendation:
        "260C is your go-to for a slightly cooler finish, perfect for evening looks or when you want more depth.",
    },
  ],
}

export type Results = typeof mockResults

export default function Home() {
  const [state, setState] = useState<AppState>("upload")
  const [results] = useState(mockResults)

  return (
    <main className="min-h-screen">
      {state === "upload" && (
        <UploadScreen onUpload={() => setState("loading")} />
      )}
      {state === "loading" && (
        <LoadingScreen onComplete={() => setState("results")} />
      )}
      {state === "results" && (
        <ResultsScreen results={results} onReset={() => setState("upload")} />
      )}
    </main>
  )
}
