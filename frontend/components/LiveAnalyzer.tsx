"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { AnalyzeResult as Results } from "@/lib/api"

// ── Types ─────────────────────────────────────────────────────────────────────

type Stage = "connecting" | "preprocessing" | "face_detected" | "sampling" |
             "aggregating" | "classifying" | "matching" | "complete" | "error"

type PatchData = { x: number; y: number; rgb: [number,number,number]; accepted: boolean; reject_reason: string | null }
type Distance  = { mst: number; distance: number }

type SSEEvent =
  | { stage: "preprocessing"; message: string }
  | { stage: "face_detected"; landmarks: [number,number][]; bbox: [number,number,number,number]; image_width: number; image_height: number }
  | { stage: "sampling"; patch: PatchData }
  | { stage: "aggregating"; trimmed_mean_rgb: [number,number,number]; patch_count: number; rejected_count: number }
  | { stage: "classifying"; mst_level: number; distances: Distance[] }
  | { stage: "matching"; shades: unknown[] }
  | { stage: "complete"; result: Record<string, unknown> }
  | { stage: "error"; errors?: string[]; message?: string }

const MONK_COLORS = [
  "#f6ede4","#f3e7db","#f7ead0","#eadaba","#d7bd96",
  "#a07850","#825c43","#604134","#3a312a","#292420",
]

