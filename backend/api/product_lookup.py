"""Structured product lookup for the inventory search box.

Distinct from api/product_images, which finds a *photo* for a product you have
already named. This turns a half-remembered query — "elf halo glow" — into
structured candidates the user can pick from, so adding something to a shelf is
one search and one click instead of six form fields.

Prices are typical retail, not live. They are labelled as estimates in the UI
and remain editable, because a wrong price silently entering someone's shelf
total is worse than an empty one.
"""

from __future__ import annotations

import json
import os
import threading
import time

import anthropic

from api.limits import record_claude_usage

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

_MAX_RESULTS = 6

# Queries repeat heavily — everyone searches the same few dozen products — so a
# small in-process cache removes most of the Claude traffic. Same
# single-instance caveat as api.limits.
_TTL_SECONDS = 12 * 60 * 60
_MAX_ENTRIES = 2_000

_cache: dict[str, tuple[list[dict], float]] = {}
_lock = threading.Lock()


def _cache_get(key: str) -> list[dict] | None:
    with _lock:
        entry = _cache.get(key)
        if entry is None:
            return None
        value, expires = entry
        if time.monotonic() >= expires:
            del _cache[key]
            return None
        return value


def _cache_put(key: str, value: list[dict]) -> None:
    with _lock:
        if len(_cache) >= _MAX_ENTRIES:
            for stale in [k for k, (_, e) in _cache.items() if time.monotonic() >= e]:
                del _cache[stale]
            if len(_cache) >= _MAX_ENTRIES:
                del _cache[min(_cache, key=lambda k: _cache[k][1])]
        _cache[key] = (value, time.monotonic() + _TTL_SECONDS)


_FIELDS = ("brand", "product", "category", "shade", "hex", "price_usd")

_CATEGORIES = (
    "foundation, concealer, blush, bronzer, highlighter, lip, eyeshadow, "
    "setting powder, mascara, brow, skincare"
)


def search(query: str) -> list[dict]:
    """Return up to six structured product candidates for *query*.

    Never raises — an empty list just means the user types the details in
    manually, which is the behaviour that existed before this.
    """
    normalised = " ".join(query.lower().split())
    if len(normalised) < 2:
        return []

    cached = _cache_get(normalised)
    if cached is not None:
        return cached

    system = (
        "You identify real, currently-sold makeup and skincare products from "
        "partial or misspelled names. Return ONLY a JSON array, no preamble, "
        "no markdown fences."
    )
    user = (
        f'Someone is adding a product they own to their collection. They typed: "{query}"\n\n'
        f"Return up to {_MAX_RESULTS} real product LINES this could be, best "
        "match first. Identify the product, not a shade — shades are chosen "
        "separately, because their names are specific to each product "
        "(Deauville, N5, 220) and nobody searches by them.\n\n"
        "Never invent a product. If you are unsure, return fewer results or an "
        "empty array — a wrong entry in someone's inventory is worse than no "
        "suggestion.\n\n"
        "Each element:\n"
        '{ "brand": "<company only, e.g. e.l.f.>", '
        '"product": "<product line without the brand>", '
        f'"category": "<one of: {_CATEGORIES}>", '
        '"shade": "", '
        '"hex": "", '
        '"price_usd": <typical retail price as a number, or null> }'
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=900,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        record_claude_usage(response)
        raw = response.content[0].text.strip()
    except Exception as exc:
        print(f"[product-lookup] request failed for {query!r}: {exc}")
        return []

    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]

    try:
        parsed = json.loads(raw.strip())
    except json.JSONDecodeError:
        print(f"[product-lookup] non-JSON response for {query!r}")
        return []

    if not isinstance(parsed, list):
        return []

    results = [clean for item in parsed[:_MAX_RESULTS] if (clean := _clean(item))]
    _cache_put(normalised, results)
    return results


def _clean(item: object) -> dict | None:
    """Normalise one candidate, or None if it is unusable."""
    if not isinstance(item, dict):
        return None

    out = {field: item.get(field) for field in _FIELDS}
    brand = str(out["brand"] or "").strip()
    product = str(out["product"] or "").strip()
    if not brand or not product:
        return None

    hex_value = str(out["hex"] or "").strip()
    if not (len(hex_value) == 7 and hex_value.startswith("#")):
        hex_value = ""

    price = out["price_usd"]
    try:
        # Integer cents, matching the inventory schema, so no float ever
        # reaches a running total.
        price_cents = round(float(price) * 100) if price is not None else None
    except (TypeError, ValueError):
        price_cents = None
    if price_cents is not None and not (0 <= price_cents <= 100_000_00):
        price_cents = None

    return {
        "brand": brand,
        "product": product,
        "category": str(out["category"] or "").strip().lower() or None,
        "shade": str(out["shade"] or "").strip() or None,
        "hex": hex_value or None,
        "price_cents": price_cents,
    }


# ── Shades for a chosen product ───────────────────────────────────────────────

_shade_cache: dict[str, tuple[list[dict], float]] = {}
_MAX_SHADES = 60


def shades(brand: str, product: str) -> list[dict]:
    """Return the real shade range for one product, with approximate colours.

    A separate call from search() because shade names mean nothing outside
    their product — "Deauville" is only findable once you know it is NARS Sheer
    Glow. Cached hard: a shade range changes about once a year.
    """
    key = f"{brand.strip().lower()}|{product.strip().lower()}"
    if not brand.strip() or not product.strip():
        return []

    with _lock:
        entry = _shade_cache.get(key)
        if entry and time.monotonic() < entry[1]:
            return entry[0]

    system = (
        "You know the shade ranges of real makeup products. Return ONLY a JSON "
        "array, no preamble, no markdown fences."
    )
    user = (
        f"List the real shades of {brand} {product}, in the order the brand "
        "lists them — lightest to deepest where that applies.\n\n"
        "Only shades that genuinely exist. If the product has no shades (a "
        "mascara, a clear balm), return an empty array. If you do not know the "
        "range, return an empty array rather than inventing names.\n\n"
        'Each element: { "name": "<shade name exactly as sold>", '
        '"hex": "<#rrggbb approximating it>", '
        '"undertone": "<warm | cool | neutral | empty string>" }'
    )

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2500,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        record_claude_usage(response)
        raw = response.content[0].text.strip()
    except Exception as exc:
        print(f"[product-lookup] shade request failed for {key!r}: {exc}")
        return []

    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]

    try:
        parsed = json.loads(raw.strip())
    except json.JSONDecodeError:
        print(f"[product-lookup] non-JSON shade response for {key!r}")
        return []
    if not isinstance(parsed, list):
        return []

    out: list[dict] = []
    seen: set[str] = set()
    for item in parsed[:_MAX_SHADES]:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        hex_value = str(item.get("hex") or "").strip()
        if not (len(hex_value) == 7 and hex_value.startswith("#")):
            hex_value = ""
        undertone = str(item.get("undertone") or "").strip().lower()
        out.append({
            "name": name,
            "hex": hex_value or None,
            "undertone": undertone if undertone in ("warm", "cool", "neutral") else None,
        })

    with _lock:
        _shade_cache[key] = (out, time.monotonic() + _TTL_SECONDS)
    return out
