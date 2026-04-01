"""Monk Skin Tone Scale classification and undertone detection."""

import colorsys

# Official Monk Skin Tone Scale hex values (MST-1 = lightest, MST-10 = darkest).
_MONK_SCALE: list[tuple[str, tuple[int, int, int]]] = [
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
    monk_label = _nearest_monk(avg_rgb)
    undertone = _detect_undertone(avg_rgb)
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

def _average_rgb(pixels: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    n = len(pixels)
    r = round(sum(p[0] for p in pixels) / n)
    g = round(sum(p[1] for p in pixels) / n)
    b = round(sum(p[2] for p in pixels) / n)
    return (r, g, b)


def _squared_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> int:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def _nearest_monk(rgb: tuple[int, int, int]) -> str:
    return min(_MONK_SCALE, key=lambda entry: _squared_distance(rgb, entry[1]))[0]


def _detect_undertone(rgb: tuple[int, int, int]) -> str:
    """Derive undertone from hue and the red-vs-blue channel ratio.

    Strategy:
    - Convert to HSV; hue in degrees helps anchor warm vs cool.
    - Red/blue ratio amplifies the signal on darker tones where hue
      differences are compressed.
    - Neutral band: ratio within ±0.06 of 1.0 AND hue outside the
      clearly warm (0-50°) or cool (180-270°) ranges.
    """
    r, g, b = rgb
    h_norm, _s, _v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    hue = h_norm * 360  # 0-360°

    rb_ratio = r / b if b > 0 else float("inf")

    # Clear warm signal: reddish / yellowish hues + red dominance.
    if rb_ratio > 1.12 or (0 <= hue <= 50):
        return "warm"

    # Clear cool signal: bluish / purplish hues + blue dominance.
    if rb_ratio < 0.88 or (180 <= hue <= 270):
        return "cool"

    return "neutral"
