"use client";

import { useEffect, useState } from "react";
import { Page } from "@/components/ui/Page";
import { motion } from "framer-motion";
import MonkScaleBar from "./MonkScaleBar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// What the pipeline actually does, in order. Presented as a description of the
// work rather than as live status: /analyze is a single request, so the client
// genuinely does not know which stage is running. The previous version cycled
// these on a 1.8s timer, which looked like progress reporting and wasn't —
// "See how it works" mode (/analyze-stream) is where real per-stage feedback
// lives.
const PIPELINE = [
  "Correcting white balance",
  "Locating 468 facial landmarks",
  "Checking blur, exposure and head angle",
  "Sampling skin patches, discarding outliers",
  "Classifying depth and undertone",
  "Matching against the shade catalogue",
];

export default function AnalyzingScreen({
  qualityErrors,
  onReset,
}: {
  qualityErrors: string[] | null;
  onReset: () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (qualityErrors) return;
    const id = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [qualityErrors]);

  if (qualityErrors) {
    return (
      <Page width="prose">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-label uppercase text-warn">
            That photo won&apos;t give a good read
          </p>
          <h1 className="mt-2 font-display text-title text-text">
            Let&apos;s try another
          </h1>

          {/* role="alert" so this is announced — the old version rendered the
              reasons silently. */}
          <ul className="mt-6 space-y-3" role="alert">
            {qualityErrors.map((error) => (
              <li
                key={error}
                className="rounded-card border border-warn/30 bg-warn/10 px-4 py-3 text-text"
              >
                {error}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-small text-text-soft">
            We check this before analysing rather than after, because a
            confidently wrong shade is worse than asking for a second photo.
          </p>

          <Button className="mt-6" onClick={onReset}>
            Try another photo
          </Button>
        </motion.div>
      </Page>
    );
  }

  return (
    <Page width="prose">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <p className="text-label uppercase text-accent">Working on it</p>
        <h1
          className="mt-2 font-display text-title text-text"
          role="status"
          aria-live="polite"
        >
          Reading your skin tone
        </h1>
        <p className="mt-2 text-small text-text-soft">
          Usually 10–20 seconds.
          {seconds >= 25 && " Taking longer than usual — still going."}
        </p>

        <div className="my-8">
          <MonkScaleBar animate className="w-full" />
        </div>

        <Card padding="md">
          <h2 className="text-label uppercase text-text-muted">
            What&apos;s happening
          </h2>
          <ol className="mt-3 space-y-2">
            {PIPELINE.map((step) => (
              <li
                key={step}
                className="flex items-start gap-2.5 text-small text-text-soft"
              >
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/50"
                  aria-hidden="true"
                />
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t border-line pt-3 text-small text-text-muted">
            Want to watch this happen live? Choose{" "}
            <span className="text-text">Show the pipeline</span> on the upload
            screen.
          </p>
        </Card>
      </motion.div>
    </Page>
  );
}
