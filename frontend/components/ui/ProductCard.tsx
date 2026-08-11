"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Product {
  brand: string;
  product: string;
  shade?: string;
  price_range?: string;
  why?: string;
  url?: string;
  /** Resolved separately via POST /product-images; undefined = still loading. */
  imageUrl?: string | null;
  /** Swatch colour, when the product maps to a known hex. */
  hex?: string;
}

/**
 * A recommendation card.
 *
 * Two things drive the layout:
 *
 * 1. **A missing photo is normal, not exceptional.** Image search fails often
 *    enough that the no-photo state has to look deliberate. The previous
 *    checkerboard read as a broken asset; this uses a tonal panel with the
 *    brand monogram, which looks like a choice.
 *
 * 2. **Cards must agree on height.** Blurb length varies, which left rows with
 *    ragged bottoms. The card is a flex column with a clamped blurb and the
 *    meta row pinned to the bottom, so a row reads as a row.
 */
export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(product.imageUrl) && !failed;
  // Loading is per-card, not per-batch. A single batch flag meant all 27 cards
  // shimmered until the slowest lookup finished, which read as an empty grid.
  // undefined = not resolved yet; null = resolved to no photo.
  const imageLoading = product.imageUrl === undefined && !failed;
  const hasShade = Boolean(product.shade && product.shade !== "N/A");
  const monogram = (product.brand || product.product).charAt(0).toUpperCase();

  const interactive = Boolean(product.url);
  const Wrapper = interactive ? "a" : "div";
  const wrapperProps = interactive
    ? { href: product.url, target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-card",
        "border border-line bg-surface",
        interactive && [
          "transition-all duration-(--duration-base) ease-(--ease-out-soft)",
          "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift",
        ],
        className,
      )}
    >
      {/* 4:5 rather than square: it fits more of a grid on screen at once, and
          most product photography is portrait anyway. */}
      <div className="relative aspect-4/5 overflow-hidden bg-raised">
        {showImage ? (
          // Plain <img>: sources are arbitrary third-party hosts from an image
          // search, which next/image can't optimise without allow-listing every
          // domain up front.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl as string}
            alt={`${product.brand ? product.brand + " " : ""}${product.product}${
              hasShade ? ` in shade ${product.shade}` : ""
            }`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-soft) group-hover:scale-[1.03]"
          />
        ) : imageLoading ? (
          <div className="absolute inset-0 overflow-hidden">
            <div className="animate-shimmer-sweep absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/12 to-transparent" />
          </div>
        ) : (
          <div
            className="flex h-full w-full items-center justify-center bg-linear-to-br from-raised to-surface"
            aria-hidden="true"
          >
            {product.hex ? (
              <span
                className="h-16 w-16 rounded-full border border-line-strong shadow-card"
                style={{ backgroundColor: product.hex }}
              />
            ) : (
              <span className="font-display text-[2.5rem] leading-none text-text-muted/50">
                {monogram}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3.5">
        {product.brand && (
          <p className="clamp-1 text-label uppercase text-text-muted">
            {product.brand}
          </p>
        )}
        <p className="clamp-2 font-medium leading-snug text-text">
          {product.product}
        </p>

        {product.why && (
          <p className="clamp-2 mt-0.5 text-small leading-relaxed text-text-muted">
            {product.why}
          </p>
        )}

        {/* mt-auto pins this row to the bottom, so cards of differing blurb
            length still line up along their footer. */}
        <div className="mt-auto flex items-center gap-2 pt-3">
          {hasShade && (
            <>
              {product.hex && (
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-full border border-line-strong"
                  style={{ backgroundColor: product.hex }}
                  aria-hidden="true"
                />
              )}
              {/* Spelled out — colour alone can't carry meaning. */}
              <span className="clamp-1 text-small text-text-soft">
                {product.shade}
              </span>
            </>
          )}
          {product.price_range && (
            <span className="ml-auto shrink-0 font-medium text-small text-text-muted">
              {product.price_range}
            </span>
          )}
        </div>
      </div>

      {interactive && (
        <span className="sr-only-focusable">opens in a new tab</span>
      )}
    </Wrapper>
  );
}

/** Placeholder used while a whole category is still loading. */
export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface">
      <div className="relative aspect-4/5 overflow-hidden bg-raised">
        <div className="animate-shimmer-sweep absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/12 to-transparent" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="h-2.5 w-1/3 rounded-pill bg-raised" />
        <div className="h-3.5 w-3/4 rounded-pill bg-raised" />
        <div className="mt-auto h-2.5 w-1/2 rounded-pill bg-raised pt-3" />
      </div>
    </div>
  );
}
