"use client";

import { cn } from "@/lib/utils";

const MONK_COLORS = [
  "#f6ede4", // MST-1
  "#f3e7db", // MST-2
  "#f7ead0", // MST-3
  "#eadaba", // MST-4
  "#d7bd96", // MST-5
  "#a07850", // MST-6
  "#825c43", // MST-7
  "#604134", // MST-8
  "#3a312a", // MST-9
  "#292420", // MST-10
];

export default function MonkScaleBar({
  highlightLevel,
  animate,
  className,
}: {
  /** 1–10, which segment to mark. */
  highlightLevel?: number;
  /** Shimmer sweep, for the analysing state. */
  animate?: boolean;
  className?: string;
}) {
  // Centre of segment N: ((N - 0.5) / 10) * 100%
  const markerLeft =
    highlightLevel != null
      ? `${((highlightLevel - 0.5) / 10) * 100}%`
      : null;

  return (
    <figure className={cn("relative m-0", className)}>
      <div
        className="relative flex h-3.5 overflow-hidden rounded-pill ring-1 ring-line"
        // The bar is a meaningful graphic, not decoration — without a role and
        // a label a screen reader gets ten unlabelled divs.
        role="img"
        aria-label={
          highlightLevel != null
            ? `Monk Skin Tone scale, 1 to 10. Your match is level ${highlightLevel}.`
            : "Monk Skin Tone scale, 1 to 10."
        }
      >
        {MONK_COLORS.map((color, index) => (
          <div
            key={index}
            className="flex-1"
            style={{ backgroundColor: color }}
          />
        ))}

        {animate && (
          <div
            className="animate-shimmer-sweep pointer-events-none absolute inset-0"
            style={{
              width: "40%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
            }}
            aria-hidden="true"
          />
        )}

        {markerLeft && (
          <div
            className="absolute bottom-0 top-0 w-0.5 bg-white"
            style={{
              left: markerLeft,
              transform: "translateX(-50%)",
              boxShadow: "0 0 6px 1px rgba(255,255,255,0.9)",
            }}
            aria-hidden="true"
          />
        )}
      </div>

      {markerLeft && (
        <div
          className="absolute h-2 w-2 rounded-full bg-accent"
          style={{
            left: markerLeft,
            bottom: "-6px",
            transform: "translateX(-50%)",
            boxShadow: "0 0 8px 2px rgba(198,134,66,0.65)",
          }}
          aria-hidden="true"
        />
      )}

      {/* Was white/20 — about 1.5:1, effectively invisible. */}
      <figcaption className="mt-4 flex justify-between text-label uppercase text-text-muted">
        <span>MST-1</span>
        {highlightLevel != null && (
          <span className="text-accent">Level {highlightLevel}</span>
        )}
        <span>MST-10</span>
      </figcaption>
    </figure>
  );
}
