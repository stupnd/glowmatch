"use client"

import React, { useRef, useState, useCallback, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useGSAP } from "@gsap/react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { FlowerSticker, HeartSticker, SwatchSticker } from "./Stickers"
import BudgetSelector from "./BudgetSelector"

gsap.registerPlugin(ScrollTrigger)

interface Props {
  onUpload: (file: File) => void
  budget: string
  onBudgetChange: (budget: string) => void
}

const STICKY_NOTES = [
  { text: "finally found my shade after 3 years", rotate: "-2deg",  pos: { top: "22%", left: "3%" } },
  { text: "MST-7, warm undertone ✦",              rotate: "1.5deg", pos: { top: "20%", right: "3%" } },
  { text: "my lip recipe is everything",           rotate: "-1deg",  pos: { bottom: "28%", left: "3%" } },
  { text: "matched in 30 seconds",                rotate: "2deg",   pos: { bottom: "26%", right: "3%" } },
]

const ORBIT_ITEMS = [
  { label: "Foundation", shape: "circle",    color: "#997660" },
  { label: "Lip Gloss",  shape: "oval",      color: "#E85D75" },
  { label: "Blush",      shape: "square",    color: "#FF8C69" },
  { label: "Lipstick",   shape: "rect",      color: "#C4A8F0" },
  { label: "Bronzer",    shape: "circle",    color: "#E8A020" },
  { label: "Concealer",  shape: "oval",      color: "#FFE566" },
  { label: "Mascara",    shape: "rect-tall", color: "#1A1612" },
  { label: "Lip Liner",  shape: "line",      color: "#6DBF8A" },
]

const ORBIT_PHASES = ["know your skin", "find your shades", "remember everything"]

const FEATURE_ACCENTS = [
  { color: "#E85D75", glow: "rgba(232,93,117,0.28)" },
  { color: "#E8A020", glow: "rgba(232,160,32,0.28)" },
  { color: "#6DBF8A", glow: "rgba(109,191,138,0.28)" },
]

const ROW_1 = "found my shade ✦ finally matched ✦ warm undertone ✦ golden hour skin ✦ MST-6 ✦ blush moment ✦ dewy finish ✦ tinted in peach ✦ soft glam ✦   "

