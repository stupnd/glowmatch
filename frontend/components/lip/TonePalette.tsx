"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchLipPalette, type LipFamily } from "@/lib/api";
import { loadToneProfile, profileAge, type ToneProfile } from "@/lib/toneProfile";
import { cn } from "@/lib/utils";

/**
 * Lip colours ranked for the user's measured tone.
 *
 * This is the link that was missing: lip-combo previously had no reference to
 * the user's skin tone at all, and coloured products from a rotating palette.
 * With a saved profile it opens on colours chosen for that person; without one
 * it says so and points at the analyser rather than silently showing defaults.
 */
export function TonePalette({
  onPick,
  selectedHex,
  className,
}: {
  onPick: (hex: string, name: string) => void;
  selectedHex?: string;
  className?: string;
}) {
  const [profile, setProfile] = useState<ToneProfile | null>(null);
  const [families, setFamilies] = useState<LipFamily[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "none" | "error">(
    "loading",
  );

  useEffect(() => {
    const saved = loadToneProfile();
    if (!saved) {
      setState("none");
      return;
    }
    setProfile(saved);

    let cancelled = false;
    fetchLipPalette(saved.undertone, saved.mstLevel)
      .then(({ families }) => {
        if (cancelled) return;
        setFamilies(families);
        setState("ready");
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "none") {
    return (
      <div className={cn("rounded-card border border-line bg-surface p-4", className)}>
        <p className="text-label uppercase text-text-muted">Your palette</p>
        <p className="mt-2 text-small text-text-soft">
          Analyse a photo and this fills with lip colours picked for your
          undertone and depth.
        </p>
        <Link
          href="/"
          className="mt-3 inline-flex min-h-11 items-center text-small font-medium text-accent hover:text-accent-bright"
        >
          Find my shade →
        </Link>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className={cn("rounded-card border border-line bg-surface p-4", className)}>
        <p className="text-label uppercase text-text-muted">Your palette</p>
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-10 animate-pulse rounded-full bg-raised" />
          ))}
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={cn("rounded-card border border-line bg-surface p-4", className)}>
        <p className="text-label uppercase text-text-muted">Your palette</p>
        <p className="mt-2 text-small text-text-muted">
          Couldn&apos;t load your palette. The rest of the board still works.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-card border border-line bg-surface p-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-label uppercase text-text-muted">Your palette</p>
        {profile && (
          <p className="text-label text-text-muted">
            MST {profile.mstLevel} · {profile.undertone} · read{" "}
            {profileAge(profile)}
          </p>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-2">
        {families.map((family) => {
          const selected = selectedHex?.toLowerCase() === family.hex.toLowerCase();
          return (
            <li key={family.name}>
              <button
                type="button"
                onClick={() => onPick(family.hex, family.name)}
                aria-pressed={selected}
                // The colour is on the swatch, but the name and reason are text —
                // colour alone can't carry this.
                title={family.why}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-pill border px-2 py-1.5 pr-3",
                  "transition-colors duration-[--duration-fast]",
                  selected
                    ? "border-accent bg-accent-dim"
                    : "border-line hover:border-line-strong hover:bg-raised",
                )}
              >
                <span
                  className="h-7 w-7 shrink-0 rounded-full border border-line-strong"
                  style={{ backgroundColor: family.hex }}
                  aria-hidden="true"
                />
                <span className="text-small text-text">{family.name}</span>
                {!family.in_depth_range && (
                  <span className="text-label text-text-muted">· a stretch</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {families[0] && (
        <p className="mt-3 border-t border-line pt-3 text-small text-text-muted">
          {families[0].why}
        </p>
      )}
    </div>
  );
}
