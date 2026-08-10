"""Fenty Beauty Pro Filt'r foundation shade matching.

Shade data lives in ``backend/data/shades.json``.  Hex values are
approximate and should be verified against the official Fenty Beauty
website before a production release.

Public API
----------
load_shades()                                        -> list[dict]
match_shades(mst_level, undertone, hex, n=3)        -> list[dict]
match_shades_legacy(mst_level, undertone, n=3)      -> list[dict]
"""

from __future__ import annotations

import functools
import json
import logging
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_SHADES_PATH = Path(__file__).resolve().parent.parent / "data" / "shades.json"


@functools.lru_cache(maxsize=1)
def load_shades() -> list[dict]:
    """Read and return the shade dataset, cached after the first call."""
    with open(_SHADES_PATH, encoding="utf-8") as f:
        return json.load(f)


def match_shades(
    mst_level: int,
    undertone: str,
    hex_color: str = "#808080",
    n: int = 3,
) -> list[dict]:
    """Return top-*n* shades ranked by LAB colour distance to the measured skin hex.

    Foundation should match the skin it sits on, so the ranking metric is
    ΔE (Euclidean distance in OpenCV LAB) between the user's measured hex and
    each shade's swatch hex, plus an undertone-compatibility penalty.  Falls
    back to the MST-range heuristic when the hex cannot be parsed.

    Each dict contains shade_name, hex, description, recommendation, and
    match_score (0–1, higher is closer).
    """
    try:
        return _match_shades_lab(undertone, hex_color, n)
    except Exception as exc:
        logger.warning("LAB match failed, using legacy fallback: %s", exc)
        return match_shades_legacy(mst_level, undertone, n)


# Penalties added to ΔE when the shade's undertone doesn't match the user's.
# Opposite undertone (warm vs cool) is a visible mismatch; neutral shades sit
# acceptably on any undertone, so the penalty is mild.
_OPPOSITE_UNDERTONE_PENALTY = 12.0
_NEUTRAL_UNDERTONE_PENALTY  = 4.0


def _hex_to_lab(hex_color: str) -> tuple[float, float, float]:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    pixel = np.array([[[b, g, r]]], dtype=np.uint8)
    L, a, b_val = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)[0, 0]
    return (float(L), float(a), float(b_val))


def _match_shades_lab(undertone: str, hex_color: str, n: int) -> list[dict]:
    skin_lab = _hex_to_lab(hex_color)

    ranked: list[tuple[float, float, dict]] = []
    for shade in load_shades():
        shade_lab = _hex_to_lab(shade["hex"])
        delta_e = sum((skin_lab[i] - shade_lab[i]) ** 2 for i in range(3)) ** 0.5

        if shade["undertone"] == undertone:
            penalty = 0.0
        elif shade["undertone"] == "neutral" or undertone == "neutral":
            penalty = _NEUTRAL_UNDERTONE_PENALTY
        else:
            penalty = _OPPOSITE_UNDERTONE_PENALTY

        ranked.append((delta_e + penalty, delta_e, shade))

    ranked.sort(key=lambda t: t[0])

    results = []
    for score, delta_e, shade in ranked[:n]:
        if shade["undertone"] == undertone:
            why = (
                f"{shade['shade_name']} is the closest colour match to your "
                f"measured skin tone and shares your {undertone} undertone."
            )
        elif shade["undertone"] == "neutral":
            why = (
                f"{shade['shade_name']} is a close colour match to your measured "
                f"skin tone — a neutral shade that suits your {undertone} undertone."
            )
        else:
            why = (
                f"{shade['shade_name']} is a close colour match to your "
                "measured skin tone."
            )
        results.append({
            "shade_name":     shade["shade_name"],
            "hex":            shade["hex"],
            "description":    shade["description"],
            "recommendation": why,
            "match_score":    round(1.0 / (1.0 + score / 25.0), 4),
        })
    return results


def match_shades_legacy(mst_level: int, undertone: str, n: int = 3) -> list[dict]:
    """Return exactly *n* Fenty Pro Filt'r shades for *mst_level* / *undertone*.

    Priority order:
      a. Exact MST range + exact undertone
      b. Exact MST range + neutral undertone (neutral suits all undertones;
         skipped when the user is already neutral — those shades were in (a))
      c. Adjacent MST (±1) + exact undertone
      d. Adjacent MST (±1) + any undertone  (fill remaining slots)

    Each returned dict contains ``shade_name``, ``hex``, ``description``,
    and a ``recommendation`` string explaining why the shade was selected.
    """
    shades = load_shades()
    selected: list[dict] = []
    used: set[str] = set()

    def _in_range(shade: dict, level: int) -> bool:
        lo, hi = shade["mst_range"]
        return lo <= level <= hi

    def _is_adjacent(shade: dict, level: int) -> bool:
        covers_neighbor = _in_range(shade, level - 1) or _in_range(shade, level + 1)
        return covers_neighbor and not _in_range(shade, level)

    def _adjacent_label(shade: dict, level: int) -> str:
        lo, hi = shade["mst_range"]
        if hi < level:
            return f"one level lighter (MST-{hi})"
        return f"one level deeper (MST-{lo})"

    def _add(shade: dict, recommendation: str) -> None:
        if shade["shade_name"] not in used and len(selected) < n:
            used.add(shade["shade_name"])
            selected.append({
                "shade_name":     shade["shade_name"],
                "hex":            shade["hex"],
                "description":    shade["description"],
                "recommendation": recommendation,
            })

    # (a) Exact MST + exact undertone
    for s in shades:
        if _in_range(s, mst_level) and s["undertone"] == undertone:
            _add(s, (
                f"{s['shade_name']} is a direct match — "
                f"MST-{mst_level} depth with your {undertone} undertone."
            ))

    # (b) Exact MST + neutral (skipped when user undertone is neutral)
    if undertone != "neutral":
        for s in shades:
            if _in_range(s, mst_level) and s["undertone"] == "neutral":
                _add(s, (
                    f"{s['shade_name']} is matched to your MST-{mst_level} depth — "
                    "a neutral shade that suits all undertones."
                ))

    # (c) Adjacent MST + exact undertone
    for s in shades:
        if _is_adjacent(s, mst_level) and s["undertone"] == undertone:
            adj = _adjacent_label(s, mst_level)
            _add(s, (
                f"{s['shade_name']} is {adj} and shares "
                f"your {undertone} undertone — a close match."
            ))

    # (d) Adjacent MST + any undertone
    for s in shades:
        if _is_adjacent(s, mst_level):
            adj = _adjacent_label(s, mst_level)
            _add(s, (
                f"{s['shade_name']} is {adj} — "
                f"a {s['undertone']} shade near your depth."
            ))

    return selected[:n]
