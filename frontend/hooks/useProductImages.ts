"use client";

import { useEffect, useState } from "react";
import { fetchProductImages, imageKey, type Product } from "@/lib/api";

/**
 * Resolves photos for a set of products.
 *
 * Deliberately not part of the /analyze response: 27 image lookups would
 * dominate analysis latency. This fires once the results are already on screen,
 * so cards render immediately and photos fill in.
 *
 * Failure is silent by design — a missing photo is a cosmetic downgrade the
 * card already handles, not something worth an error state.
 */
export function useProductImages(products: Product[]): {
  images: Record<string, string | null>;
  loading: boolean;
} {
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [loading, setLoading] = useState(false);

  // Key the effect on the product identities rather than the array reference,
  // which is a fresh object on every render.
  const signature = products
    .map((p) => imageKey(p.brand, p.product))
    .sort()
    .join(",");

  useEffect(() => {
    if (products.length === 0) return;

    let cancelled = false;
    setLoading(true);

    fetchProductImages(
      products.map(({ brand, product }) => ({ brand, product })),
    )
      .then(({ images }) => {
        if (!cancelled) setImages((previous) => ({ ...previous, ...images }));
      })
      .catch(() => {
        // Cards fall back to a swatch or the brand initial.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { images, loading };
}