function OrbitShape({ shape, color }: { shape: string; color: string }) {
  const shapeStyles: Record<string, React.CSSProperties> = {
    circle:      { width: 40, height: 40, borderRadius: "50%" },
    oval:        { width: 28, height: 44, borderRadius: "50%" },
    square:      { width: 38, height: 38, borderRadius: 8 },
    rect:        { width: 22, height: 42, borderRadius: 8 },
    "rect-tall": { width: 16, height: 46, borderRadius: 6 },
    line:        { width: 8,  height: 46, borderRadius: 4 },
  }
  return (
    <div
      style={{
        ...(shapeStyles[shape] ?? shapeStyles.circle),
        background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 55%), ${color}`,
        boxShadow: "inset -2px -3px 8px rgba(0,0,0,0.22), inset 1px 2px 6px rgba(255,255,255,0.3)",
      }}
    />
  )
}

export default function UploadScreen({ onUpload, budget, onBudgetChange }: Props) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const heroTitleRef     = useRef<HTMLHeadingElement>(null)
  const heroSubRef       = useRef<HTMLParagraphElement>(null)
  const heroCTARef       = useRef<HTMLDivElement>(null)
  const heroMicroRef     = useRef<HTMLParagraphElement>(null)
  const stickyRefs       = useRef<(HTMLDivElement | null)[]>([])
  const orbitSectionRef  = useRef<HTMLDivElement>(null)
  const orbitGroupRef    = useRef<HTMLDivElement>(null)
  const orbitItemRefs    = useRef<(HTMLDivElement | null)[]>([])
  const phaseRefs        = useRef<(HTMLDivElement | null)[]>([])
  const featureRefs      = useRef<(HTMLDivElement | null)[]>([])
  const uploadSectionRef = useRef<HTMLDivElement>(null)
  const fileInputRef     = useRef<HTMLInputElement>(null)

  // Camera refs
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [isDragging,   setIsDragging]   = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [facingMode,   setFacingMode]   = useState<"user" | "environment">("user")
  const [cameraError,  setCameraError]  = useState<string | null>(null)
  const [previewSrc,   setPreviewSrc]   = useState<string | null>(null)
  const [fileSelected, setFileSelected] = useState(false)

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

  const openCamera  = useCallback(() => { setCameraError(null); setPreviewSrc(null); setIsCameraOpen(true) }, [])
  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setIsCameraOpen(false); setCameraError(null); setPreviewSrc(null)
  }, [])
  const flipCamera = useCallback(() => setFacingMode((m) => m === "user" ? "environment" : "user"), [])

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) onUpload(file)
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]; if (file) onUpload(file)
  }, [onUpload])

  const handleCTAClick = useCallback(() => {
    setTimeout(() => {
      document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }, [])

  useGSAP(() => {
    gsap.timeline()
      .fromTo(heroTitleRef.current,  { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1,   ease: "power3.out" })
      .fromTo(heroSubRef.current,    { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.5")
      .fromTo(heroCTARef.current,    { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.4")
      .fromTo(heroMicroRef.current,  { opacity: 0 },        { opacity: 1, duration: 0.5 }, "-=0.2")

    stickyRefs.current.forEach((el, i) => {
      if (!el) return
      gsap.fromTo(el,
        { opacity: 0, y: 20 + i * 5, x: i % 2 === 0 ? -15 : 15 },
        { opacity: 1, y: 0, x: 0, duration: 0.8, delay: 0.6 + i * 0.2, ease: "power2.out" }
      )
    })

    if (!orbitSectionRef.current || !orbitGroupRef.current) return

    gsap.to(orbitGroupRef.current, {
      rotation: 360,
      ease: "none",
      scrollTrigger: {
        trigger: orbitSectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
      },
    })

    orbitItemRefs.current.forEach((item) => {
      if (!item) return
      gsap.to(item, {
        rotation: -360,
        ease: "none",
        scrollTrigger: {
          trigger: orbitSectionRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
        },
      })
    })

    const phaseCount = phaseRefs.current.length
    if (phaseCount > 0) {
      gsap.set(phaseRefs.current[0], { opacity: 1, scale: 1 })
      gsap.set(phaseRefs.current.slice(1), { opacity: 0, scale: 0.92 })

      ScrollTrigger.create({
        trigger: orbitSectionRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const prog = self.progress
          const phaseIdx = prog < 0.33 ? 0 : prog < 0.66 ? 1 : 2

          phaseRefs.current.forEach((el, i) => {
            if (!el) return
            gsap.to(el, { opacity: i === phaseIdx ? 1 : 0, scale: i === phaseIdx ? 1 : 0.92, duration: 0.35 })
          })

          orbitItemRefs.current.forEach((el, i) => {
            if (!el) return
            const groupSize = Math.ceil(ORBIT_ITEMS.length / 3)
            const isActive = Math.floor(i / groupSize) === phaseIdx
            const baseAngle = (i / ORBIT_ITEMS.length) * Math.PI * 2 - Math.PI / 2
            const tiltY = Math.sin(baseAngle + prog * Math.PI * 2) * 18
            gsap.to(el, { scale: isActive ? 1.2 : 0.8, opacity: isActive ? 1 : 0.5, rotationY: tiltY, duration: 0.4 })
          })
        },
      })
    }

    featureRefs.current.forEach((el, i) => {
      if (!el) return
      gsap.fromTo(el,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%", toggleActions: "play none none none" },
          delay: i * 0.15,
        }
      )
    })

    if (uploadSectionRef.current) {
      gsap.fromTo(uploadSectionRef.current,
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "power2.out",
          scrollTrigger: { trigger: uploadSectionRef.current, start: "top 85%", toggleActions: "play none none none" },
        }
      )
    }
  }, { scope: containerRef })

  const orbitRadius = typeof window !== "undefined" && window.innerWidth < 768 ? 130 : 200

  return (
    <div ref={containerRef} style={{ background: "#FFF9F5", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @keyframes scrollLineGrow {
          0%   { transform: scaleY(0); opacity: 1; }
          70%  { transform: scaleY(1); opacity: 0.8; }
          100% { transform: scaleY(1); opacity: 0; }
        }
        @keyframes scrollDotPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.6); }
        }
      `}</style>

      {/* ── SECTION 1: HERO ─────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "0 1rem",
      }}>
        {/* Video background */}
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
        />

        {/* Dark gradient overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.5) 100%)",
          zIndex: 1,
        }} />

        {/* Floating sticky notes — desktop only */}
        {STICKY_NOTES.map((note, i) => (
          <div
            key={i}
            ref={(el) => { stickyRefs.current[i] = el }}
            className="hidden md:block"
            style={{ position: "absolute", ...note.pos, zIndex: 5, opacity: 0, maxWidth: 180 }}
          >
            <div style={{
              background: "#FFE566",
              borderRadius: 4,
              boxShadow: "2px 4px 14px rgba(0,0,0,0.28)",
              padding: "10px 16px",
              fontFamily: "var(--font-body)",
              fontSize: 12,
              fontWeight: 500,
              color: "#1A1612",
              transform: `rotate(${note.rotate})`,
              lineHeight: 1.5,
            }}>
              {note.text}
            </div>
          </div>
        ))}

        {/* Hero content */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 640,
          width: "100%",
          zIndex: 10,
          position: "relative",
        }}>
          <h1
            ref={heroTitleRef}
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: "clamp(72px, 10vw, 120px)",
              fontWeight: 400,
              color: "white",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              marginBottom: "1rem",
              opacity: 0,
              textShadow: "0 2px 40px rgba(0,0,0,0.3)",
            }}
          >
            Tinted.
          </h1>

          <p
            ref={heroSubRef}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "1.25rem",
              color: "rgba(255,255,255,0.85)",
              fontWeight: 400,
              letterSpacing: "0.05em",
              marginBottom: "2.5rem",
              opacity: 0,
            }}
          >
            your beauty, remembered.
          </p>

          <div ref={heroCTARef} style={{ opacity: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <motion.button
              onClick={handleCTAClick}
              whileHover={{ scale: 1.03, boxShadow: "0 8px 40px rgba(232,93,117,0.65), 0 0 0 4px rgba(255,255,255,0.18)" }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                fontWeight: 600,
                background: "#E85D75",
                color: "#fff",
                border: "none",
                borderRadius: 9999,
                padding: "16px 40px",
                cursor: "pointer",
                boxShadow: "0 4px 24px rgba(232,93,117,0.45)",
              }}
            >
              find your shade →
            </motion.button>
          </div>

          <p
            ref={heroMicroRef}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.6)",
              marginTop: "1rem",
              opacity: 0,
            }}
          >
            free · no account needed · takes 30 seconds
          </p>
        </div>

        {/* Scroll indicator — vertical line + pulsing dot */}
        <div style={{
          position: "absolute",
          bottom: "2rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          zIndex: 10,
        }}>
          <div style={{ width: 1, height: 40, background: "rgba(255,255,255,0.12)", position: "relative", overflow: "hidden" }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "rgba(255,255,255,0.45)",
              transformOrigin: "top center",
              animation: "scrollLineGrow 2.2s ease-in-out infinite",
            }} />
          </div>
          <div style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.45)",
            animation: "scrollDotPulse 2.2s ease-in-out infinite",
          }} />
        </div>
      </section>

      {/* ── TICKER STRIP ────────────────────────────────────────────── */}
      <div style={{ background: "#1A1612", overflow: "hidden", padding: "14px 0" }}>
        <motion.div
          style={{ display: "flex", whiteSpace: "nowrap", width: "fit-content" }}
          animate={{ x: ["0%", "-33.33%"] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear", repeatType: "loop" }}
        >
          {[ROW_1, ROW_1, ROW_1].map((text, i) => (
            <span key={i} style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "#FFF9F5", opacity: 0.75, fontWeight: 400, letterSpacing: "0.04em" }}>
              {text}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Dark → cream gradient bridge */}
      <div style={{ height: 80, background: "linear-gradient(to bottom, #1A1612 0%, #FFF9F5 100%)" }} />

      {/* ── SECTION 2: SCROLL-DRIVEN ORBIT ──────────────────────────── */}
      <div ref={orbitSectionRef} style={{ height: "300vh", position: "relative", background: "#FFF9F5" }}>
        <div style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          perspective: "1000px",
        }}>
          {/* Orbit group — rotates on scroll */}
          <div
            ref={orbitGroupRef}
            style={{
              position: "relative",
              width: orbitRadius * 2 + 120,
              height: orbitRadius * 2 + 120,
              transformStyle: "preserve-3d",
            }}
          >
            {ORBIT_ITEMS.map((item, i) => {
              const angle = (i / ORBIT_ITEMS.length) * Math.PI * 2 - Math.PI / 2
              const x = Math.cos(angle) * orbitRadius
              const y = Math.sin(angle) * orbitRadius
              return (
                <div
                  key={item.label}
                  ref={(el) => { orbitItemRefs.current[i] = el }}
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    willChange: "transform",
                  }}
                >
                  <div style={{
                    width: 76,
                    height: 76,
                    background: "rgba(255,255,255,0.92)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 20,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <OrbitShape shape={item.shape} color={item.color} />
                  </div>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "#6B5E57", fontWeight: 600, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                    {item.label.toUpperCase()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Phase text — overlaid, morphs on scroll */}
          <div style={{ position: "absolute", pointerEvents: "none", textAlign: "center" }}>
            {ORBIT_PHASES.map((phase, i) => (
              <div
                key={phase}
                ref={(el) => { phaseRefs.current[i] = el }}
                style={{
                  position: i === 0 ? "relative" : "absolute",
                  top: i === 0 ? undefined : "50%",
                  left: i === 0 ? undefined : "50%",
                  transform: i === 0 ? undefined : "translate(-50%, -50%)",
                  fontFamily: "var(--font-display), serif",
                  fontSize: "clamp(48px, 8vw, 96px)",
                  fontWeight: 400,
                  color: "#1A1612",
                  whiteSpace: "nowrap",
                  opacity: 0,
                }}
              >
                {phase}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── SECTION 3: FEATURE HIGHLIGHTS ───────────────────────────── */}
      <section style={{ padding: "100px 1.5rem", maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{
          fontFamily: "var(--font-display), serif",
          fontSize: "clamp(28px, 4vw, 36px)",
          fontWeight: 400,
          color: "#1A1612",
          textAlign: "center",
          marginBottom: "3.5rem",
        }}>
          everything you need
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
          {[
            {
              icon: <SwatchSticker colors={["#997660", "#C4A8F0", "#E85D75", "#E8A020"]} style={{ filter: "none" }} />,
              title: "find your shade",
              desc: "CV + AI matches your exact skin tone to foundation shades across every brand and budget.",
            },
            {
              icon: <HeartSticker size={44} color="#E85D75" />,
              title: "your beauty inventory",
              desc: "Log every product you own. Rate it, note it, track when you run out.",
            },
            {
              icon: <FlowerSticker size={44} color="#C4A8F0" />,
              title: "lip recipe builder",
              desc: "Build shareable lip combos from real products. Export as a Story-ready card.",
            },
          ].map((feature, i) => {
            const accent = FEATURE_ACCENTS[i]
            return (
              <motion.div
                key={feature.title}
                ref={(el) => { featureRefs.current[i] = el as HTMLDivElement | null }}
                whileHover={{
                  y: -6,
                  boxShadow: `0 20px 60px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.04), 0 -4px 20px ${accent.glow}`,
                }}
                transition={{ duration: 0.25 }}
                style={{
                  background: "white",
                  borderRadius: 24,
                  padding: "2.5rem",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  borderTop: `3px solid ${accent.color}`,
                  opacity: 0,
                }}
              >
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: `${accent.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "1.5rem",
                }}>
                  {feature.icon}
                </div>
                <h3 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.5rem", fontWeight: 400, color: "#1A1612", marginBottom: "0.75rem" }}>
                  {feature.title}
                </h3>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "#6B5E57", lineHeight: 1.65 }}>
                  {feature.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── SECTION 4: UPLOAD REVEAL ─────────────────────────────────── */}
      <section
        id="upload-section"
        ref={uploadSectionRef}
        style={{ padding: "80px 1.5rem 120px", display: "flex", flexDirection: "column", alignItems: "center", opacity: 0 }}
      >
        <h2 style={{
          fontFamily: "var(--font-display), serif",
          fontSize: "clamp(24px, 4vw, 36px)",
          fontWeight: 400,
          color: "#1A1612",
          textAlign: "center",
          marginBottom: "2rem",
        }}>
          ready to find your shade?
        </h2>

        <div style={{ width: "100%", maxWidth: 480, marginBottom: "2rem" }}>
          <motion.div
            animate={{
              borderColor: isDragging ? "rgba(232,93,117,0.5)" : "rgba(0,0,0,0.08)",
              backgroundColor: isDragging ? "rgba(255,255,255,0.98)" : "#FFFFFF",
            }}
            transition={{ duration: 0.2 }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: "white",
              borderRadius: 24,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
              padding: "3rem 2rem",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1rem",
              position: "relative",
            }}
          >
            <motion.div
              animate={{ rotate: [0, 15, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <FlowerSticker size={52} color="#E85D75" />
            </motion.div>

            <p style={{ fontFamily: "var(--font-display), serif", fontSize: "1.5rem", fontWeight: 400, color: "#1A1612" }}>
              drop your photo here
            </p>

            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.9375rem", color: "#6B5E57" }}>
              or{" "}
              <span
                style={{ color: "#E85D75", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click() }}
              >
                browse files
              </span>
            </p>

            <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "#9B8E87" }}>or</p>
              <button
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "#6AB8E8",
                  border: "1.5px solid #6AB8E8",
                  borderRadius: 999,
                  background: "transparent",
                  padding: "5px 16px",
                  cursor: "pointer",
                }}
                onClick={openCamera}
              >
                take a photo 📸
              </button>
            </div>

            <p style={{ fontFamily: "var(--font-body)", fontSize: "0.8125rem", color: "#9B8E87" }}>
              JPG, PNG, WEBP — max 10 MB
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: "none" }}
              onChange={(e) => {
                handleFileChange(e)
                if (e.target.files?.[0]) setFileSelected(true)
              }}
            />
          </motion.div>
        </div>

        <AnimatePresence>
          {fileSelected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4 }}
              style={{ width: "100%", maxWidth: 480 }}
            >
              <BudgetSelector selected={budget} onSelect={onBudgetChange} />
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          {["Face forward", "Natural light", "No filters"].map((tip) => (
            <span
              key={tip}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "5px 14px",
                borderRadius: 999,
                background: "white",
                border: "1px solid rgba(0,0,0,0.08)",
                color: "#6B5E57",
              }}
            >
              {tip}
            </span>
          ))}
        </div>
      </section>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ── CAMERA MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.70)", backdropFilter: "blur(4px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCamera}
          >
            <motion.div
              style={{ background: "white", borderRadius: 24, overflow: "hidden", width: "min(90vw, 500px)", maxHeight: "85vh", position: "relative" }}
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                style={{ position: "absolute", top: 12, left: 12, zIndex: 20, fontFamily: "var(--font-body)", fontSize: 13, background: "rgba(0,0,0,0.12)", color: "#1A1612", border: "none", borderRadius: 999, padding: "4px 12px", cursor: "pointer" }}
                onClick={closeCamera}
              >
                ✕ close
              </button>

              {!cameraError && (
                <button
                  style={{ position: "absolute", top: 12, right: 12, zIndex: 20, background: "rgba(0,0,0,0.12)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={flipCamera}
                  title="Flip camera"
                >
                  📷
                </button>
              )}

              {cameraError ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "3rem 2rem 2rem" }}>
                  <div style={{ background: "#FFE566", borderRadius: 4, padding: "10px 16px", fontFamily: "var(--font-body)", fontSize: 13, color: "#1A1612", transform: "rotate(-1deg)", textAlign: "center", lineHeight: 1.6, maxWidth: 280 }}>
                    {cameraError}
                  </div>
                  <button
                    style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#E85D75", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                    onClick={closeCamera}
                  >
                    use file upload instead
                  </button>
                </div>
              ) : (
                <>
                  <div style={{ position: "relative", lineHeight: 0 }}>
                    {previewSrc && (
                      <img src={previewSrc} alt="capture preview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 10 }} />
                    )}
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", maxHeight: "55vh", objectFit: "cover", display: "block" }} />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <div style={{ position: "relative", width: "58%", height: "78%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <motion.div
                          style={{ position: "absolute", inset: 0, border: "2px dashed rgba(255,255,255,0.75)", borderRadius: "50% 50% 45% 45% / 60% 60% 40% 40%" }}
                          animate={{ opacity: [0.6, 1, 0.6] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <span style={{ position: "absolute", bottom: -28, fontFamily: "var(--font-body)", fontSize: 11, color: "rgba(255,255,255,0.85)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
                          center your face here ✦
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem" }}>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={capture}
                      style={{ width: 72, height: 72, borderRadius: "50%", background: "white", border: "4px solid #E85D75", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                      aria-label="Capture photo"
                    >
                      <div style={{ width: 50, height: 50, borderRadius: "50%", backgroundColor: "#E85D75" }} />
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
