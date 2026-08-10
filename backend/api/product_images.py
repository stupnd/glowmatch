"""Product photo lookup for recommendation cards.

Recommendations now come back as ~27 products, and resolving a photo for each
one is far too slow and too rate-limit-prone to do inside /analyze — DuckDuckGo
will start refusing the deploy's IP long before 27 sequential image searches
finish. So image resolution is a separate, cached, batched call that the
frontend makes for the cards it is actually rendering.

Design notes
------------
* **Cache first.** Product names repeat heavily across users (there are only so
  many foundations Claude will recommend for MST-5 neutral), so an in-process
  cache absorbs most of the traffic. Same single-instance caveat as
  api.limits — see that module's docstring.
* **Negative results are cached too**, with a shorter TTL. Without that, every
  product DDGS has no image for gets retried on every single request.
* **Bounded concurrency.** DDGS is the bottleneck and it blocks, so lookups run
  in a thread pool with a small ceiling rather than all at once.
"""

from __future__ import annotations

import asyncio
import threading
import time

from ddgs import DDGS

# How long a resolved URL stays good. Product imagery does not churn quickly and
# a stale-but-working image is much better than a slow page.
_TTL_HIT_SECONDS = 24 * 60 * 60
# Misses expire sooner so a transient DDGS failure isn't remembered all day.
_TTL_MISS_SECONDS = 30 * 60

# DDGS starts throttling well before this; keep it low.
_MAX_CONCURRENCY = 4

# Refuse to grow without bound if traffic is all unique products.
_MAX_ENTRIES = 5_000


class _ImageCache:
    """TTL cache mapping a product query to a resolved image URL (or None)."""

    def __init__(self) -> None:
        self._entries: dict[str, tuple[str | None, float]] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> tuple[bool, str | None]:
        """Return (hit, url). ``hit`` distinguishes a cached None from a miss."""
        now = time.monotonic()
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return False, None
            url, expires_at = entry
            if now >= expires_at:
                del self._entries[key]
                return False, None
            return True, url

    def put(self, key: str, url: str | None) -> None:
        ttl = _TTL_HIT_SECONDS if url else _TTL_MISS_SECONDS
        now = time.monotonic()
        with self._lock:
            if len(self._entries) >= _MAX_ENTRIES:
                self._evict_expired(now)
                if len(self._entries) >= _MAX_ENTRIES:
                    # Still full and everything is live — drop the entry closest
                    # to expiry so the cache stays bounded.
                    oldest = min(self._entries, key=lambda k: self._entries[k][1])
                    del self._entries[oldest]
            self._entries[key] = (url, now + ttl)

    def _evict_expired(self, now: float) -> None:
        """Caller must hold the lock."""
        for key in [k for k, (_, exp) in self._entries.items() if now >= exp]:
            del self._entries[key]

    def stats(self) -> dict[str, int]:
        with self._lock:
            return {"entries": len(self._entries)}


_cache = _ImageCache()


def cache_key(brand: str, product: str) -> str:
    return f"{brand.strip().lower()}|{product.strip().lower()}"


def _lookup_one(brand: str, product: str) -> str | None:
    """Blocking DDGS image search for a single product. Never raises."""
    query = f"{brand} {product}".strip()
    if not query:
        return None
    try:
        with DDGS() as ddgs:
            for img in ddgs.images(query, max_results=3, safesearch="moderate"):
                url = img.get("image", "")
                if url.startswith("https://"):
                    return url
    except Exception as exc:
        print(f"[product-images] lookup failed for {query!r}: {exc}")
    return None


async def resolve_many(products: list[tuple[str, str]]) -> dict[str, str | None]:
    """Resolve image URLs for (brand, product) pairs, keyed by cache_key.

    Cached entries are returned without a network call; the rest are fetched
    with bounded concurrency. Always returns a key for every input pair.
    """
    results: dict[str, str | None] = {}
    pending: list[tuple[str, str, str]] = []  # (key, brand, product)
    # Tracks keys already resolved *or* already queued. Checking `results`
    # alone would miss duplicates within this batch, since pending keys have
    # no entry there yet — and the same product genuinely does repeat across
    # categories (a tinted moisturiser under both foundation and concealer).
    seen: set[str] = set()

    for brand, product in products:
        key = cache_key(brand, product)
        if key in seen:
            continue
        seen.add(key)
        hit, url = _cache.get(key)
        if hit:
            results[key] = url
        else:
            pending.append((key, brand, product))

    if not pending:
        return results

    semaphore = asyncio.Semaphore(_MAX_CONCURRENCY)

    async def worker(key: str, brand: str, product: str) -> None:
        async with semaphore:
            url = await asyncio.to_thread(_lookup_one, brand, product)
        _cache.put(key, url)
        results[key] = url

    await asyncio.gather(*(worker(*item) for item in pending))
    print(
        f"[product-images] {len(products)} requested, {len(seen)} unique, "
        f"{len(seen) - len(pending)} cached, {len(pending)} fetched, "
        f"{sum(1 for v in results.values() if v)} resolved"
    )
    return results


def cache_stats() -> dict[str, int]:
    return _cache.stats()
