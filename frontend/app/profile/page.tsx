"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import { Sticker, FlowerSticker, SparkleSticker } from "@/components/Stickers"

// ── Types ─────────────────────────────────────────────────────────────────────

type MatchedShade = { shade_name: string; hex: string; description: string; recommendation: string }

type HistoryRow = {
  id: string
  created_at: string
  monk_scale: string
  undertone: string
  avg_hex: string
  matched_shades: MatchedShade[]
  budget: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function mode<T>(arr: T[]): T | null {
  if (!arr.length) return null
  const freq = new Map<string, number>()
  for (const v of arr) {
    const k = String(v)
    freq.set(k, (freq.get(k) ?? 0) + 1)
  }
  let best = ""
  let bestN = 0
  for (const [k, n] of freq) {
    if (n > bestN) { best = k; bestN = n }
  }
  return best as T
}

const STAT_ROTATIONS = ["-1deg", "0.5deg", "1.5deg"]
const STAT_STICKERS: Array<{ type: "sparkle" | "flower" | "star"; color: string; rotate: number }> = [
  { type: "sparkle", color: "#E85D75", rotate: 10  },
  { type: "flower",  color: "#E8A020", rotate: -15 },
  { type: "star",    color: "#C4A8F0", rotate: 20  },
]

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  value, label, index,
}: { value: string; label: string; index: number }) {
  const s = STAT_STICKERS[index]
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + index * 0.12 }}
      className="polaroid relative text-center p-6"
      style={{ transform: `rotate(${STAT_ROTATIONS[index]})` }}
    >
      <div className="absolute top-2 right-2 pointer-events-none">
        <Sticker type={s.type} size={16} color={s.color} rotate={s.rotate} />
      </div>
      <p style={{ fontFamily: "var(--font-display), serif", fontSize: 32, fontWeight: 400, color: "var(--rose)", lineHeight: 1, marginBottom: 6 }}>
        {value}
      </p>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.10em", textTransform: "uppercase" }}>
        {label}
      </p>
    </motion.div>
  )
}

// ── History card ──────────────────────────────────────────────────────────────

function HistoryCard({ row, index }: { row: HistoryRow; index: number }) {
  const hexColors = (row.matched_shades ?? []).slice(0, 3).map((s) => s.hex)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.08 }}
      whileHover={{ scale: 1.02, boxShadow: "4px 8px 24px rgba(0,0,0,0.14)" }}
      className="scrapbook-card p-6 cursor-default"
    >
      {/* Date */}
      <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "var(--text-muted)", marginBottom: 12 }}>
        {formatDate(row.created_at)}
      </p>

      {/* Swatch + MST + undertone */}
      <div className="flex items-center gap-3 mb-4" style={{ flexWrap: "wrap" }}>
        <div
          className="rounded-full flex-shrink-0"
          style={{ width: 40, height: 40, backgroundColor: row.avg_hex, boxShadow: `0 0 12px 3px ${row.avg_hex}55` }}
        />
        <span style={{ fontFamily: "var(--font-display), serif", fontSize: 22, fontWeight: 400, color: "var(--text)" }}>
          {row.monk_scale}
        </span>
        <span
          className="tag-pill"
          style={{ fontSize: 11, color: "var(--text-muted)", borderColor: "rgba(0,0,0,0.18)", background: "rgba(255,255,255,0.85)" }}
        >
          {row.undertone} undertone
        </span>
      </div>

      {/* Matched shade squares */}
      {hexColors.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 4 }}>
            shades
          </p>
          {hexColors.map((hex, i) => (
            <div
              key={i}
              className="rounded-sm flex-shrink-0"
              style={{ width: 24, height: 24, backgroundColor: hex, boxShadow: "1px 1px 4px rgba(0,0,0,0.12)" }}
              title={hex}
            />
          ))}
        </div>
      )}

      {/* Budget tag */}
      {row.budget && row.budget !== "all" && (
        <span
          className="tag-pill"
          style={{ fontSize: 10, color: "var(--sage)", borderColor: "var(--sage)", background: "rgba(109,191,138,0.10)", fontWeight: 600 }}
        >
          {row.budget}
        </span>
      )}
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const supabase = useRef(createClient()).current
  const router   = useRouter()

  const [user,    setUser]    = useState<User | null>(null)
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/")
        return
      }
      setUser(session.user)

      const { data } = await supabase
        .from("shade_history")
        .select("*")
        .order("created_at", { ascending: false })

      setHistory((data as HistoryRow[]) ?? [])
      setLoading(false)
    })
  }, [supabase, router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  // Derive stats
  const totalAnalyses  = history.length
  const commonMST      = mode(history.map((r) => r.monk_scale)) ?? "—"
  const commonUndertone = mode(history.map((r) => r.undertone)) ?? "—"

  if (loading) {
    return (
      <div className="animated-bg min-h-screen flex items-center justify-center">
        <span className="sticky-note" style={{ transform: "rotate(-1deg)" }}>
          loading your profile...
          <SparkleSticker size={14} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 6 }} />
        </span>
      </div>
    )
  }

  return (
    <div className="animated-bg min-h-screen px-6 py-12">
      <div className="max-w-2xl mx-auto">

        {/* ── Header ── */}
        <motion.div
          className="flex items-start justify-between mb-12"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1
              className="title-shimmer font-[family-name:var(--font-display)]"
              style={{ fontSize: "clamp(28px, 6vw, 40px)", fontWeight: 400, marginBottom: 6 }}
            >
              my tinted profile
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
              {user?.email}
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="tag-pill cursor-pointer flex-shrink-0"
            style={{ color: "var(--rose)", borderColor: "var(--rose)", background: "rgba(255,255,255,0.88)", fontWeight: 600, fontSize: 13 }}
          >
            sign out
          </button>
        </motion.div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <StatCard value={String(totalAnalyses)} label="total analyses"   index={0} />
          <StatCard value={commonMST}              label="top skin tone"    index={1} />
          <StatCard value={commonUndertone}        label="your undertone"   index={2} />
        </div>

        {/* Washi tape divider */}
        <div className="washi-tape w-full mb-10" style={{ opacity: 0.5 }} />

        {/* ── History section ── */}
        <div className="mb-6">
          <h2
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: 26, fontWeight: 400, color: "var(--text)",
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            }}
          >
            your shade history
            <SparkleSticker size={18} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle" }} />
          </h2>
          <span className="sticky-note" style={{ transform: "rotate(-1deg)", fontSize: 12 }}>
            every time you&apos;ve been analyzed
          </span>
        </div>

        {history.length === 0 ? (
          <motion.div
            className="flex flex-col items-center gap-4 py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <span
              className="sticky-note text-center"
              style={{ transform: "rotate(-0.5deg)", display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, lineHeight: 1.6 }}
            >
              no analyses yet!<br />go find your shade
              <FlowerSticker size={16} color="#E85D75" style={{ display: "inline-block", verticalAlign: "middle" }} />
            </span>
            <a
              href="/"
              className="tag-pill cursor-pointer"
              style={{ color: "var(--rose)", borderColor: "var(--rose)", background: "rgba(255,255,255,0.88)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
            >
              → find my shade
            </a>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {history.map((row, i) => (
              <HistoryCard key={row.id} row={row} index={i} />
            ))}
          </div>
        )}

        {/* Washi tape footer */}
        <div className="washi-tape w-full mt-12" style={{ opacity: 0.35 }} />
      </div>
    </div>
  )
}
