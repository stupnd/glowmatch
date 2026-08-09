"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import CameraModal from "./CameraModal"

type BudgetValue = "drugstore" | "mid" | "high" | "all"
export type AnalyseMode = "normal" | "stream"

const BUDGET_OPTIONS: { label: string; sub: string; value: BudgetValue }[] = [
  { label: "Drugstore",       sub: "under $20", value: "drugstore" },
  { label: "Mid-range",       sub: "$20–60",    value: "mid"       },
  { label: "High-end",        sub: "$60+",      value: "high"      },
  { label: "Show everything", sub: "",          value: "all"       },
]

interface Props {
  onUpload: (file: File, budget: BudgetValue, mode: AnalyseMode) => void
}

export default function UploadScreen({ onUpload }: Props) {
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const [isDragging, setDragging] = useState(false)
  const [showCamera, setCamera]   = useState(false)
  const [budget, setBudget]       = useState<BudgetValue>("all")
  const [mode, setMode]           = useState<AnalyseMode>("normal")

  // Persist mode in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tinted_mode") as AnalyseMode | null
      if (saved === "normal" || saved === "stream") setMode(saved)
    } catch { /* SSR safety */ }
  }, [])

  const handleModeChange = useCallback((m: AnalyseMode) => {
    setMode(m)
    try { localStorage.setItem("tinted_mode", m) } catch { /* ignore */ }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onUpload(file, budget, mode)
  }, [onUpload, budget, mode])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) onUpload(file, budget, mode)
  }, [onUpload, budget, mode])

  return (
    <div className="min-h-screen bg-[#0d0d0d] flex flex-col items-center justify-center px-4 py-16">

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="text-center mb-14"
      >
        <h1
          className="font-light tracking-tight text-white leading-none mb-3"
          style={{ fontSize: "clamp(52px, 10vw, 88px)" }}
        >
          tinted.
        </h1>
        <p className="text-white/35 text-xs tracking-[0.18em] uppercase">
          AI shade matching
        </p>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        className="w-full max-w-sm"
      >
        <motion.div
          animate={{
            borderColor: isDragging
              ? "rgba(198,134,66,0.6)"
              : "rgba(255,255,255,0.09)",
            backgroundColor: isDragging
              ? "rgba(198,134,66,0.04)"
              : "rgba(198,134,66,0)",
          }}
          transition={{ duration: 0.15 }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed rounded-2xl p-10 flex flex-col items-center gap-5 cursor-pointer"
          style={{ borderColor: "rgba(255,255,255,0.09)" }}
        >
          {/* Upload icon */}
          <div className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-5 h-5 text-white/35"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-white/75 text-sm font-medium mb-1.5">
              drop your photo here
            </p>
            <p className="text-white/30 text-xs">
              or{" "}
              <span
                className="text-[#c68642] underline underline-offset-2 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                browse files
              </span>
            </p>
          </div>

          <div
            className="w-full border-t border-white/[0.06] pt-4 flex flex-col items-center gap-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white/20 text-xs">or</span>
            <button
              onClick={() => setCamera(true)}
              className="text-xs text-white/45 hover:text-[#c68642] border border-white/10 hover:border-[#c68642]/35 rounded-full px-4 py-2 transition-colors"
            >
              use camera
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </motion.div>
      </motion.div>

      {/* Mode toggle */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="w-full max-w-sm mt-4"
      >
        <div
          className="flex rounded-xl p-1"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {([
            { value: "normal", label: "Analyse" },
            { value: "stream", label: "See how it works" },
          ] as const).map(({ value, label }) => {
            const active = mode === value
            return (
              <button
                key={value}
                onClick={() => handleModeChange(value)}
                className="flex-1 text-xs py-2 rounded-lg transition-all duration-200"
                style={{
                  background: active ? "rgba(198,134,66,0.15)" : "transparent",
                  color:      active ? "#c68642" : "rgba(255,255,255,0.3)",
                  border:     active ? "1px solid rgba(198,134,66,0.3)" : "1px solid transparent",
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
        {mode === "stream" && (
          <p className="text-[10px] text-white/20 text-center mt-2 tracking-wide">
            Watch the computer vision pipeline in real time
          </p>
        )}
      </motion.div>

      {/* Budget selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.25 }}
        className="w-full max-w-sm mt-5"
      >
        <p className="text-white/30 text-[11px] tracking-[0.14em] uppercase mb-3 text-center">
          Budget
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {BUDGET_OPTIONS.map(({ label, sub, value }) => {
            const selected = budget === value
            return (
              <button
                key={value}
                onClick={() => setBudget(value)}
                className="rounded-full px-4 py-1.5 text-xs transition-colors border"
                style={{
                  borderColor: selected ? "#c68642" : "rgba(255,255,255,0.12)",
                  color:       selected ? "#c68642" : "rgba(255,255,255,0.38)",
                  background:  "transparent",
                }}
              >
                {label}{sub && <span className="opacity-60 ml-1">{sub}</span>}
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.35 }}
        className="flex gap-2.5 mt-7 flex-wrap justify-center"
      >
        {["Face forward", "Natural light", "No filters"].map((tip) => (
          <span
            key={tip}
            className="text-[11px] text-white/22 border border-white/[0.07] rounded-full px-3 py-1"
            style={{ color: "rgba(255,255,255,0.22)" }}
          >
            {tip}
          </span>
        ))}
      </motion.div>

      {/* Camera modal */}
      <AnimatePresence>
        {showCamera && (
          <CameraModal
            onCapture={(file) => { setCamera(false); onUpload(file, budget, mode) }}
            onClose={() => setCamera(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