const STAGE_LABELS: Record<Stage, string> = {
  connecting:    "Connecting...",
  preprocessing: "Applying white balance correction...",
  face_detected: "Face detected — mapping sample points",
  sampling:      "Evaluating skin patches",
  aggregating:   "Computing trimmed mean colour",
  classifying:   "Comparing against 10 MST references",
  matching:      "Finding your closest shade matches",
  complete:      "Analysis complete",
  error:         "Analysis failed",
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  file:       File
  budget:     string
  onComplete: (results: Results) => void
  onReset:    () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LiveAnalyzer({ file, budget, onComplete, onReset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef    = useRef<HTMLImageElement | null>(null)

  // Canvas drawing state (all refs — imperative, no re-render needed)
  const scaleRef         = useRef({ sx: 1, sy: 1 })
  const bboxRef          = useRef<[number,number,number,number] | null>(null)
  const landmarksRef     = useRef<[number,number][]>([])
  const visibleLmRef     = useRef(0)
  const patchesRef       = useRef<PatchData[]>([])
  const meanRgbRef       = useRef<[number,number,number] | null>(null)
  const circleRadiusRef  = useRef(0)
  const animFrameRef     = useRef<number>(0)

  // React state for UI below the canvas
  const [stage,          setStage]        = useState<Stage>("connecting")
  const [patchStats,     setPatchStats]   = useState({ total: 0, accepted: 0 })
  const [distances,      setDistances]    = useState<Distance[]>([])
  const [distShown,      setDistShown]    = useState(0)
  const [mstLevel,       setMstLevel]     = useState<number | null>(null)
  const [errors,         setErrors]       = useState<string[]>([])

  // ── Canvas drawing ──────────────────────────────────────────────────────────

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx    = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Photo at 50 % opacity
    if (imgRef.current) {
      ctx.save()
      ctx.globalAlpha = 0.5
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height)
      ctx.restore()
    }

    const { sx, sy } = scaleRef.current

    // Face bounding box
    if (bboxRef.current) {
      const [bx, by, bw, bh] = bboxRef.current
      ctx.save()
      ctx.strokeStyle = "#c68642"
      ctx.lineWidth   = 2
      ctx.setLineDash([5, 4])
      ctx.shadowColor = "#c68642"
      ctx.shadowBlur  = 8
      ctx.strokeRect(bx*sx, by*sy, bw*sx, bh*sy)
      ctx.restore()
    }

    // Landmark dots (appear one by one via animation)
    const lms = landmarksRef.current.slice(0, visibleLmRef.current)
    lms.forEach(([lx, ly]) => {
      ctx.save()
      ctx.beginPath()
      ctx.arc(lx*sx, ly*sy, 3.5, 0, Math.PI * 2)
      ctx.fillStyle  = "#c68642"
      ctx.shadowColor = "#c68642"
      ctx.shadowBlur  = 8
      ctx.fill()
      ctx.restore()
    })

    // Patch squares
    patchesRef.current.forEach(p => {
      const px = p.x * sx
      const py = p.y * sy
      const sz = Math.max(8, Math.min(sx, sy) * 8)
      ctx.save()
      ctx.globalAlpha = 0.78
      ctx.fillStyle   = p.accepted ? "#4ade80" : "#f87171"
      ctx.fillRect(px - sz/2, py - sz/2, sz, sz)
      ctx.restore()

      if (!p.accepted && p.reject_reason) {
        ctx.save()
        ctx.font      = `${Math.max(8, Math.round(sx * 9))}px system-ui`
        ctx.fillStyle = "rgba(255,200,200,0.85)"
        ctx.fillText(p.reject_reason, px + sz/2 + 3, py + 3)
        ctx.restore()
      }
    })

    // Aggregated colour circle (grows with animation)
    if (meanRgbRef.current && circleRadiusRef.current > 0) {
      const [r, g, b] = meanRgbRef.current
      const cx = canvas.width  / 2
      const cy = canvas.height / 2
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, circleRadiusRef.current, 0, Math.PI * 2)
      ctx.fillStyle   = `rgb(${r},${g},${b})`
      ctx.shadowColor = `rgb(${r},${g},${b})`
      ctx.shadowBlur  = 24
      ctx.fill()
      ctx.strokeStyle = "rgba(255,255,255,0.18)"
      ctx.lineWidth   = 1.5
      ctx.stroke()
      ctx.restore()
    }
  }, [])

  // ── Animations ──────────────────────────────────────────────────────────────

  const animateLandmarks = useCallback((total: number) => {
    visibleLmRef.current = 0
    let shown = 0
    const step = () => {
      if (shown >= total) return
      shown++
      visibleLmRef.current = shown
      redraw()
      setTimeout(step, 50)
    }
    step()
  }, [redraw])

  const animateCircle = useCallback(() => {
    const maxR     = Math.min(canvasRef.current!.width, canvasRef.current!.height) * 0.18
    const start    = performance.now()
    const duration = 900

    const step = (now: number) => {
      const t      = Math.min((now - start) / duration, 1)
      const eased  = 1 - Math.pow(1 - t, 3)
      circleRadiusRef.current = maxR * eased
      redraw()
      if (t < 1) animFrameRef.current = requestAnimationFrame(step)
    }
    animFrameRef.current = requestAnimationFrame(step)
  }, [redraw])

  // ── SSE event handler ───────────────────────────────────────────────────────

  const handleEvent = useCallback((ev: SSEEvent) => {
    switch (ev.stage) {
      case "preprocessing":
        setStage("preprocessing")
        break

      case "face_detected": {
        const canvas = canvasRef.current!
        const sx = canvas.width  / ev.image_width
        const sy = canvas.height / ev.image_height
        scaleRef.current     = { sx, sy }
        landmarksRef.current = ev.landmarks
        bboxRef.current      = ev.bbox
        patchesRef.current   = []
        setStage("face_detected")
        animateLandmarks(ev.landmarks.length)
        break
      }

      case "sampling": {
        patchesRef.current.push(ev.patch)
        const acc = patchesRef.current.filter(p => p.accepted).length
        setPatchStats({ total: patchesRef.current.length, accepted: acc })
        setStage("sampling")
        redraw()
        break
      }

      case "aggregating":
        meanRgbRef.current = ev.trimmed_mean_rgb
        circleRadiusRef.current = 0
        setPatchStats({ total: ev.patch_count + ev.rejected_count, accepted: ev.patch_count })
        setStage("aggregating")
        animateCircle()
        break

      case "classifying":
        setDistances(ev.distances)
        setMstLevel(ev.mst_level)
        setStage("classifying")
        setDistShown(0)
        break

      case "matching":
        setStage("matching")
        break

      case "complete": {
        setStage("complete")
        const r = ev.result as Record<string, unknown>
        const mapped: Results = {
          pixel_count:    r.pixel_count as number,
          monk_scale:     r.monk_scale as string,
          undertone:      r.undertone as string,
          avg_hex:        r.avg_hex as string,
          matched_shades: ((r.matched_shades ?? []) as Record<string,unknown>[]).map(s => ({
            shade_name:     s.shade_name as string,
            hex:            s.hex as string,
            description:    s.description as string,
            recommendation: (s.recommendation ?? "") as string,
            match_score:    typeof s.match_score === "number" ? s.match_score : undefined,
          })),
          recommendations: (r.recommendations ?? {}) as Results["recommendations"],
        }
        setTimeout(() => onComplete(mapped), 1200)
        break
      }

      case "error":
        setErrors(ev.errors ?? (ev.message ? [ev.message] : ["Unknown error"]))
        setStage("error")
        break
    }
  }, [animateLandmarks, animateCircle, redraw, onComplete])

  // ── Load image into canvas ──────────────────────────────────────────────────

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    let active = true
    img.onload = () => {
      if (!active) return
      imgRef.current = img
      const canvas = canvasRef.current
      if (!canvas) return
      const cap   = 560
      const scale = Math.min(cap / img.naturalWidth, cap / img.naturalHeight, 1)
      canvas.width  = Math.round(img.naturalWidth  * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      redraw()
      URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
    // Only cancel the callback; revocation happens in onload/onerror so
    // the URL stays valid long enough for the image to finish loading.
    return () => { active = false }
  }, [file, redraw])

  // ── Stream SSE from backend ─────────────────────────────────────────────────

  useEffect(() => {
    const controller = new AbortController()
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

    async function stream() {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("budget", budget)

      let res: Response
      try {
        res = await fetch(`${apiUrl}/analyze-stream`, { method: "POST", body: fd, signal: controller.signal })
      } catch {
        setErrors(["Network error — make sure the server is running."])
        setStage("error")
        return
      }
      if (!res.ok || !res.body) {
        setErrors([`Server error ${res.status}`])
        setStage("error")
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ""

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // SSE blocks are separated by blank lines
          const blocks = buffer.split("\n\n")
          buffer = blocks.pop() ?? ""

          for (const block of blocks) {
            const dataLine = block.split("\n").find(l => l.startsWith("data: "))
            if (!dataLine) continue
            try {
              const ev = JSON.parse(dataLine.slice(6)) as SSEEvent
              handleEvent(ev)
            } catch { /* malformed event — skip */ }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setErrors(["Connection lost."])
          setStage("error")
        }
      }
    }

    stream()
    return () => {
      controller.abort()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [file, budget, handleEvent])

  // ── Animate MST distance bars appearing one by one ─────────────────────────

  useEffect(() => {
    if (stage !== "classifying" || distances.length === 0) return
    setDistShown(0)
    let n = 0
    const iv = setInterval(() => {
      n++
      setDistShown(n)
      if (n >= distances.length) clearInterval(iv)
    }, 100)
    return () => clearInterval(iv)
  }, [stage, distances])

  // ── Render ──────────────────────────────────────────────────────────────────

  const isError = stage === "error"

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-text-soft text-sm font-light tracking-widest uppercase mb-1">
            Live analysis
          </h2>
          <p className="text-text-muted text-xs">
            {isError ? "Something went wrong" : STAGE_LABELS[stage]}
          </p>
        </div>

        {/* Canvas */}
        <div
          className="relative w-full rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#111" }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-auto block"
            style={{ display: "block" }}
          />

          {/* Patch colour swatches (right overlay) */}
          {stage === "sampling" && patchesRef.current.filter(p => p.accepted).length > 0 && (
            <div
              className="absolute top-3 right-3 flex flex-col gap-1"
              style={{ pointerEvents: "none" }}
            >
              {patchesRef.current.filter(p => p.accepted).slice(-8).map((p, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-sm"
                  style={{
                    background: `rgb(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]})`,
                    border: "1px solid rgba(255,255,255,0.15)",
                    boxShadow: `0 0 6px rgba(${p.rgb[0]},${p.rgb[1]},${p.rgb[2]},0.4)`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stage info below canvas */}
        <div className="mt-5 space-y-4">

          {/* Patch counter */}
          {(stage === "sampling" || stage === "aggregating") && (
            <div className="flex items-center justify-between">
              <span className="text-text-muted text-xs">Patches evaluated</span>
              <span className="text-accent text-xs font-mono">
                {patchStats.accepted} accepted / {patchStats.total - patchStats.accepted} rejected
              </span>
            </div>
          )}

          {/* MST distance bar (classifying stage) */}
          {stage === "classifying" && distances.length > 0 && (
            <div>
              <p className="text-text-muted text-[10px] tracking-widest uppercase mb-3">
                MST distance comparison
              </p>
              <div className="flex gap-1 items-end" style={{ height: "72px" }}>
                {distances.map(({ mst, distance }, i) => {
                  const maxDist = Math.max(...distances.map(d => d.distance))
                  const barH   = Math.max(4, (1 - distance / maxDist) * 56 + 4)
                  const winner = mst === mstLevel
                  const shown  = i < distShown
                  return (
                    <div key={mst} className="flex flex-col items-center gap-1 flex-1" style={{ opacity: shown ? 1 : 0, transition: "opacity 0.15s" }}>
                      {winner && shown && (
                        <div className="text-[8px] text-accent leading-none">▼</div>
                      )}
                      <div
                        className="w-full rounded-sm"
                        style={{
                          height:     `${barH}px`,
                          background: winner ? "#c68642" : MONK_COLORS[mst - 1],
                          opacity:    winner ? 1 : 0.55,
                          boxShadow:  winner ? `0 0 10px ${MONK_COLORS[mst-1]}` : "none",
                          alignSelf:  "flex-end",
                          transition: "height 0.2s ease-out",
                        }}
                      />
                      <div className="text-[8px] text-text-muted">{mst}</div>
                    </div>
                  )
                })}
              </div>
              {mstLevel && distShown >= 10 && (
                <p className="text-center text-accent text-xs mt-3">
                  MST-{mstLevel} — closest match
                </p>
              )}
            </div>
          )}

          {/* Aggregating info */}
          {stage === "aggregating" && meanRgbRef.current && (
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0"
                style={{
                  background: `rgb(${meanRgbRef.current[0]},${meanRgbRef.current[1]},${meanRgbRef.current[2]})`,
                  boxShadow:  `0 0 12px rgb(${meanRgbRef.current[0]},${meanRgbRef.current[1]},${meanRgbRef.current[2]})`,
                }}
              />
              <span className="text-text-soft text-xs">
                Using {patchStats.accepted} of {patchStats.total} patches (10% luminance trim)
              </span>
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.2)" }}>
              {errors.map((e, i) => (
                <p key={i} className="text-red-300/80 text-xs leading-relaxed">{e}</p>
              ))}
            </div>
          )}

          {/* Progress indicator dots */}
          {!isError && stage !== "complete" && (
            <div className="flex justify-center gap-1.5 pt-1">
              {(["preprocessing","face_detected","sampling","aggregating","classifying","matching"] as Stage[]).map(s => {
                const stages: Stage[] = ["preprocessing","face_detected","sampling","aggregating","classifying","matching"]
                const current = stages.indexOf(stage)
                const idx     = stages.indexOf(s)
                const done    = idx < current
                const active  = idx === current
                return (
                  <div
                    key={s}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width:      active ? "16px" : "4px",
                      height:     "4px",
                      background: done   ? "rgba(198,134,66,0.4)"
                                : active ? "#c68642"
                                :          "rgba(255,255,255,0.12)",
                    }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Reset button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={onReset}
            className="text-sm text-text-muted hover:text-text-soft transition-colors"
          >
            ← try another photo
          </button>
        </div>
      </div>
    </div>
  )
}
