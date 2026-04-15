"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"
import { Sticker, FlowerSticker, SparkleSticker, HeartSticker, BlobSticker } from "@/components/Stickers"

// ── Types ─────────────────────────────────────────────────────────────────────

type ShadeRec = { brand: string; product: string; shade: string; price_range: string; why: string }

type MatchedShade = { shade_name: string; hex: string; description: string; recommendation: string }

type HistoryRow = {
  id: string
  created_at: string
  monk_scale: string
  undertone: string
  avg_hex: string
  matched_shades: MatchedShade[]
  budget: string | null
  recommendations?: {
    foundation?: ShadeRec[]
    concealer?: ShadeRec[]
    blush?:     ShadeRec[]
    bronzer?:   ShadeRec[]
    lip?:       ShadeRec[]
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
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

const CARD_ROTATIONS = ["-1deg", "0.5deg", "1.5deg", "-0.5deg"]

const UNDERTONE_COLORS: Record<string, string> = {
  warm:    "#E8A020",
  cool:    "#6AB8E8",
  neutral: "#6DBF8A",
}

// ── Stat card ─────────────────────────────────────────────────────────────────

type StatCardProps = {
  index: number
  label: string
} & (
  | { kind: "count";    value: string }
  | { kind: "mst";      value: string; hex: string }
  | { kind: "undertone"; value: string }
)

function StatCard(props: StatCardProps) {
  const STICKERS: Array<{ type: "sparkle" | "flower" | "star"; color: string; rotate: number }> = [
    { type: "sparkle", color: "#E85D75", rotate: 10  },
    { type: "flower",  color: "#E8A020", rotate: -15 },
    { type: "star",    color: "#C4A8F0", rotate: 20  },
  ]
  const s = STICKERS[props.index]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 + props.index * 0.12 }}
      className="polaroid relative text-center p-6"
      style={{ transform: `rotate(${CARD_ROTATIONS[props.index]})` }}
    >
      <div className="absolute top-2 right-2 pointer-events-none">
        <Sticker type={s.type} size={16} color={s.color} rotate={s.rotate} />
      </div>

      {props.kind === "count" && (
        <p style={{ fontFamily: "var(--font-display), serif", fontSize: 36, fontWeight: 400, color: "var(--rose)", lineHeight: 1, marginBottom: 6 }}>
          {props.value}
        </p>
      )}

      {props.kind === "mst" && (
        <div className="flex flex-col items-center gap-2 mb-1">
          <div
            className="rounded-full"
            style={{ width: 36, height: 36, backgroundColor: props.hex, boxShadow: `0 0 10px 3px ${props.hex}66`, flexShrink: 0 }}
          />
          <p style={{ fontFamily: "var(--font-display), serif", fontSize: 22, fontWeight: 400, color: "var(--text)", lineHeight: 1 }}>
            {props.value}
          </p>
        </div>
      )}

      {props.kind === "undertone" && (
        <div className="flex flex-col items-center gap-2 mb-1">
          <span
            className="tag-pill"
            style={{
              fontSize: 11,
              color:       UNDERTONE_COLORS[props.value.toLowerCase()] ?? "var(--text-muted)",
              borderColor: UNDERTONE_COLORS[props.value.toLowerCase()] ?? "rgba(0,0,0,0.18)",
              background:  "rgba(255,255,255,0.9)",
              fontWeight: 600,
            }}
          >
            {props.value}
          </span>
        </div>
      )}

      <p style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.10em", textTransform: "uppercase", marginTop: 4 }}>
        {props.label}
      </p>
    </motion.div>
  )
}

// ── History card ──────────────────────────────────────────────────────────────

