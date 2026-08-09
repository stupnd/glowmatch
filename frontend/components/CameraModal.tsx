"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion } from "framer-motion"

interface Props {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function CameraModal({ onCapture, onClose }: Props) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
        setError(null)
      })
      .catch(() => {
        if (!cancelled) setError("Camera access needed — check your browser settings.")
      })

    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [facingMode])

  const capture = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw un-mirrored (natural feed) so backend receives correct colors
    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], "capture.jpg", { type: "image/jpeg" })
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      onCapture(file)
    }, "image/jpeg", 0.92)
  }, [onCapture])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-[min(92vw,460px)] bg-[#111] rounded-2xl overflow-hidden ring-1 ring-white/[0.08]"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-20 text-xs text-white/60 hover:text-white bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5 transition-colors"
        >
          close
        </button>

        {/* Flip */}
        {!error && (
          <button
            onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
            className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-white/60 hover:text-white transition-colors"
            title="Flip camera"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M1 4v6h6" />
              <path d="M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
          </button>
        )}

        {error ? (
          <div className="flex flex-col items-center gap-4 p-12 text-center">
            <p className="text-white/50 text-sm leading-relaxed">{error}</p>
            <button
              onClick={onClose}
              className="text-[#c68642] text-sm underline underline-offset-2"
            >
              use file upload instead
            </button>
          </div>
        ) : (
          <>
            {/* Video + oval overlay */}
            <div className="relative aspect-[3/4]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />

              {/* SVG oval mask */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg
                  viewBox="0 0 100 130"
                  className="w-[58%] h-[75%]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <mask id="oval-hole">
                      <rect width="100" height="130" fill="white" />
                      <ellipse cx="50" cy="65" rx="44" ry="58" fill="black" />
                    </mask>
                  </defs>
                  <rect
                    width="100"
                    height="130"
                    fill="rgba(0,0,0,0.48)"
                    mask="url(#oval-hole)"
                  />
                  <ellipse
                    cx="50"
                    cy="65"
                    rx="44"
                    ry="58"
                    fill="none"
                    stroke="#c68642"
                    strokeWidth="1.5"
                    strokeDasharray="5 3"
                  />
                </svg>
              </div>

              <p className="absolute bottom-3 left-0 right-0 text-center text-white/50 text-[11px] tracking-wide pointer-events-none">
                center your face in the oval
              </p>
            </div>

            {/* Capture button */}
            <div className="flex justify-center py-5 bg-[#0a0a0a]">
              <button
                onClick={capture}
                className="w-16 h-16 rounded-full flex items-center justify-center border-4 border-[#c68642] bg-black active:scale-95 transition-transform"
                aria-label="Capture photo"
              >
                <div className="w-11 h-11 rounded-full bg-[#c68642]" />
              </button>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </motion.div>
  )
}
