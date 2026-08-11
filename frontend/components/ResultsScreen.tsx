"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Page } from "@/components/ui/Page";
import { AnimatePresence, motion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductCard } from "@/components/ui/ProductCard";
import { ShadeSwatch } from "@/components/ui/ShadeSwatch";
import { Section } from "@/components/ui/Section";
import { Tabs } from "@/components/ui/Tabs";
import { ToneDisc, ToneRibbon } from "@/components/ui/ToneRibbon";
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
      hex: "#9A5B18",
      description:
        "Golden and peach tones sit closest to your skin; silver jewellery can read cold against it.",
    };
  if (value.includes("cool"))
    return {
      hex: "#2F6E90",
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

  const allProducts = useMemo(
    () =>
      CATEGORY_ORDER.flatMap(
        (key) => (results.recommendations?.[key] as Product[] | undefined) ?? [],
      ),
    [results.recommendations],
  );

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

  // Resolve the visible category first, then everything else. One batch of 27
  // meant no card painted until the slowest lookup finished — about five
  // seconds of empty grid. A category is four products, so the cards the user
  // is actually looking at fill in around a second, and switching tabs is
  // instant once the background pass lands (results are cached server-side).
  const { images } = useProductImages(picks, allProducts);

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
    <Page width="grid">
      {/* ── The measurement is the hero ─────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-(--space-section)"
      >
        <p className="text-label uppercase text-accent">Your measured tone</p>

        <div className="mt-5 flex flex-col gap-7 sm:flex-row sm:items-center">
          {/* The colour we measured, at a size that treats it as the answer
              rather than as an icon beside the answer. */}
          <ToneDisc hex={results.avg_hex} size="lg" />

          <div className="min-w-0">
            <h1 className="font-display text-hero leading-none text-text">
              {results.undertone}
            </h1>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-soft">
              <span className="text-heading text-text">
                Monk tone {mstLevel}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-small text-text-muted">
                {results.avg_hex}
              </span>
              {topShade && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-small">
                    closest shade {topShade.shade_name}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* The ribbon recurs from the welcome page, now carrying the reading. */}
        <div className="mt-8">
          <ToneRibbon
            active={mstLevel}
            size="md"
            label={`Monk Skin Tone scale. Your measurement is level ${mstLevel} of 10.`}
          />
        </div>

        <p className="mt-6 max-w-prose text-text-soft">{undertone.description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
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
                            ? "border-accent bg-accent-dim text-accent"
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
        <Section
          id="shades"
          title="Your shade range"
          description="Three shades rather than one — the classifier has real uncertainty under mixed lighting, and a range is the honest answer."
          aside={`${results.matched_shades.length} matches`}
        >
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
                {shade.closeness && (
                  // A bare "56% match" reads as failure and tells the user
                  // nothing they can act on. The perceptual reading is both
                  // more honest and more useful: delta-E 2.3 is the
                  // just-noticeable difference, so "close" genuinely means
                  // close. Where the catalogue has no good match this still
                  // says so plainly — see eval/catalog_audit.py.
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className="text-label uppercase text-accent">
                      {shade.closeness}
                    </span>
                    {typeof shade.delta_e === "number" && (
                      <span className="font-mono text-label text-text-muted">
                        ΔE {shade.delta_e.toFixed(1)}
                      </span>
                    )}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </Section>
      )}

      {/* ── Recommendations ─────────────────────────────────────────────── */}
      {tabs.length > 0 ? (
        <Section
          id="recs"
          title="Recommended for you"
          aside={`${allProducts.length} products · ${tabs.length} categories`}
        >
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
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              >
                {picks.map((product, index) => (
                  <ProductCard
                    key={`${product.brand}-${product.product}`}
                    index={index}
                    product={{
                      ...product,
                      // Absent key = not resolved yet, so the card shimmers.
                      // Present-but-null = resolved to no photo, so it shows
                      // its fallback immediately instead of waiting for the
                      // rest of the batch.
                      imageUrl: images[imageKey(product.brand, product.product)],
                    }}
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </Section>
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
      <Section
        id="matcher"
        title="Already know a foundation that fits?"
        description="Name one that matches you and we'll find the equivalent in other brands."
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="foundation-input" className="sr-only">
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
      </Section>
    </Page>
  );
}
