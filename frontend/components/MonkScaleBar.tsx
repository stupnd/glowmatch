"use client"

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
]

interface Props {
  highlightLevel?: number  // 1–10, which segment to mark
  animate?: boolean        // shimmer sweep when true
  className?: string
}

export default function MonkScaleBar({ highlightLevel, animate, className }: Props) {
  // Center of segment N: ((N - 0.5) / 10) * 100 %
  const markerLeft = highlightLevel != null
    ? `${((highlightLevel - 0.5) / 10) * 100}%`
    : null

  return (
    <div className={`relative ${className ?? ""}`}>
      {/* 10-segment bar */}
      <div
        className="relative h-3.5 rounded-full overflow-hidden flex"
        style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        {MONK_COLORS.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}

        {/* Shimmer sweep — lives inside overflow:hidden so it clips cleanly */}
        {animate && (
          <div
            className="absolute inset-0 pointer-events-none animate-shimmer-sweep"
            style={{
              width: "40%",
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)",
            }}
          />
        )}

        {/* Marker line (white) */}
        {markerLeft && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white"
            style={{
              left: markerLeft,
              transform: "translateX(-50%)",
              boxShadow: "0 0 6px 1px rgba(255,255,255,0.9)",
            }}
          />
        )}
      </div>

      {/* Accent dot below marker */}
      {markerLeft && (
        <div
          className="absolute w-2 h-2 rounded-full bg-[#c68642]"
          style={{
            left: markerLeft,
            bottom: "-6px",
            transform: "translateX(-50%)",
            boxShadow: "0 0 8px 2px rgba(198,134,66,0.65)",
          }}
        />
      )}

      {/* Labels */}
      <div className="flex justify-between mt-4">
        <span className="text-[10px] text-white/20 tracking-widest uppercase">MST-1</span>
        <span className="text-[10px] text-white/20 tracking-widest uppercase">MST-10</span>
      </div>
    </div>
  )
}
