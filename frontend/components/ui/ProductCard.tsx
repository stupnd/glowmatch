"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

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
 * Photos come from an image search, so a broken or missing URL is normal rather
 * than exceptional — the card is designed to look complete without one instead
 * of leaving a torn-image icon. Aspect ratio is fixed at 1:1 so a grid of these
 * doesn't reflow as images arrive.
 */
export function ProductCard({
  product,
  imageLoading = false,
  className,
}: {
  product: Product;
  imageLoading?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(product.imageUrl) && !failed;

  const body = (
    <>
      <div
        className={cn(
          "relative aspect-square overflow-hidden rounded-[0.6rem]",
          "border border-line bg-raised",
          !showImage && "bg-swatch-check",
        )}
      >
        {showImage ? (
          // Plain <img>: sources are arbitrary third-party hosts from an image
          // search, which next/image can't optimise without allow-listing every
          // domain up front.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl as string}
            alt={`${product.brand} ${product.product}${
              product.shade && product.shade !== "N/A"
                ? ` in shade ${product.shade}`
                : ""
            }`}
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-[--duration-slow] ease-[--ease-out-soft] group-hover:scale-[1.04]"
          />
        ) : imageLoading ? (
          <div className="absolute inset-0 overflow-hidden">
            <div className="animate-shimmer-sweep absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/6 to-transparent" />
          </div>
        ) : (
          // No photo: fall back to the shade colour if we have one, else the
          // brand initial. Either reads as intentional.
          <div className="flex h-full w-full items-center justify-center">
            {product.hex ? (
              <span
                className="h-14 w-14 rounded-full border border-line-strong"
                style={{ backgroundColor: product.hex }}
                aria-hidden="true"
              />
            ) : (
              <span
                className="font-display text-title text-text-muted"
                aria-hidden="true"
              >
                {product.brand.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        )}

        {product.price_range && (
          <span
            className={cn(
              "absolute right-2 top-2 rounded-pill px-2 py-0.5",
              "bg-overlay text-label font-semibold text-text backdrop-blur-sm",
            )}
          >
            {product.price_range}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <p className="text-label uppercase text-text-muted">{product.brand}</p>
        <p className="font-medium leading-snug text-text">{product.product}</p>

        {product.shade && product.shade !== "N/A" && (
          <div className="flex items-center gap-2 pt-0.5">
            {product.hex && (
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border border-line-strong"
                style={{ backgroundColor: product.hex }}
                aria-hidden="true"
              />
            )}
            {/* The shade name is always spelled out — colour alone can't carry
                meaning for anyone who can't distinguish it. */}
            <span className="text-small text-text-soft">{product.shade}</span>
          </div>
        )}

        {product.why && (
          <p className="pt-1 text-small leading-relaxed text-text-muted">
            {product.why}
          </p>
        )}
      </div>
    </>
  );

  if (!product.url) {
    return (
      <div
        className={cn(
          "group rounded-card border border-line bg-surface p-3",
          className,
        )}
      >
        {body}
      </div>
    );
  }

  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group block rounded-card border border-line bg-surface p-3",
        "transition-all duration-[--duration-base] ease-[--ease-out-soft]",
        "hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift",
        className,
      )}
    >
      {body}
      <span className="mt-2 inline-flex items-center gap-1 text-label uppercase text-accent opacity-0 transition-opacity duration-[--duration-fast] group-hover:opacity-100 group-focus-visible:opacity-100">
        Shop
        <span aria-hidden="true">→</span>
      </span>
      {/* "opens in a new tab" is announced but not drawn. */}
      <span className="sr-only-focusable">opens in a new tab</span>
    </a>
  );
}

/** Placeholder used while a whole category is still loading. */
export function ProductCardSkeleton() {
  return (
    <div className="rounded-card border border-line bg-surface p-3">
      <div className="relative aspect-square overflow-hidden rounded-[0.6rem] bg-raised">
        <div className="animate-shimmer-sweep absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/6 to-transparent" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-2.5 w-1/3 rounded-pill bg-raised" />
        <div className="h-3.5 w-3/4 rounded-pill bg-raised" />
        <div className="h-2.5 w-1/2 rounded-pill bg-raised" />
      </div>
    </div>
  );
}
