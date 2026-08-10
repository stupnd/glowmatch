"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import MonkScaleBar from "./MonkScaleBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductCard } from "@/components/ui/ProductCard";
import { ShadeSwatch } from "@/components/ui/ShadeSwatch";
import { Tabs } from "@/components/ui/Tabs";
import { useProductImages } from "@/hooks/useProductImages";
import { saveToneProfile } from "@/lib/toneProfile";
import {
  API_URL,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  imageKey,
  type AnalyzeResult,
  type CategoryKey,
  type Product,
} from "@/lib/api";

type FoundationMatch = {
  brand: string;
  name: string;
  shade: string;
  price_tier: string;
  match_reason: string;
};

function undertoneTone(undertone: string): {
  hex: string;
  description: string;
} {
  const value = undertone.toLowerCase();
  if (value.includes("warm"))
    return {
      hex: "#c68642",
      description:
        "Golden and peach tones sit closest to your skin; silver jewellery can read cold against it.",
    };
  if (value.includes("cool"))
    return {
      hex: "#7ea8c4",
      description:
        "Pink and blue-based tones suit you; yellow-heavy foundations tend to look sallow.",
    };
  return {
    hex: "#82a682",
    description:
      "You sit between warm and cool, so most shade families work — match on depth first.",
  };
}

