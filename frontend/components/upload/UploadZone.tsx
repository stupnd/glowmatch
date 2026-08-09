"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface UploadZoneProps {
  onFileReady?: (file: File) => void;
  className?: string;
}

export function UploadZone({ onFileReady, className }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [dragOver, setDragOver] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [cameraError, setCameraError] = useState<string | null>(null);

  const emitFile = useCallback(
    (file: File) => {
      onFileReady?.(file);
    },
    [onFileReady],
  );

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode, width: 1280, height: 720 } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
      })
      .catch(() => {
        if (!cancelled)
          setCameraError("Allow camera access in your browser settings.");
      });

    return () => {
      cancelled = true;
    };
  }, [cameraOpen, facingMode]);

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraError(null);
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "tinted-camera.jpg", {
          type: "image/jpeg",
        });
        closeCamera();
        emitFile(file);
      },
      "image/jpeg",
      0.92,
    );
  }, [closeCamera, emitFile]);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) emitFile(file);
  };

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) emitFile(file);
    e.target.value = "";
  };

  return (
    <div className={cn("w-full", className)}>
      <motion.div
        layout
        className={cn(
          "cursor-pointer rounded-card border-2 border-dashed bg-canvas p-10 text-center transition-colors md:p-12",
          dragOver
            ? "border-flare bg-blush shadow-rose"
            : "border-mauve/50 hover:border-plum/60 hover:bg-blush/60",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <p className="font-display text-2xl font-bold text-plum md:text-3xl">
          Drop your selfie here
        </p>
        <p className="mt-3 font-sans text-sm text-berry/70 md:text-base">
          High-res · Face forward · Natural light wins
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <span className="rounded-full bg-plum px-5 py-2 font-sans text-xs font-bold uppercase tracking-widest text-canvas shadow-plum">
            JPG · PNG · WEBP
          </span>
          <button
            type="button"
            className="rounded-full border-2 border-plum bg-canvas px-5 py-2 font-sans text-xs font-bold uppercase tracking-widest text-plum transition-colors hover:bg-blush"
            onClick={(e) => {
              e.stopPropagation();
              setCameraOpen(true);
            }}
          >
            Use camera
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={onPick}
          aria-hidden
        />
      </motion.div>

      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <AnimatePresence>
        {cameraOpen ? (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-berry/70 px-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCamera}
          >
            <motion.div
              className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-card border border-mauve/40 bg-canvas shadow-plum"
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-mauve/25 px-4 py-3">
                <button
                  type="button"
                  className="font-sans text-sm font-semibold text-plum hover:underline"
                  onClick={closeCamera}
                >
                  Close
                </button>
                {!cameraError ? (
                  <button
                    type="button"
                    className="rounded-full border border-mauve/40 px-3 py-1 font-sans text-xs font-semibold uppercase tracking-wide text-plum hover:bg-blush"
                    onClick={() =>
                      setFacingMode((m) =>
                        m === "user" ? "environment" : "user",
                      )
                    }
                  >
                    Flip
                  </button>
                ) : null}
              </div>
              {cameraError ? (
                <div className="p-8 text-center font-sans text-sm text-berry">
                  {cameraError}
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="aspect-[4/5] w-full bg-berry object-cover"
                  />
                  <div className="flex justify-center py-5">
                    <button
                      type="button"
                      aria-label="Capture"
                      className="h-16 w-16 rounded-full border-4 border-plum bg-flare shadow-rose ring-4 ring-blush transition-transform hover:scale-105"
                      onClick={capture}
                    />
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
