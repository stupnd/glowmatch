"""Fenty Beauty Pro Filt'r foundation shade matching."""

# ---------------------------------------------------------------------------
# Dataset — 25 Fenty Beauty Pro Filt'r shades mapped to the Monk Skin Tone
# Scale (MST-1 through MST-10) and undertone (warm / cool / neutral).
# Each MST level has at least two shades so the fill-from-adjacent logic
# always has candidates to draw from.
# ---------------------------------------------------------------------------

_FENTY_SHADES: list[dict] = [
    # MST-1 — very fair
    {
        "shade_name": "100N",
        "hex": "#f7ede3",
        "monk_scale": "MST-1",
        "undertone": "neutral",
        "description": "very fair with neutral pink undertone",
    },
    {
        "shade_name": "110W",
        "hex": "#f5e6d2",
        "monk_scale": "MST-1",
        "undertone": "warm",
        "description": "very fair with warm peachy undertone",
    },
    # MST-2 — fair
    {
        "shade_name": "120W",
        "hex": "#f2ddc0",
        "monk_scale": "MST-2",
        "undertone": "warm",
        "description": "fair with warm peach undertone",
    },
    {
        "shade_name": "125N",
        "hex": "#eedabb",
        "monk_scale": "MST-2",
        "undertone": "neutral",
        "description": "fair with neutral golden-beige undertone",
    },
    {
        "shade_name": "130C",
        "hex": "#eadac8",
        "monk_scale": "MST-2",
        "undertone": "cool",
        "description": "fair with cool pink-rose undertone",
    },
    # MST-3 — light
    {
        "shade_name": "140W",
        "hex": "#e8c9a0",
        "monk_scale": "MST-3",
        "undertone": "warm",
        "description": "light with warm golden undertone",
    },
    {
        "shade_name": "145N",
        "hex": "#e3c49a",
        "monk_scale": "MST-3",
        "undertone": "neutral",
        "description": "light with neutral beige undertone",
    },
    # MST-4 — light medium
    {
        "shade_name": "150W",
        "hex": "#d9b485",
        "monk_scale": "MST-4",
        "undertone": "warm",
        "description": "light medium with warm honey undertone",
    },
    {
        "shade_name": "160N",
        "hex": "#d4ae80",
        "monk_scale": "MST-4",
        "undertone": "neutral",
        "description": "light medium with neutral sand undertone",
    },
    {
        "shade_name": "165C",
        "hex": "#ccaa80",
        "monk_scale": "MST-4",
        "undertone": "cool",
        "description": "light medium with cool taupe undertone",
    },
    # MST-5 — medium
    {
        "shade_name": "200W",
        "hex": "#c49460",
        "monk_scale": "MST-5",
        "undertone": "warm",
        "description": "medium with warm caramel undertone",
    },
    {
        "shade_name": "210N",
        "hex": "#be8e5a",
        "monk_scale": "MST-5",
        "undertone": "neutral",
        "description": "medium with neutral tan undertone",
    },
    # MST-6 — medium deep
    {
        "shade_name": "240W",
        "hex": "#a07850",
        "monk_scale": "MST-6",
        "undertone": "warm",
        "description": "medium deep with warm bronze undertone",
    },
    {
        "shade_name": "250N",
        "hex": "#9a7048",
        "monk_scale": "MST-6",
        "undertone": "neutral",
        "description": "medium deep with neutral chestnut undertone",
    },
    {
        "shade_name": "260C",
        "hex": "#956e48",
        "monk_scale": "MST-6",
        "undertone": "cool",
        "description": "medium deep with cool olive undertone",
    },
    # MST-7 — tan / deep medium
    {
        "shade_name": "300W",
        "hex": "#7e5a30",
        "monk_scale": "MST-7",
        "undertone": "warm",
        "description": "tan with warm amber undertone",
    },
    {
        "shade_name": "310N",
        "hex": "#785530",
        "monk_scale": "MST-7",
        "undertone": "neutral",
        "description": "tan with neutral walnut undertone",
    },
    # MST-8 — deep
    {
        "shade_name": "360W",
        "hex": "#5e3a18",
        "monk_scale": "MST-8",
        "undertone": "warm",
        "description": "deep with warm red-mahogany undertone",
    },
    {
        "shade_name": "370N",
        "hex": "#593618",
        "monk_scale": "MST-8",
        "undertone": "neutral",
        "description": "deep with neutral espresso undertone",
    },
    {
        "shade_name": "375C",
        "hex": "#563418",
        "monk_scale": "MST-8",
        "undertone": "cool",
        "description": "deep with cool blue-black undertone",
    },
    # MST-9 — very deep
    {
        "shade_name": "430N",
        "hex": "#3e2410",
        "monk_scale": "MST-9",
        "undertone": "neutral",
        "description": "very deep with neutral cocoa undertone",
    },
    {
        "shade_name": "440W",
        "hex": "#3c2010",
        "monk_scale": "MST-9",
        "undertone": "warm",
        "description": "very deep with warm toffee undertone",
    },
    # MST-10 — deepest
    {
        "shade_name": "490N",
        "hex": "#2c1808",
        "monk_scale": "MST-10",
        "undertone": "neutral",
        "description": "deepest with neutral ebony undertone",
    },
    {
        "shade_name": "495W",
        "hex": "#2a1606",
        "monk_scale": "MST-10",
        "undertone": "warm",
        "description": "deepest with warm deep mahogany undertone",
    },
    {
        "shade_name": "498N",
        "hex": "#281404",
        "monk_scale": "MST-10",
        "undertone": "neutral",
        "description": "deepest with neutral rich espresso undertone",
    },
]