export default function ResultsScreen({
  results,
  onReset,
}: {
  results: AnalyzeResult;
  onReset: () => void;
}) {
  const [category, setCategory] = useState<CategoryKey>("foundation");
  const [showDetail, setShowDetail] = useState(false);
  const [overrideLevel, setOverrideLevel] = useState<number | null>(null);
  const [foundInput, setFoundInput] = useState("");
  const [matching, setMatching] = useState(false);
  const [matches, setMatches] = useState<FoundationMatch[] | null>(null);

  const detectedLevel = parseInt(results.monk_scale.split("-")[1], 10);
  const mstLevel = overrideLevel ?? detectedLevel;

  // Persist so other routes can use the measurement.
  // Saves the override, not the raw detection: if the user corrected us, their
  // correction is the better answer everywhere else too.
  useEffect(() => {
    saveToneProfile({
      mstLevel,
      undertone: results.undertone,
      avgHex: results.avg_hex,
    });
  }, [mstLevel, results.undertone, results.avg_hex]);
  const undertone = undertoneTone(results.undertone);

  // Every product across every category, so photos resolve in one batched call
  // rather than one per tab switch.
  const allProducts = useMemo(
    () =>
      CATEGORY_ORDER.flatMap(
        (key) => (results.recommendations?.[key] as Product[] | undefined) ?? [],
      ),
    [results.recommendations],
  );
  const { images, loading: imagesLoading } = useProductImages(allProducts);

  const tabs = useMemo(
    () =>
      CATEGORY_ORDER.filter(
        (key) => (results.recommendations?.[key]?.length ?? 0) > 0,
      ).map((key) => ({
        id: key,
        label: CATEGORY_LABELS[key],
        count: results.recommendations?.[key]?.length ?? 0,
      })),
    [results.recommendations],
  );

  const picks = (results.recommendations?.[category] as Product[]) ?? [];
  const topShade = results.matched_shades[0];

  const runFoundationMatch = useCallback(async () => {
    const input = foundInput.trim();
    if (!input || matching) return;
    setMatching(true);
    setMatches(null);
    try {
      const response = await fetch(`${API_URL}/match-foundation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shade_input: input,
          mst_level: mstLevel,
          undertone: results.undertone,
        }),
      });
      const data = await response.json().catch(() => ({ matches: [] }));
      setMatches(data.matches ?? []);
    } catch {
      setMatches([]);
    } finally {
      setMatching(false);
    }
  }, [foundInput, matching, mstLevel, results.undertone]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-6">
      {/* ── Lead with the answer ────────────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-label uppercase text-accent">Your match</p>

        <div className="mt-3 flex flex-wrap items-center gap-5">
          <span
            className="h-20 w-20 shrink-0 rounded-full border border-line-strong"
            style={{ backgroundColor: results.avg_hex }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <h1 className="font-display text-title text-text md:text-display">
              {topShade ? topShade.shade_name : `Monk tone ${mstLevel}`}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-text-soft">
              <span>Monk scale {mstLevel}</span>
              <span aria-hidden="true">·</span>
              <span style={{ color: undertone.hex }}>{results.undertone}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-small text-text-muted">
                {results.avg_hex}
              </span>
            </p>
          </div>
        </div>

        <p className="mt-4 max-w-prose text-text-soft">{undertone.description}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDetail((open) => !open)}
            aria-expanded={showDetail}
            aria-controls="match-detail"
          >
            {showDetail ? "Hide the details" : "How we got this"}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            Start over
          </Button>
        </div>
      </motion.header>

      {/* ── Progressive disclosure: the reasoning, on demand ────────────── */}
      <AnimatePresence initial={false}>
        {showDetail && (
          <motion.section
            id="match-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="mb-10" padding="lg">
              <h2 className="text-heading font-semibold text-text">
                How the match was made
              </h2>
              <p className="mt-2 max-w-prose text-small leading-relaxed text-text-soft">
                We sampled {results.pixel_count} skin patches across your face,
                discarded the ones affected by shadow or specular highlight, and
                averaged the rest to {results.avg_hex}. That average was
                classified against the Monk Skin Tone scale, and the undertone
                came from the balance of red and yellow in the same sample.
              </p>

              <div className="mt-6">
                <MonkScaleBar highlightLevel={mstLevel} />
              </div>

              {/* Automated results need a manual override — if we call someone
                  MST-6 and they disagree, they must be able to say so. */}
              <fieldset className="mt-6 border-t border-line pt-5">
                <legend className="text-label uppercase text-text-muted">
                  Not quite right?
                </legend>
                <p className="mt-2 text-small text-text-soft">
                  Lighting fools this more often than we would like. Set your
                  own level and the foundation matcher will use it.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => {
                    const active = level === mstLevel;
                    return (
                      <button
                        key={level}
                        type="button"
                        aria-pressed={active}
                        aria-label={`Monk skin tone level ${level}${
                          level === detectedLevel ? " (detected)" : ""
                        }`}
                        onClick={() =>
                          setOverrideLevel(level === detectedLevel ? null : level)
                        }
                        className={
                          "min-h-11 min-w-11 rounded-card border text-small tabular-nums transition-colors " +
                          (active
                            ? "border-accent bg-accent-dim text-accent-bright"
                            : "border-line text-text-soft hover:border-line-strong hover:text-text")
                        }
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
                {overrideLevel !== null && (
                  <p className="mt-3 text-small text-warn">
                    Using level {overrideLevel} instead of the detected{" "}
                    {detectedLevel}.{" "}
                    <button
                      type="button"
                      onClick={() => setOverrideLevel(null)}
                      className="underline hover:text-text"
                    >
                      Reset
                    </button>
                  </p>
                )}
              </fieldset>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Shade range ─────────────────────────────────────────────────── */}
      {results.matched_shades.length > 0 && (
        <section className="mb-12" aria-labelledby="shades-heading">
          <h2
            id="shades-heading"
            className="mb-4 text-heading font-semibold text-text"
          >
            Your shade range
          </h2>
          {/* A range rather than one answer: the classifier has real
              uncertainty, and showing it is more honest than a single pick. */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {results.matched_shades.map((shade) => (
              <Card key={shade.shade_name} padding="sm">
                <ShadeSwatch
                  hex={shade.hex}
                  name={shade.shade_name}
                  detail={shade.description}
                />
                {typeof shade.match_score === "number" && (
                  <p className="mt-3 text-label uppercase text-text-muted">
                    {Math.round(shade.match_score * 100)}% match
                  </p>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ── Recommendations ─────────────────────────────────────────────── */}
      {tabs.length > 0 ? (
        <section aria-labelledby="recs-heading">
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2
              id="recs-heading"
              className="text-heading font-semibold text-text"
            >
              Recommended for you
            </h2>
            <p className="text-small text-text-muted">
              {allProducts.length} products across {tabs.length} categories
            </p>
          </div>

          <Tabs
            tabs={tabs}
            activeId={category}
            onChange={(id) => setCategory(id as CategoryKey)}
            label="Product categories"
            className="mb-6"
          />

          <div
            role="tabpanel"
            id={`panel-${category}`}
            aria-labelledby={`tab-${category}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4"
              >
                {picks.map((product) => (
                  <ProductCard
                    key={`${product.brand}-${product.product}`}
                    product={{
                      ...product,
                      imageUrl: images[imageKey(product.brand, product.product)],
                    }}
                    imageLoading={imagesLoading}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      ) : (
        <Card padding="lg">
          <h2 className="text-heading font-semibold text-text">
            No product picks this time
          </h2>
          <p className="mt-2 text-small text-text-soft">
            Your shade match above is still good. Product recommendations come
            from a separate step that didn&apos;t return — try again in a moment.
          </p>
        </Card>
      )}

      {/* ── Foundation matcher ──────────────────────────────────────────── */}
      <section className="mt-14" aria-labelledby="matcher-heading">
        <h2
          id="matcher-heading"
          className="text-heading font-semibold text-text"
        >
          Already know a foundation that fits?
        </h2>
        <p className="mt-1 max-w-prose text-small text-text-soft">
          Name one that matches you and we&apos;ll find the equivalent in other
          brands.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="foundation-input" className="sr-only-focusable">
            Foundation brand and shade
          </label>
          <input
            id="foundation-input"
            type="text"
            value={foundInput}
            onChange={(event) => setFoundInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && runFoundationMatch()}
            placeholder="e.g. Maybelline Fit Me 220"
            className="min-h-12 flex-1 rounded-pill border border-line bg-surface px-5 text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <Button
            onClick={runFoundationMatch}
            disabled={matching || !foundInput.trim()}
          >
            {matching ? "Matching…" : "Find matches"}
          </Button>
        </div>

        {matches !== null && (
          <div className="mt-5" role="status">
            {matches.length === 0 ? (
              <p className="text-small text-text-muted">
                No close equivalents found for that one.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((match) => (
                  <Card key={`${match.brand}-${match.shade}`} padding="sm">
                    <p className="text-label uppercase text-text-muted">
                      {match.brand}
                    </p>
                    <p className="mt-1 font-medium text-text">{match.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone="neutral">{match.shade}</Badge>
                      <span className="text-small text-text-muted">
                        {match.price_tier}
                      </span>
                    </div>
                    {match.match_reason && (
                      <p className="mt-2 text-small text-text-soft">
                        {match.match_reason}
                      </p>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
