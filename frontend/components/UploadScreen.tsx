"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Sticker, FlowerSticker, BlobSticker, SparkleSticker } from "./Stickers"

interface Props {
  onUpload: (file: File) => void
}

const PARTICLES = [
  { left: "7%",  top: "78%", size: 5, color: "var(--rose)",  dur: 4.2, delay: 0   },
  { left: "17%", top: "68%", size: 7, color: "var(--gold)",  dur: 3.5, delay: 1.2 },
  { left: "31%", top: "83%", size: 4, color: "var(--lilac)", dur: 5.1, delay: 0.7 },
  { left: "54%", top: "74%", size: 6, color: "var(--sage)",  dur: 3.8, delay: 2.0 },
  { left: "67%", top: "87%", size: 5, color: "var(--rose)",  dur: 4.6, delay: 0.4 },
  { left: "77%", top: "71%", size: 8, color: "var(--lilac)", dur: 3.2, delay: 1.8 },
  { left: "88%", top: "79%", size: 4, color: "var(--gold)",  dur: 5.4, delay: 3.0 },
  { left: "44%", top: "89%", size: 6, color: "var(--sage)",  dur: 4.0, delay: 1.5 },
]

const ROW_1 =
  "found my shade ✦ finally matched ✦ warm undertone ✦ golden hour skin ✦ MST-6 ✦ blush moment ✦ dewy finish ✦ tinted in peach ✦ soft glam ✦   "
const ROW_2 =
  "your skin your rules ✦ every tone matters ✦ shade diary ✦ glow notes ✦ beauty remembered ✦ MST-3 ✦ cool undertone ✦ glazed skin ✦ lip stain ✦   "

const RINGS = [
  { w: 530, h: 330, color: "#E85D75", opacity: 0.35, duration: 12, direction:  1, from: "60% 40% 55% 45% / 45% 55% 40% 60%", to: "40% 60% 45% 55% / 55% 45% 60% 40%" },
  { w: 610, h: 390, color: "#E8A020", opacity: 0.28, duration: 18, direction: -1, from: "45% 55% 60% 40% / 60% 40% 45% 55%", to: "55% 45% 40% 60% / 40% 60% 55% 45%" },
  { w: 690, h: 450, color: "#C4A8F0", opacity: 0.22, duration: 24, direction:  1, from: "55% 45% 50% 50% / 50% 50% 45% 55%", to: "45% 55% 50% 50% / 50% 50% 55% 45%" },
]

const TIP_STYLES: Record<string, React.CSSProperties> = {
  "Face forward":  { color: "var(--rose)",  borderColor: "var(--rose)",  background: "rgba(255,255,255,0.80)", fontWeight: 600 },
  "Natural light": { color: "var(--gold)",  borderColor: "var(--gold)",  background: "rgba(255,255,255,0.80)", fontWeight: 600 },
  "No filters":    { color: "#3D8A56",       borderColor: "#3D8A56",       background: "rgba(255,255,255,0.80)", fontWeight: 600 },
}