# Ordered list of all MST labels used for adjacency lookups.
_MST_ORDER: list[str] = [
    "MST-1", "MST-2", "MST-3", "MST-4", "MST-5",
    "MST-6", "MST-7", "MST-8", "MST-9", "MST-10",
]


def match_shades(monk_scale: str, undertone: str) -> list[dict]:
    """Return the top 3 Fenty Beauty Pro Filt'r shades for *monk_scale* and
    *undertone*.

    Matching priority:
      1. Exact MST match + exact undertone match
      2. Exact MST match + any undertone
      3. Adjacent MST (±1) match, undertone-prioritised, to fill remaining slots

    Always returns exactly 3 shades.  Each dict contains only the fields
    relevant to the API response: ``shade_name``, ``hex``, and ``description``.
    """
    exact: list[dict] = [s for s in _FENTY_SHADES if s["monk_scale"] == monk_scale]

    # Within the exact-MST pool, prefer matching undertone.
    tone_match = [s for s in exact if s["undertone"] == undertone]
    tone_other = [s for s in exact if s["undertone"] != undertone]
    candidates: list[dict] = tone_match + tone_other

    if len(candidates) < 3:
        candidates.extend(_adjacent_shades(monk_scale, undertone, exclude=candidates))

    selected = candidates[:3]
    return [_public_fields(s) for s in selected]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _adjacent_shades(
    monk_scale: str,
    undertone: str,
    exclude: list[dict],
) -> list[dict]:
    """Collect shades from MST levels immediately adjacent to *monk_scale*,
    undertone-prioritised, excluding already-selected shades."""
    exclude_names = {s["shade_name"] for s in exclude}

    try:
        idx = _MST_ORDER.index(monk_scale)
    except ValueError:
        idx = -1

    adjacent_mst: list[str] = []
    if idx > 0:
        adjacent_mst.append(_MST_ORDER[idx - 1])
    if idx < len(_MST_ORDER) - 1:
        adjacent_mst.append(_MST_ORDER[idx + 1])

    pool: list[dict] = [
        s for s in _FENTY_SHADES
        if s["monk_scale"] in adjacent_mst and s["shade_name"] not in exclude_names
    ]

    tone_match = [s for s in pool if s["undertone"] == undertone]
    tone_other = [s for s in pool if s["undertone"] != undertone]
    return tone_match + tone_other


def _public_fields(shade: dict) -> dict:
    return {
        "shade_name": shade["shade_name"],
        "hex": shade["hex"],
        "description": shade["description"],
    }