function HistoryCard({ row, index }: { row: HistoryRow; index: number }) {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length]

  const hexColors = (row.matched_shades ?? []).slice(0, 3).map((s) => s.hex)

  const recPreviews = useMemo(() => {
    const recs: string[] = []
    const r = row.recommendations
    if (!r) return recs
    const cats = [r.foundation, r.concealer, r.blush, r.bronzer, r.lip]
    for (const cat of cats) {
      if (recs.length >= 3) break
      const first = cat?.[0]
      if (first) {
        const label = `${first.brand} ${first.shade}`.slice(0, 22)
        recs.push(label)
      }
    }
    return recs
  }, [row.recommendations])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.07 }}
      whileHover={{
        scale: 1.02,
        rotate: 0,
        boxShadow: "6px 10px 32px rgba(0,0,0,0.16)",
        transition: { duration: 0.2 },
      }}
      className="polaroid relative cursor-default"
      style={{
        transform:    `rotate(${rotation})`,
        marginBottom: "1.5rem",
        breakInside:  "avoid",
        padding:      "0 0 28px",
      }}
    >
      {/* Washi tape strip */}
      <div className="washi-tape w-full" style={{ borderRadius: "2px 2px 0 0", opacity: 0.85 }} />

      <div className="px-5 pt-4 pb-0">
        {/* Date stamp */}
        <div className="flex justify-end mb-3">
          <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            {formatDateShort(row.created_at)}
          </span>
        </div>

        {/* Skin tone circle + MST + undertone */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="rounded-full flex-shrink-0"
            style={{
              width:     60,
              height:    60,
              backgroundColor: row.avg_hex,
              boxShadow: `0 0 16px 5px ${row.avg_hex}66`,
            }}
          />
          <div className="flex flex-col gap-1">
            <span style={{ fontFamily: "var(--font-display), serif", fontSize: 22, fontWeight: 400, color: "var(--text)", lineHeight: 1 }}>
              {row.monk_scale}
            </span>
            <span
              className="tag-pill"
              style={{
                fontSize:    10,
                color:       UNDERTONE_COLORS[row.undertone?.toLowerCase()] ?? "var(--text-muted)",
                borderColor: UNDERTONE_COLORS[row.undertone?.toLowerCase()] ?? "rgba(0,0,0,0.18)",
                background:  "rgba(255,255,255,0.85)",
                fontWeight:  600,
              }}
            >
              {row.undertone} undertone
            </span>
          </div>
        </div>

        {/* Hex value */}
        <p style={{ fontFamily: "monospace", fontSize: 10, color: "var(--text-muted)", marginBottom: 10, opacity: 0.7 }}>
          {row.avg_hex}
        </p>

        {/* Shade swatches — overlapping circles */}
        {hexColors.length > 0 && (
          <div className="flex items-center mb-3" style={{ gap: 0 }}>
            {hexColors.map((hex, i) => (
              <div
                key={i}
                className="rounded-full flex-shrink-0"
                style={{
                  width:     28,
                  height:    28,
                  backgroundColor: hex,
                  boxShadow: "1px 1px 4px rgba(0,0,0,0.14)",
                  marginLeft: i === 0 ? 0 : -8,
                  border:    "2px solid white",
                  zIndex:    hexColors.length - i,
                  position:  "relative",
                }}
                title={hex}
              />
            ))}
          </div>
        )}

        {/* Budget tag */}
        {row.budget && row.budget !== "all" && (
          <div className="mb-3">
            <span
              className="tag-pill"
              style={{ fontSize: 10, color: "var(--sage)", borderColor: "var(--sage)", background: "rgba(109,191,138,0.10)", fontWeight: 600 }}
            >
              {row.budget}
            </span>
          </div>
        )}

        {/* Rec previews as sticky-note tags */}
        {recPreviews.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recPreviews.map((label, i) => (
              <span
                key={i}
                className="sticky-note"
                style={{
                  fontSize:  10,
                  padding:   "4px 8px",
                  transform: i % 2 === 0 ? "rotate(-1deg)" : "rotate(0.8deg)",
                  whiteSpace: "nowrap",
                  overflow:   "hidden",
                  maxWidth:   120,
                  textOverflow: "ellipsis",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
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

  // Derived stats
  const totalAnalyses   = history.length
  const commonMST       = mode(history.map((r) => r.monk_scale)) ?? "—"
  const commonUndertone = mode(history.map((r) => r.undertone))  ?? "—"
  const mstHex          = history.find((r) => r.monk_scale === commonMST)?.avg_hex ?? "#E8A020"

  const memberSince = user?.created_at ? formatDate(user.created_at) : null

  if (loading) {
    return (
      <div className="animated-bg min-h-screen flex items-center justify-center">
        <span className="sticky-note" style={{ transform: "rotate(-1deg)" }}>
          loading your journal...
          <SparkleSticker size={14} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle", marginLeft: 6 }} />
        </span>
      </div>
    )
  }

  return (
    <div className="animated-bg min-h-screen px-5 py-10">
      {/* Floating bg stickers */}
      <motion.div
        className="fixed pointer-events-none"
        style={{ top: "6rem", right: "3rem", zIndex: 0 }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
      >
        <BlobSticker size={70} color="var(--lilac)" style={{ opacity: 0.12 }} />
      </motion.div>
      <motion.div
        className="fixed pointer-events-none"
        style={{ bottom: "10rem", left: "2rem", zIndex: 0 }}
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <FlowerSticker size={50} color="var(--peach)" style={{ opacity: 0.10 }} />
      </motion.div>

      <div className="relative z-10 max-w-3xl mx-auto">

        {/* ── Navigation row ── */}
        <div className="flex items-center justify-between mb-8">
          <motion.button
            onClick={() => router.push("/")}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="tag-pill cursor-pointer"
            style={{ color: "var(--rose)", borderColor: "var(--rose)", background: "rgba(255,255,255,0.88)", fontWeight: 600, fontSize: 13 }}
          >
            ← find your shade
          </motion.button>

          <div className="flex items-center gap-3">
            <motion.button
              onClick={() => router.push("/lip-combo")}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="tag-pill cursor-pointer"
              style={{ color: "var(--lilac)", borderColor: "var(--lilac)", background: "rgba(255,255,255,0.88)", fontWeight: 600, fontSize: 13 }}
            >
              limbo →
            </motion.button>
            <button
              onClick={handleSignOut}
              className="tag-pill cursor-pointer"
              style={{ color: "var(--text-muted)", borderColor: "rgba(0,0,0,0.2)", background: "rgba(255,255,255,0.75)", fontWeight: 500, fontSize: 12 }}
            >
              sign out
            </button>
          </div>
        </div>

        {/* ── Header section ── */}
        <motion.div
          className="flex items-start gap-8 mb-10"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Polaroid avatar card */}
          <div
            className="polaroid relative flex-shrink-0"
            style={{ width: 170, transform: "rotate(-1.5deg)", padding: "0 0 28px" }}
          >
            {/* Washi tape across top */}
            <div className="washi-tape w-full" style={{ borderRadius: "2px 2px 0 0", opacity: 0.9 }} />
            <div className="flex flex-col items-center gap-2 px-4 pt-5">
              {/* Initial circle */}
              <div
                className="rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  width:      72,
                  height:     72,
                  background: "var(--rose)",
                  fontSize:   32,
                  fontFamily: "var(--font-display), serif",
                  color:      "#fff",
                  boxShadow:  "0 4px 16px rgba(232,93,117,0.35)",
                }}
              >
                {user?.email?.[0]?.toUpperCase() ?? "?"}
              </div>
              {/* Email */}
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize:   10,
                  color:      "var(--text-muted)",
                  textAlign:  "center",
                  wordBreak:  "break-all",
                  lineHeight: 1.4,
                }}
              >
                {user?.email}
              </p>
              {/* Member since */}
              {memberSince && (
                <p style={{ fontFamily: "var(--font-body)", fontSize: 9, color: "var(--text-muted)", textAlign: "center", opacity: 0.75 }}>
                  member since<br />{memberSince}
                </p>
              )}
            </div>
          </div>

          {/* Title + decorative stickers */}
          <div className="flex-1 relative pt-2">
            <h1
              className="title-shimmer font-[family-name:var(--font-display)]"
              style={{ fontSize: "clamp(28px, 6vw, 48px)", fontWeight: 400, marginBottom: 12, lineHeight: 1.1 }}
            >
              my tinted journal
            </h1>

            {/* Floating decorative stickers (desktop only) */}
            <div className="hidden sm:block">
              <motion.div
                className="absolute pointer-events-none"
                style={{ top: "0.5rem", right: "3rem" }}
                animate={{ rotate: [0, 15, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sticker type="sparkle" size={32} color="var(--gold)" rotate={10} style={{ opacity: 0.55 }} />
              </motion.div>
              <motion.div
                className="absolute pointer-events-none"
                style={{ top: "2.5rem", right: "1rem" }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sticker type="flower" size={24} color="var(--rose)" rotate={-15} style={{ opacity: 0.45 }} />
              </motion.div>
              <motion.div
                className="absolute pointer-events-none"
                style={{ top: "0rem", right: "6rem" }}
                animate={{ rotate: [0, -10, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <HeartSticker size={20} color="var(--peach)" style={{ opacity: 0.40 }} />
              </motion.div>
            </div>

            {totalAnalyses > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="sticky-note" style={{ transform: "rotate(-0.5deg)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {totalAnalyses} shade{totalAnalyses !== 1 ? "s" : ""} found so far
                  <SparkleSticker size={12} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle" }} />
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Stats row ── */}
        {totalAnalyses > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            <StatCard kind="count"    index={0} label="analyses done"  value={String(totalAnalyses)} />
            <StatCard kind="mst"      index={1} label="most common tone" value={commonMST} hex={mstHex} />
            <StatCard kind="undertone" index={2} label="undertone"     value={commonUndertone} />
          </div>
        )}

        {/* Washi tape divider */}
        <div className="washi-tape w-full mb-10" style={{ opacity: 0.45 }} />

        {/* ── Shade history section ── */}
        <div className="mb-6">
          <h2
            style={{
              fontFamily: "var(--font-display), serif",
              fontSize: 26, fontWeight: 400, color: "var(--text)",
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
            }}
          >
            my shade diary
            <SparkleSticker size={18} color="#E8A020" style={{ display: "inline-block", verticalAlign: "middle" }} />
          </h2>
          <span className="sticky-note" style={{ transform: "rotate(-1deg)", fontSize: 12 }}>
            every time you&apos;ve found your match
          </span>
        </div>

        <AnimatePresence mode="wait">
          {history.length === 0 ? (
            <motion.div
              key="empty"
              className="flex flex-col items-center gap-5 py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <FlowerSticker size={48} color="#E85D75" style={{ opacity: 0.7 }} />
              </motion.div>
              <div
                className="sticky-note text-center"
                style={{ transform: "rotate(-0.5deg)", fontSize: 15, lineHeight: 1.7, maxWidth: 280, whiteSpace: "normal" }}
              >
                your shade diary is empty!<br />
                go find your first match ✦
              </div>
              <a
                href="/"
                className="tag-pill cursor-pointer"
                style={{ color: "var(--rose)", borderColor: "var(--rose)", background: "rgba(255,255,255,0.88)", fontWeight: 600, fontSize: 13, textDecoration: "none" }}
              >
                → find my shade
              </a>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{
                columns:    "2",
                columnGap:  "1.5rem",
              }}
              className="[&>*]:block sm:[columns:2] [columns:1]"
            >
              {history.map((row, i) => (
                <HistoryCard key={row.id} row={row} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Washi tape footer */}
        <div className="washi-tape w-full mt-12" style={{ opacity: 0.35 }} />
      </div>
    </div>
  )
}