export default function UploadScreen({ onUpload }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef     = useRef<HTMLHeadingElement>(null)
  const taglineRef   = useRef<HTMLDivElement>(null)
  const cardWrapRef  = useRef<HTMLDivElement>(null)
  const tipsRef      = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const particleRefs = useRef<(HTMLDivElement | null)[]>([])

  // Camera refs
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isDragging,   setIsDragging]   = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [facingMode,   setFacingMode]   = useState<"user" | "environment">("user")
  const [cameraError,  setCameraError]  = useState<string | null>(null)
  const [previewSrc,   setPreviewSrc]   = useState<string | null>(null)

  // ── Camera stream lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (!isCameraOpen) return
    let cancelled = false

    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: 1280, height: 720 } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setCameraError(null)
      })
      .catch(() => { if (!cancelled) setCameraError("camera access needed! check your browser settings") })

    return () => { cancelled = true }
  }, [isCameraOpen, facingMode])

  // ── Camera actions ───────────────────────────────────────────────────────
  const openCamera  = useCallback(() => { setCameraError(null); setPreviewSrc(null); setIsCameraOpen(true) }, [])
  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setIsCameraOpen(false); setCameraError(null); setPreviewSrc(null)
  }, [])
  const flipCamera  = useCallback(() => setFacingMode((m) => m === "user" ? "environment" : "user"), [])

  const capture = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    setPreviewSrc(canvas.toDataURL("image/jpeg", 0.9))
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
      setTimeout(() => {
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        setIsCameraOpen(false); setCameraError(null); setPreviewSrc(null)
        onUpload(file)
      }, 500)
    }, "image/jpeg", 0.9)
  }, [onUpload])

  // ── GSAP entrance ───────────────────────────────────────────────────────
  useGSAP(
    () => {
      gsap.fromTo(titleRef.current,    { opacity: 0, y: 30 },       { opacity: 1, y: 0, duration: 1,   ease: "power3.out" })
      gsap.fromTo(taglineRef.current,  { opacity: 0, y: 20 },       { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: "power2.out" })
      gsap.fromTo(cardWrapRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, delay: 0.5, ease: "power2.out" })
      if (tipsRef.current)
        gsap.fromTo(tipsRef.current.children, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, delay: 0.8, ease: "power2.out" })
      particleRefs.current.forEach((el, i) => {
        if (!el) return
        gsap.fromTo(el, { y: 0, opacity: 0.5 }, { y: -120, opacity: 0, duration: PARTICLES[i].dur, delay: PARTICLES[i].delay, repeat: -1, ease: "none" })
      })
    },
    { scope: containerRef },
  )

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) onUpload(file)
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]; if (file) onUpload(file)
  }, [onUpload])

  return (
    <div
      ref={containerRef}
      className="animated-bg relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-4"
    >
      {/* Vivid blob background */}
      <div
        id="spline-bg"
        className="absolute inset-0 z-0 pointer-events-none blob-pulse"
        style={{
          background: [
            "radial-gradient(ellipse 70% 55% at 50% 50%, rgba(196,168,240,0.35) 0%, transparent 65%)",
            "radial-gradient(ellipse 40% 35% at 18% 28%, rgba(255,140,105,0.3) 0%, transparent 55%)",
            "radial-gradient(ellipse 35% 30% at 82% 72%, rgba(232,160,32,0.22) 0%, transparent 50%)",
          ].join(", "),
        }}
      />

      {/* ── Floating decorative background stickers ── */}
      {/* Large blob — slow rotation */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ top: "2.5rem", left: "2.5rem", zIndex: 0 }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <BlobSticker size={80} color="var(--lilac)" style={{ opacity: 0.15 }} />
      </motion.div>

      {/* Flower — gentle float */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ bottom: "8rem", right: "4rem", zIndex: 0 }}
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <FlowerSticker size={60} color="var(--peach)" style={{ opacity: 0.12 }} />
      </motion.div>

      {/* Sparkle — slow spin */}
      <motion.div
        className="absolute pointer-events-none"
        style={{ top: "33%", right: "2rem", zIndex: 0 }}
        animate={{ rotate: [0, 180, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <SparkleSticker size={40} color="var(--butter)" style={{ opacity: 0.2 }} />
      </motion.div>

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          ref={(el) => { particleRefs.current[i] = el }}
          className="absolute rounded-full pointer-events-none z-10"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, backgroundColor: p.color, opacity: 0.5, willChange: "transform, opacity" }}
        />
      ))}

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center text-center w-full max-w-lg">

        {/* Title */}
        <h1
          ref={titleRef}
          className="title-shimmer font-[family-name:var(--font-display)] opacity-0 mb-4"
          style={{ fontSize: "clamp(48px, 10vw, 72px)", fontWeight: 400, letterSpacing: "-0.01em", lineHeight: 1.1 }}
        >
          Tinted
          <span style={{ color: "var(--rose)", fontSize: "clamp(20px, 4vw, 28px)", opacity: 0.7, marginLeft: 8, WebkitTextFillColor: "var(--rose)" }}>
            ✦
          </span>
        </h1>

        {/* Tagline */}
        <div ref={taglineRef} className="opacity-0 mb-8 flex flex-col items-center gap-1">
          <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--text)", fontWeight: 500 }}>Finding your shade</p>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 18, color: "var(--rose)", fontWeight: 700 }}>shouldn&apos;t be this hard.</p>
          <div className="mt-3 flex justify-center">
            <span className="sticky-note" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              a beauty journal for every skin tone
              <Sticker type="sparkle" size={16} color="#E8A020" rotate={15} style={{ display: "inline-block", verticalAlign: "middle" }} />
            </span>
          </div>
        </div>

        {/* Card + morphing rings */}
        <motion.div
          className="mt-10"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform", width: "100%" }}
        >
          <div className="relative w-full flex items-center justify-center">

            {/* Morphing rings */}
            {RINGS.map((ring, i) => (
              <motion.div
                key={i}
                className="absolute pointer-events-none"
                style={{
                  width: ring.w, height: ring.h,
                  border: `1.5px solid ${ring.color}`, opacity: ring.opacity,
                  top: "50%", left: "50%", x: "-50%", y: "-50%",
                  zIndex: 0, willChange: "transform, border-radius",
                }}
                animate={{ borderRadius: [ring.from, ring.to, ring.from], rotate: ring.direction === 1 ? [0, 360] : [0, -360] }}
                transition={{ duration: ring.duration, repeat: Infinity, ease: "linear", repeatType: "loop" }}
              />
            ))}

            {/* Card wrapper */}
            <div ref={cardWrapRef} className="opacity-0 w-full relative" style={{ zIndex: 1 }}>
              {/* Washi tape */}
              <div className="washi-tape w-24 absolute -top-3 left-1/2 -translate-x-1/2 rotate-[-2deg] z-10" />

              {/* Corner sticker decoratives */}
              <div className="absolute top-2 right-3 z-10 pointer-events-none select-none">
                <Sticker type="flower" size={20} color="#E85D75" rotate={20} style={{ opacity: 0.6 }} />
              </div>
              <div className="absolute bottom-2 left-3 z-10 pointer-events-none select-none">
                <Sticker type="sparkle" size={14} color="#E8A020" rotate={-10} style={{ opacity: 0.5 }} />
              </div>

              <motion.div
                className="scrapbook-card p-10 cursor-pointer"
                animate={{
                  borderColor:     isDragging ? "rgba(232,93,117,0.5)" : "rgba(0,0,0,0.15)",
                  backgroundColor: isDragging ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.82)",
                }}
                transition={{ duration: 0.2 }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {/* Animated SVG dashed border */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }} preserveAspectRatio="none">
                  <rect
                    x={2} y={2} rx={14}
                    fill="none" stroke="var(--rose)" strokeWidth={1.5}
                    strokeDasharray="8 6" vectorEffect="non-scaling-stroke"
                    className="dash-border"
                    style={{ width: "calc(100% - 4px)", height: "calc(100% - 4px)", opacity: isDragging ? 1 : 0.45, transition: "opacity 0.2s" }}
                  />
                </svg>

                <div className="flex flex-col items-center gap-4">
                  {/* Flower icon in drop zone */}
                  <motion.div
                    animate={{ rotate: [0, 15, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ lineHeight: 1, willChange: "transform" }}
                  >
                    <FlowerSticker size={48} color="#E85D75" />
                  </motion.div>

                  <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: 28, fontWeight: 400, color: "var(--text)" }}>
                    Drop your photo here
                  </h2>

                  <p style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)", fontSize: 15 }}>
                    or{" "}
                    <span
                      className="cursor-pointer underline decoration-dashed underline-offset-2"
                      style={{ color: "var(--rose)" }}
                      onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
                    >
                      browse files
                    </span>
                  </p>

                  {/* Camera option */}
                  <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <p style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)", fontSize: 12 }}>or</p>
                    <button
                      className="tag-pill cursor-pointer"
                      style={{ color: "var(--sky)", borderColor: "var(--sky)", background: "transparent", fontSize: 13 }}
                      onClick={openCamera}
                    >
                      take a photo 📸
                    </button>
                  </div>

                  <p style={{ fontFamily: "var(--font-body)", color: "var(--text-muted)", fontSize: 13, opacity: 0.8 }}>
                    JPG, PNG, WEBP — max 10 MB
                  </p>
                </div>

                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Tips row */}
        <div ref={tipsRef} className="mt-8 flex items-center gap-4 flex-wrap justify-center">
          {(["Face forward", "Natural light", "No filters"] as const).map((tip) => (
            <span key={tip} className="tag-pill opacity-0" style={TIP_STYLES[tip]}>{tip}</span>
          ))}
        </div>
      </div>

      {/* Scrolling ticker */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col gap-4 pointer-events-none select-none">
        <div className="overflow-hidden w-full">
          <motion.div className="flex whitespace-nowrap" style={{ width: "fit-content" }}
            animate={{ x: ["0%", "-33.33%"] }} transition={{ duration: 25, repeat: Infinity, ease: "linear", repeatType: "loop" }}>
            {[ROW_1, ROW_1, ROW_1].map((text, i) => (
              <span key={i} style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text)", opacity: 0.7, fontWeight: 500, textShadow: "0 1px 2px rgba(255,255,255,0.4)" }}>{text}</span>
            ))}
          </motion.div>
        </div>
        <div className="overflow-hidden w-full">
          <motion.div className="flex whitespace-nowrap" style={{ width: "fit-content" }}
            animate={{ x: ["-33.33%", "0%"] }} transition={{ duration: 20, repeat: Infinity, ease: "linear", repeatType: "loop" }}>
            {[ROW_2, ROW_2, ROW_2].map((text, i) => (
              <span key={i} style={{ fontFamily: "var(--font-body)", fontSize: 16, color: "var(--text)", opacity: 0.7, fontWeight: 500, textShadow: "0 1px 2px rgba(255,255,255,0.4)" }}>{text}</span>
            ))}
          </motion.div>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* ── Camera modal ── */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.70)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCamera}
          >
            <motion.div
              className="scrapbook-card relative overflow-hidden"
              style={{ width: "min(90vw, 500px)", maxHeight: "85vh" }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute top-3 left-3 z-20 text-sm cursor-pointer rounded-full px-3 py-1"
                style={{ fontFamily: "var(--font-body)", background: "rgba(0,0,0,0.12)", color: "var(--text)", border: "none" }}
                onClick={closeCamera}
              >
                ✕ close
              </button>

              {!cameraError && (
                <button
                  className="absolute top-3 right-3 z-20 text-xl cursor-pointer rounded-full w-9 h-9 flex items-center justify-center"
                  style={{ background: "rgba(0,0,0,0.12)", border: "none" }}
                  onClick={flipCamera}
                  title="Flip camera"
                >
                  📷
                </button>
              )}

              {cameraError ? (
                <div className="flex flex-col items-center gap-4 p-10 pt-14">
                  <div className="sticky-note text-center" style={{ transform: "rotate(-1deg)", maxWidth: 280, whiteSpace: "normal", lineHeight: 1.6 }}>
                    {cameraError}
                  </div>
                  <button
                    className="cursor-pointer underline underline-offset-2 decoration-dashed"
                    style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--rose)", background: "none", border: "none" }}
                    onClick={closeCamera}
                  >
                    use file upload instead
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative" style={{ lineHeight: 0 }}>
                    {previewSrc && (
                      <img src={previewSrc} alt="capture preview" className="absolute inset-0 w-full h-full object-cover z-10" />
                    )}
                    <video ref={videoRef} autoPlay playsInline muted className="w-full" style={{ maxHeight: "55vh", objectFit: "cover", display: "block" }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="relative flex items-center justify-center" style={{ width: "58%", height: "78%" }}>
                        <motion.div
                          className="absolute inset-0"
                          style={{ border: "2px dashed rgba(255,255,255,0.75)", borderRadius: "50% 50% 45% 45% / 60% 60% 40% 40%" }}
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span className="absolute -bottom-7 text-xs whitespace-nowrap" style={{ fontFamily: "var(--font-body)", color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em" }}>
                          center your face here ✦
                        </span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                      <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 11, whiteSpace: "nowrap" }}>
                        natural light works best 🌟
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-center py-6">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={capture}
                      className="relative rounded-full cursor-pointer flex items-center justify-center"
                      style={{ width: 72, height: 72, background: "white", border: "4px solid var(--rose)", flexShrink: 0 }}
                      aria-label="Capture photo"
                    >
                      <div className="rounded-full" style={{ width: 50, height: 50, backgroundColor: "var(--rose)" }} />
                    </motion.button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
