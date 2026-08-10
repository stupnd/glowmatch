"""Lip colour families ranked for a given skin tone.

Deliberately not product lookup. This ranks *colours* using the undertone and
depth already measured by the pipeline, which is the piece the lip-combo page
was missing — it previously assigned products arbitrary colours from a rotating
palette and never saw the user's tone at all.

Ranking is deterministic and offline, so it is unit-testable and cannot
hallucinate. Turning a colour into a purchasable product is a separate problem
tracked in issue #7.
"""

from __future__ import annotations

import functools
import json
from pathlib import Path

_DATA = Path(__file__).resolve().parent / "data" / "lip_shades.json"

# Penalty per Monk level outside a family's stated depth range. A family one
# level out is still usable; four levels out is not.
_DEPTH_PENALTY = 1.2

# Penalty for an undertone the family does not target. Neutral families sit
# acceptably on anyone, so they are only mildly penalised.
_OPPOSITE_UNDERTONE_PENALTY = 3.0
_NEUTRAL_UNDERTONE_PENALTY = 0.8


@functools.lru_cache(maxsize=1)
def load_families() -> list[dict]:
    with open(_DATA, encoding="utf-8") as f:
        return json.load(f)["families"]


def _depth_distance(depth_range: list[int], mst_level: int) -> int:
    low, high = depth_range
    if low <= mst_level <= high:
        return 0
    return low - mst_level if mst_level < low else mst_level - high


def rank(undertone: str, mst_level: int, limit: int = 6) -> list[dict]:
    """Return lip colour families ordered by fit, best first.

    Every family is scored rather than filtered, so the result is never empty —
    a user at an extreme of the scale still gets the closest available options
    with an honest note about the fit.
    """
    undertone = (undertone or "neutral").strip().lower()
    mst_level = max(1, min(10, int(mst_level)))

    scored = []
    for family in load_families():
        affinity = family["undertone_affinity"]
        if affinity == undertone:
            undertone_penalty = 0.0
        elif affinity == "neutral" or undertone == "neutral":
            undertone_penalty = _NEUTRAL_UNDERTONE_PENALTY
        else:
            undertone_penalty = _OPPOSITE_UNDERTONE_PENALTY

        out_by = _depth_distance(family["depth_range"], mst_level)
        score = undertone_penalty + out_by * _DEPTH_PENALTY

        scored.append(
            (
                score,
                {
                    "name": family["name"],
                    "hex": family["hex"],
                    "note": family["note"],
                    "undertone_affinity": affinity,
                    "in_depth_range": out_by == 0,
                    "why": _explain(family, undertone, affinity, out_by),
                },
            )
        )

    scored.sort(key=lambda pair: (pair[0], pair[1]["name"]))
    return [entry for _, entry in scored[:limit]]


def _explain(family: dict, undertone: str, affinity: str, out_by: int) -> str:
    if affinity == undertone:
        base = f"Matches your {undertone} undertone"
    elif affinity == "neutral":
        base = "Neutral enough to suit any undertone"
    elif undertone == "neutral":
        base = f"Leans {affinity}, which a neutral undertone carries"
    else:
        base = f"Leans {affinity} against your {undertone} undertone"

    if out_by == 0:
        return f"{base}, and sits in your depth range."
    if out_by <= 2:
        return f"{base}. Slightly outside your usual depth — worth trying."
    return f"{base}, but well outside your depth range."
