"""Monk Skin Tone Scale classification and undertone detection."""

import cv2
import numpy as np

# Official Monk Skin Tone Scale hex values (MST-1 = lightest, MST-10 = darkest).
_MONK_SCALE_RGB: list[tuple[str, tuple[int, int, int]]] = [
    ("MST-1",  (0xF6, 0xED, 0xE4)),
    ("MST-2",  (0xF3, 0xE7, 0xDB)),
    ("MST-3",  (0xF7, 0xEA, 0xD0)),
    ("MST-4",  (0xEA, 0xDA, 0xBA)),
    ("MST-5",  (0xD7, 0xBD, 0x96)),
    ("MST-6",  (0xA0, 0x78, 0x50)),
    ("MST-7",  (0x82, 0x5C, 0x43)),
    ("MST-8",  (0x60, 0x41, 0x34)),
    ("MST-9",  (0x3A, 0x31, 0x2A)),
    ("MST-10", (0x29, 0x24, 0x20)),
]


def classify_monk(pixels: list[tuple[int, int, int]]) -> dict:
    """Classify a list of RGB skin-tone pixels into a Monk Skin Tone value
    and an undertone (warm / cool / neutral).

    Args:
        pixels: RGB tuples sampled from skin regions.

    Returns:
        {
            "monk_scale": "MST-5",
            "undertone":  "warm",
            "avg_rgb":    [R, G, B],
            "avg_hex":    "#d7bd96",
        }
        Returns an empty dict when *pixels* is empty.
    """
    if not pixels:
        return {}

    avg_rgb = _average_rgb(pixels)
    avg_lab = _rgb_to_lab_triple(*avg_rgb)
    monk_label = _nearest_monk(avg_lab)
    undertone = _detect_undertone(avg_lab)
    avg_hex = "#{:02x}{:02x}{:02x}".format(*avg_rgb)

    return {
        "monk_scale": monk_label,
        "undertone": undertone,
        "avg_rgb": list(avg_rgb),
        "avg_hex": avg_hex,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _rgb_to_lab_triple(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert a single RGB triplet to OpenCV's 8-bit LAB encoding.

    OpenCV encodes LAB as uint8 where:
      L  → [0, 255]  (maps to CIE L* 0–100)
      a* → [0, 255]  (neutral at 128; >128 = red/magenta, <128 = green)
      b* → [0, 255]  (neutral at 128; >128 = yellow,       <128 = blue)
    """
    # OpenCV expects BGR channel order.
    pixel = np.array([[[b, g, r]]], dtype=np.uint8)
    lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)
    L, a, b_val = lab[0, 0]
    return (float(L), float(a), float(b_val))


def _average_rgb(pixels: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    n = len(pixels)
    r = round(sum(p[0] for p in pixels) / n)
    g = round(sum(p[1] for p in pixels) / n)
    b = round(sum(p[2] for p in pixels) / n)
    return (r, g, b)


def _lab_squared_distance(
    a: tuple[float, float, float],
    b: tuple[float, float, float],
) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def _nearest_monk(lab: tuple[float, float, float]) -> str:
    return min(_MONK_SCALE_LAB, key=lambda entry: _lab_squared_distance(lab, entry[1]))[0]


def _detect_undertone(lab: tuple[float, float, float]) -> str:
    """Derive undertone from the LAB a* and b* channels.

    In OpenCV's 8-bit LAB encoding, 128 is the neutral midpoint:
      b_shift > 0  →  yellow/golden push  →  warm
      a_shift > 0  →  red/pink push       →  cool

    A 6-unit margin keeps borderline colours in the neutral band rather
    than misclassifying them due to minor sensor noise.
    """
    _L, a, b = lab
    a_shift = a - 128.0  # positive = red-pink (cool)
    b_shift = b - 128.0  # positive = yellow-golden (warm)

    _THRESHOLD = 6.0

    if b_shift - a_shift > _THRESHOLD:
        return "warm"
    if a_shift - b_shift > _THRESHOLD:
        return "cool"
    return "neutral"


# ---------------------------------------------------------------------------
# Deferred initialisation — build the LAB palette after helpers are defined.
# ---------------------------------------------------------------------------

_MONK_SCALE_LAB = [
    (label, _rgb_to_lab_triple(r, g, b))
    for label, (r, g, b) in _MONK_SCALE_RGB
]
