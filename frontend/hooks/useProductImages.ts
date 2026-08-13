"use client";

import { useEffect, useState } from "react";
import { fetchProductImages, imageKey, type Product } from "@/lib/api";

/**
 * Resolves photos for products, visible ones first.
 *
 * Deliberately not part of the /analyze response: image lookups are slow and
 * flaky, and blocking the shade match on them would be the wrong trade.
 *
 * Priority matters more than it sounds. Resolving all 27 recommendations in one
 * batch means no card paints until the slowest lookup returns — roughly five
 * seconds of empty grid. Requesting the visible category first cuts that to
 * about a second for the cards actually on screen, and the background pass
 * warms the server-side cache so switching tabs is instant.
 *
 * Failure is silent by design: a missing photo is a cosmetic downgrade the card
 * already handles, not an error state.
 */
export function useProductImages(
  priority: Product[],
  rest: Product[] = [],
): { images: Record<string, string | null> } {
  const [images, setImages] = useState<Record<string, string | null>>({});

  // Key effects on identities rather than array references, which are new
  // objects on every render.
  const prioritySig = priority.map((p) => imageKey(p.brand, p.product)).sort().join(",");
  const restSig = rest.map((p) => imageKey(p.brand, p.product)).sort().join(",");

  useEffect(() => {
    if (priority.length === 0) return;
    let cancelled = false;

    const resolve = (batch: Product[]) =>
      fetchProductImages(batch.map(({ brand, product }) => ({ brand, product })))
        .then(({ images }) => {
          if (!cancelled) setImages((previous) => ({ ...previous, ...images }));
        })
        .catch(() => {
          // Cards fall back to a swatch or the brand initial.
        });

    // Await the priority batch before starting the rest, so the background
    // pass can't compete with it for the server's concurrency budget.
    resolve(priority).then(() => {
      if (!cancelled && rest.length) void resolve(rest);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prioritySig, restSig]);

  return { images };
}
