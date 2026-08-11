"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { lookupProducts, type ProductMatch } from "@/lib/api";
import {
  addInventoryItem,
  formatCents,
  parsePriceToCents,
  type InventoryItem,
} from "@/lib/vanity";

const CATEGORIES = [
  "foundation", "concealer", "blush", "bronzer", "highlighter",
  "lip", "eyeshadow", "setting powder", "mascara", "brow", "skincare",
];

const FIELD =
  "min-h-12 w-full rounded-card border border-line bg-surface px-4 text-text placeholder:text-text-muted focus:border-accent focus:outline-none";

/**
 * Search-first product entry.
 *
 * Adding something you already own should not require filling six fields. You
 * type what you'd say out loud — "elf halo glow" — pick from matches, and the
 * details fill in. The form still exists underneath, pre-filled and editable,
 * because the match is a suggestion and you are the authority on what is
 * actually on your shelf.
 */
export function AddProduct({
  userId,
  onAdded,
}: {
  userId: string;
  onAdded: (item: InventoryItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<ProductMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // Chosen or manually entered product.
  const [draft, setDraft] = useState<ProductMatch | null>(null);
  const [priceText, setPriceText] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  // Guards against a slow earlier request landing after a newer one and
  // replacing good results with stale ones.
  const latest = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3 || draft) {
      setMatches([]);
      setSearched(false);
      return;
    }
    const ticket = ++latest.current;
    setSearching(true);
    // Long enough that typing a product name is one request, not eight.
    const timer = setTimeout(() => {
      lookupProducts(trimmed)
        .then(({ results }) => {
          if (ticket !== latest.current) return;
          setMatches(results);
          setSearched(true);
        })
        .catch(() => {
          if (ticket === latest.current) setMatches([]);
        })
        .finally(() => {
          if (ticket === latest.current) setSearching(false);
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [query, draft]);

  const choose = (match: ProductMatch) => {
    setDraft(match);
    setPriceText(match.price_cents !== null ? (match.price_cents / 100).toFixed(2) : "");
    setMatches([]);
  };

  const startManual = () => {
    const [brand = "", ...rest] = query.trim().split(" ");
    setDraft({
      brand,
      product: rest.join(" "),
      category: null,
      shade: null,
      hex: null,
      price_cents: null,
    });
    setPriceText("");
    setMatches([]);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    if (!draft.brand.trim() || !draft.product.trim()) {
      setProblem("Brand and product are both needed.");
      return;
    }
    setSaving(true);
    setProblem(null);
    try {
      const created = await addInventoryItem(
        {
          brand: draft.brand.trim(),
          product: draft.product.trim(),
          shade: draft.shade?.trim() || null,
          category: draft.category,
          hex: draft.hex,
          url: null,
          price_cents: parsePriceToCents(priceText),
          notes: null,
        },
        userId,
      );
      onAdded(created);
      setQuery("");
      setDraft(null);
      setPriceText("");
      setSearched(false);
    } catch {
      setProblem("Couldn't save that. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Search ────────────────────────────────────────────────────────────────
  if (!draft) {
    return (
      <div className="mb-5 rounded-card border border-line bg-raised p-5">
        <label htmlFor="product-search" className="text-label uppercase text-text-muted">
          Search for a product you own
        </label>
        <div className="relative mt-2">
          <input
            id="product-search"
            className={FIELD}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="elf halo glow"
            autoFocus
            autoComplete="off"
            role="combobox"
            aria-expanded={matches.length > 0}
            aria-controls="product-matches"
          />
          {searching && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-small text-text-muted">
              Searching…
            </span>
          )}
        </div>

        {matches.length > 0 && (
          <ul id="product-matches" className="mt-3 space-y-1.5">
            {matches.map((match, index) => (
              <li key={`${match.brand}-${match.product}-${index}`}>
                <button
                  type="button"
                  onClick={() => choose(match)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-card border border-line bg-surface p-3 text-left",
                    "transition-colors hover:border-accent hover:bg-accent-dim",
                  )}
                >
                  <span
                    className="h-10 w-10 shrink-0 rounded-full border border-line-strong"
                    style={{ backgroundColor: match.hex ?? "var(--color-raised)" }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label uppercase text-text-muted">
                      {match.brand}
                    </span>
                    <span className="block clamp-1 font-medium text-text">
                      {match.product}
                    </span>
                    {(match.shade || match.category) && (
                      <span className="block text-small text-text-soft">
                        {[match.shade, match.category].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-small tabular-nums text-text-muted">
                    {formatCents(match.price_cents)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {searched && matches.length === 0 && !searching && (
          <p className="mt-3 text-small text-text-muted">
            No matches for that.{" "}
            <button
              type="button"
              onClick={startManual}
              className="font-medium text-accent hover:underline"
            >
              Add it manually
            </button>
          </p>
        )}

        {!searched && (
          <p className="mt-3 text-small text-text-muted">
            Type a brand and product — spelling doesn&apos;t have to be exact.{" "}
            <button
              type="button"
              onClick={startManual}
              className="font-medium text-accent hover:underline"
            >
              Or enter it manually
            </button>
          </p>
        )}
      </div>
    );
  }

  // ── Confirm ───────────────────────────────────────────────────────────────
  return (
    <form onSubmit={save} className="mb-5 rounded-card border border-accent/40 bg-raised p-5">
      <div className="flex items-start justify-between gap-4">
        <p className="text-label uppercase text-accent">Check and add</p>
        <button
          type="button"
          onClick={() => setDraft(null)}
          className="text-label uppercase text-text-muted hover:text-text"
        >
          ← Search again
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-label uppercase text-text-muted">Brand</span>
          <input
            className={`mt-1 ${FIELD}`}
            value={draft.brand}
            onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-label uppercase text-text-muted">Product</span>
          <input
            className={`mt-1 ${FIELD}`}
            value={draft.product}
            onChange={(e) => setDraft({ ...draft, product: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-label uppercase text-text-muted">Shade</span>
          <input
            className={`mt-1 ${FIELD}`}
            value={draft.shade ?? ""}
            onChange={(e) => setDraft({ ...draft, shade: e.target.value })}
            placeholder="optional"
          />
        </label>
        <label className="block">
          <span className="text-label uppercase text-text-muted">Category</span>
          <select
            className={`mt-1 ${FIELD}`}
            value={draft.category ?? ""}
            onChange={(e) => setDraft({ ...draft, category: e.target.value || null })}
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-label uppercase text-text-muted">
            Price{" "}
            {draft.price_cents !== null && (
              <span className="normal-case tracking-normal">(estimate — check it)</span>
            )}
          </span>
          <input
            className={`mt-1 ${FIELD}`}
            value={priceText}
            onChange={(e) => setPriceText(e.target.value)}
            placeholder="42.00"
            inputMode="decimal"
          />
        </label>
        <label className="block">
          <span className="text-label uppercase text-text-muted">Shade colour</span>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={draft.hex ?? "#c89a6b"}
              onChange={(e) => setDraft({ ...draft, hex: e.target.value })}
              className="h-12 w-16 cursor-pointer rounded-card border border-line bg-surface"
              aria-label="Shade colour"
            />
            <span className="font-mono text-small text-text-muted">
              {draft.hex ?? "#c89a6b"}
            </span>
          </div>
        </label>
      </div>

      {problem && (
        <p className="mt-3 text-small text-danger" role="alert">
          {problem}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Add to shelf"}
        </Button>
        <span className="text-small text-text-muted">
          Prices are typical retail, not live — edit anything that&apos;s off.
        </span>
      </div>
    </form>
  );
}
