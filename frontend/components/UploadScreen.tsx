"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Page } from "@/components/ui/Page";
import Link from "next/link";
import { motion } from "framer-motion";
import CameraModal from "./CameraModal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type BudgetValue = "drugstore" | "mid" | "high" | "all";
export type AnalyseMode = "normal" | "stream";

const BUDGET_OPTIONS: { label: string; sub: string; value: BudgetValue }[] = [
  { label: "Drugstore", sub: "under $20", value: "drugstore" },
  { label: "Mid-range", sub: "$20–60", value: "mid" },
  { label: "High-end", sub: "$60+", value: "high" },
  { label: "Everything", sub: "", value: "all" },
];

const TIPS = [
  { title: "Face the light", body: "A window beats a ceiling bulb. Avoid coloured light." },
  { title: "No filters", body: "Beauty modes change the very thing we measure." },
  { title: "Bare skin helps", body: "Foundation shifts the reading toward the shade you already wear." },
];

export default function UploadScreen({
  onUpload,
}: {
  onUpload: (file: File, budget: BudgetValue, mode: AnalyseMode) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);
  const [showCamera, setCamera] = useState(false);
  const [budget, setBudget] = useState<BudgetValue>("all");
  const [mode, setMode] = useState<AnalyseMode>("normal");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tinted_mode") as AnalyseMode | null;
      if (saved === "normal" || saved === "stream") setMode(saved);
    } catch {
      /* localStorage unavailable (SSR, private mode) — the default stands. */
    }
  }, []);

  const handleModeChange = useCallback((next: AnalyseMode) => {
    setMode(next);
    try {
      localStorage.setItem("tinted_mode", next);
    } catch {
      /* Not worth surfacing — the choice just won't persist. */
    }
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) onUpload(file, budget, mode);
    },
    [onUpload, budget, mode],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) onUpload(file, budget, mode);
    },
    [onUpload, budget, mode],
  );

  return (
    <Page width="grid">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl"
      >
        <p className="text-label uppercase text-accent">AI shade matching</p>
        <h1 className="mt-2 font-display text-title leading-tight text-text md:text-display">
          Find the shade that actually matches you.
        </h1>
        <p className="mt-4 max-w-prose text-text-soft">
          Upload a photo and we&apos;ll read your depth and undertone from your
          skin directly, then match you against real products. No camera? The
          quiz gets you there too.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* A real button, so the primary action is reachable by keyboard —
              the previous drop zone was a click-only div. */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex w-full flex-col items-center gap-4 rounded-card border border-dashed p-10",
              "transition-colors duration-[--duration-fast]",
              isDragging
                ? "border-accent bg-accent-dim"
                : "border-line-strong bg-surface hover:border-accent hover:bg-raised",
            )}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-line-strong">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-5 w-5 text-accent"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17,8 12,3 7,8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </span>
            <span className="text-center">
              <span className="block font-medium text-text">
                Drop a photo, or browse
              </span>
              <span className="mt-1 block text-small text-text-muted">
                JPEG, PNG or WebP · up to 8 MB
              </span>
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setCamera(true)}>
              Use camera
            </Button>
            <span className="text-small text-text-muted">or</span>
            <Link
              href="/quiz"
              className="inline-flex min-h-11 items-center text-small font-medium text-accent hover:text-accent-bright"
            >
              take the skincare quiz instead →
            </Link>
          </div>

          {/* Mode */}
          <fieldset className="mt-8">
            <legend className="text-label uppercase text-text-muted">
              Mode
            </legend>
            <div className="mt-3 flex gap-2">
              {(
                [
                  { value: "normal", label: "Just analyse" },
                  { value: "stream", label: "Show the pipeline" },
                ] as const
              ).map(({ value, label }) => {
                const active = mode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleModeChange(value)}
                    className={cn(
                      "min-h-11 flex-1 rounded-pill border px-4 text-small transition-colors",
                      active
                        ? "border-accent bg-accent-dim text-accent-bright"
                        : "border-line text-text-soft hover:border-line-strong hover:text-text",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {mode === "stream" && (
              <p className="mt-2 text-small text-text-muted">
                Watch each stage — detection, quality gate, sampling,
                classification — as it runs.
              </p>
            )}
          </fieldset>

          {/* Budget */}
          <fieldset className="mt-6">
            <legend className="text-label uppercase text-text-muted">
              Budget
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {BUDGET_OPTIONS.map(({ label, sub, value }) => {
                const selected = budget === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setBudget(value)}
                    className={cn(
                      "min-h-11 rounded-pill border px-4 text-small transition-colors",
                      selected
                        ? "border-accent bg-accent-dim text-accent-bright"
                        : "border-line text-text-soft hover:border-line-strong hover:text-text",
                    )}
                  >
                    {label}
                    {sub && (
                      <span className="ml-1.5 text-text-muted">{sub}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </motion.div>

        {/* Coaching before capture beats an error after it. */}
        <motion.aside
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          aria-labelledby="tips-heading"
          className="rounded-card border border-line bg-surface p-5"
        >
          <h2
            id="tips-heading"
            className="text-label uppercase text-text-muted"
          >
            For a good read
          </h2>
          <ul className="mt-4 space-y-4">
            {TIPS.map((tip) => (
              <li key={tip.title}>
                <p className="font-medium text-text">{tip.title}</p>
                <p className="mt-0.5 text-small leading-relaxed text-text-muted">
                  {tip.body}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-line pt-4 text-small text-text-muted">
            Your photo is analysed and discarded. We don&apos;t store it.
          </p>
        </motion.aside>
      </div>

      {showCamera && (
        <CameraModal
          onCapture={(file) => {
            setCamera(false);
            onUpload(file, budget, mode);
          }}
          onClose={() => setCamera(false)}
        />
      )}
    </Page>
  );
}
