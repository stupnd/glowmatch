"""Monk Skin Tone Scale classification and undertone detection.

Reference
---------
Monk, E. et al. (2023) "An Open Benchmark for Skin Tone Research:
The Monk Skin Tone (MST) Scale."  https://arxiv.org/abs/2205.06694

Classification strategy
-----------------------
Pure LAB nearest-neighbour against the 10 MST reference values derived from
the paper's canonical sRGB hex codes.  No ML model required — the upstream
gray-world white balance + CLAHE normalisation makes the raw LAB measurement
reliable enough for direct distance matching.

Undertone strategy
------------------
Uses per-MST-range thresholds on (b* − a*) / (a* − b*) in OpenCV uint8 LAB
space because the a*/b* spread is compressed at the pale (MST 1–3) and deep
(MST 8–10) ends of the scale.  A single threshold misclassifies both extremes.
"""

from __future__ import annotations

import cv2
import numpy as np

from detection.face_detection import SkinSample

# ---------------------------------------------------------------------------
# Monk Skin Tone Scale — canonical sRGB reference values
#
# Source: Monk et al. (2023), Table 1 / Appendix A.
# Ordered MST-1 → MST-10; list index i corresponds to MST level i+1.
# ---------------------------------------------------------------------------

_MONK_RGB: list[tuple[int, int, int]] = [
    (0xF6, 0xED, 0xE4),  # MST-1  — very fair
    (0xF3, 0xE7, 0xDB),  # MST-2  — fair
    (0xF7, 0xEA, 0xD0),  # MST-3  — light
    (0xEA, 0xDA, 0xBA),  # MST-4  — light-medium
    (0xD7, 0xBD, 0x96),  # MST-5  — medium
    (0xA0, 0x78, 0x50),  # MST-6  — medium-deep
    (0x82, 0x5C, 0x43),  # MST-7  — tan / deep-medium
    (0x60, 0x41, 0x34),  # MST-8  — deep
    (0x3A, 0x31, 0x2A),  # MST-9  — very deep
    (0x29, 0x24, 0x20),  # MST-10 — deepest
]


def _rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert a single sRGB triplet to OpenCV uint8 LAB.

    OpenCV's uint8 encoding:  L ∈ [0, 255],  a, b ∈ [0, 255]  (128 = neutral).
    """
    pixel = np.array([[[b, g, r]]], dtype=np.uint8)
    lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)
    L, a, b_val = lab[0, 0]
    return (float(L), float(a), float(b_val))


# The 10 canonical reference LAB tuples, computed once at import time.
# MST level N is at index N-1.
_MST_REFERENCE_LAB: list[tuple[float, float, float]] = [
    _rgb_to_lab(r, g, b) for r, g, b in _MONK_RGB
]

# ---------------------------------------------------------------------------
# Per-range undertone thresholds
#
# The a*/b* spread is compressed at the ends of the MST scale:
#   MST 1–3:  pale skin  — subtle hue differences; tight threshold avoids
#             mapping everything to "neutral"
#   MST 4–7:  mid-range  — standard separation is most reliable here
#   MST 8–10: deep skin  — a*/b* both near zero; tighten to stay sensitive
# ---------------------------------------------------------------------------

def _undertone_threshold(mst_level: int) -> float:
    if mst_level <= 3:
        return 4.0
    if mst_level <= 7:
        return 6.0
    return 3.0


# ---------------------------------------------------------------------------
# Public classification functions
# ---------------------------------------------------------------------------

def classify_mst(lab: tuple[float, float, float]) -> int:
    """Return the MST level (1–10) whose reference LAB value is nearest to
    *lab* under squared Euclidean distance in OpenCV uint8 LAB space.

    Using squared distance is valid for nearest-neighbour because the square
    root is monotone — it preserves the ordering without the extra cost.
    """
    best_level = 1
    best_dist  = float("inf")
    for level, ref in enumerate(_MST_REFERENCE_LAB, start=1):
        dist = (
            (lab[0] - ref[0]) ** 2
            + (lab[1] - ref[1]) ** 2
            + (lab[2] - ref[2]) ** 2
        )
        if dist < best_dist:
            best_dist  = dist
            best_level = level
    return best_level


def classify_undertone(lab: tuple[float, float, float], mst_level: int) -> str:
    """Classify undertone as ``"warm"``, ``"cool"``, or ``"neutral"``.

    Both a* and b* are centred on 128 in OpenCV uint8 LAB:
        a_shift > 0  → red-pink cast
        b_shift > 0  → yellow-golden cast

    Warm skin (peach/golden) has b_shift dominating a_shift.
    Cool skin (pink/rosy)    has a_shift dominating b_shift.
    The separation threshold varies by MST range — see ``_undertone_threshold``.
    """
    _, a, b    = lab
    a_shift    = a - 128.0
    b_shift    = b - 128.0
    threshold  = _undertone_threshold(mst_level)

    if b_shift - a_shift > threshold:
        return "warm"
    if a_shift - b_shift > threshold:
        return "cool"
    return "neutral"


def classify_mst_with_distances(
    lab: tuple[float, float, float],
) -> list[dict]:
    """Return all 10 MST Euclidean distances as [{"mst": int, "distance": float}, ...].

    Lower distance = closer match.  Used by the streaming endpoint so the
    frontend can animate the full distance sweep before revealing the winner.
    """
    return [
        {
            "mst":      level,
            "distance": round(
                (
                    (lab[0] - ref[0]) ** 2
                    + (lab[1] - ref[1]) ** 2
                    + (lab[2] - ref[2]) ** 2
                ) ** 0.5,
                2,
            ),
        }
        for level, ref in enumerate(_MST_REFERENCE_LAB, start=1)
    ]


def classify_monk(
    sample: SkinSample,
    image_bytes: bytes | None = None,   # accepted for call-site compatibility; unused
) -> dict:
    """Classify a :class:`~detection.face_detection.SkinSample` and return a
    result dict with ``monk_scale``, ``undertone``, ``avg_rgb``, and
    ``avg_hex``.

    The *image_bytes* parameter is accepted but ignored — classification is
    pure LAB nearest-neighbour with no ML model dependency.
    """
    avg_rgb   = sample.rgb
    avg_lab   = sample.lab

    mst_level = classify_mst(avg_lab)
    undertone = classify_undertone(avg_lab, mst_level)
    avg_hex   = "#{:02x}{:02x}{:02x}".format(*avg_rgb)

    return {
        "monk_scale": f"MST-{mst_level}",
        "undertone":  undertone,
        "avg_rgb":    list(avg_rgb),
        "avg_hex":    avg_hex,
    }
