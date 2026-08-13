"""Perceptual colour difference in real CIELAB units.

Why this module exists
----------------------
The shade matcher previously computed "ΔE" as Euclidean distance in OpenCV's
**uint8** LAB encoding. That encoding packs L into 0–255 and a/b into 0–255
with a +128 offset, so relative to true CIELAB the lightness axis is stretched
2.55x while the chroma axes are 1:1.

Two consequences, both bad for this product:

1. **Lightness was weighted 2.55x too heavily against undertone.** Foundation
   matching is exactly the trade-off between "right depth" and "right
   undertone", so the metric was systematically biased toward depth.
2. **The numbers were not on the ΔE scale.** A ΔE of ~1 is the just-noticeable
   difference for a trained observer and ~2.3 for most people, which is what
   makes ΔE worth showing a user. Values in the uint8 space mean nothing.

This module works in true CIELAB (L 0–100) and implements CIEDE2000, which
corrects CIELAB's known non-uniformity — notably that it overstates differences
between saturated colours and understates them in the blue region.

Reference: Sharma, Wu & Dalal (2005), "The CIEDE2000 Color-Difference Formula:
Implementation Notes, Supplementary Test Data, and Mathematical Observations."
Verified against that paper's test data in tests/test_color_science.py.
"""

from __future__ import annotations

import math

# sRGB D65 reference white.
_XN, _YN, _ZN = 95.047, 100.000, 108.883


def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    h = hex_color.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    if len(h) != 6:
        raise ValueError(f"not a hex colour: {hex_color!r}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _srgb_to_linear(channel: float) -> float:
    """Undo the sRGB transfer function. Channel in 0–1."""
    return channel / 12.92 if channel <= 0.04045 else ((channel + 0.055) / 1.055) ** 2.4


def rgb_to_xyz(r: int, g: int, b: int) -> tuple[float, float, float]:
    rl, gl, bl = (_srgb_to_linear(c / 255.0) for c in (r, g, b))
    x = (0.4124564 * rl + 0.3575761 * gl + 0.1804375 * bl) * 100.0
    y = (0.2126729 * rl + 0.7151522 * gl + 0.0721750 * bl) * 100.0
    z = (0.0193339 * rl + 0.1191920 * gl + 0.9503041 * bl) * 100.0
    return x, y, z


def _f(t: float) -> float:
    return t ** (1 / 3) if t > 0.008856 else (7.787 * t) + (16 / 116)


def xyz_to_lab(x: float, y: float, z: float) -> tuple[float, float, float]:
    fx, fy, fz = _f(x / _XN), _f(y / _YN), _f(z / _ZN)
    return (116 * fy) - 16, 500 * (fx - fy), 200 * (fy - fz)


def hex_to_lab(hex_color: str) -> tuple[float, float, float]:
    """sRGB hex to true CIELAB (L 0–100, a/b roughly -128..127)."""
    return xyz_to_lab(*rgb_to_xyz(*hex_to_rgb(hex_color)))


def delta_e_76(lab1: tuple[float, float, float],
               lab2: tuple[float, float, float]) -> float:
    """Plain Euclidean distance in CIELAB. Cheap, and adequate for ranking."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2)))


def delta_e_2000(lab1: tuple[float, float, float],
                 lab2: tuple[float, float, float]) -> float:
    """CIEDE2000 colour difference.

    Roughly: <1 imperceptible, 1-2 perceptible on close inspection, 2-10
    perceptible at a glance, >10 clearly different colours.
    """
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2

    kL = kC = kH = 1.0

    C1 = math.hypot(a1, b1)
    C2 = math.hypot(a2, b2)
    C_bar = (C1 + C2) / 2

    # G expands the a* axis for low-chroma colours, which is what fixes
    # CIELAB's poor behaviour near neutral — directly relevant here, since skin
    # tones are low-chroma.
    C_bar7 = C_bar ** 7
    G = 0.5 * (1 - math.sqrt(C_bar7 / (C_bar7 + 25.0 ** 7)))

    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)

    h1p = math.degrees(math.atan2(b1, a1p)) % 360 if (a1p or b1) else 0.0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360 if (a2p or b2) else 0.0

    dLp = L2 - L1
    dCp = C2p - C1p

    if C1p * C2p == 0:
        dhp = 0.0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    elif h2p - h1p > 180:
        dhp = h2p - h1p - 360
    else:
        dhp = h2p - h1p + 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))

    Lp_bar = (L1 + L2) / 2
    Cp_bar = (C1p + C2p) / 2

    if C1p * C2p == 0:
        hp_bar = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hp_bar = (h1p + h2p) / 2
    elif h1p + h2p < 360:
        hp_bar = (h1p + h2p + 360) / 2
    else:
        hp_bar = (h1p + h2p - 360) / 2

    T = (
        1
        - 0.17 * math.cos(math.radians(hp_bar - 30))
        + 0.24 * math.cos(math.radians(2 * hp_bar))
        + 0.32 * math.cos(math.radians(3 * hp_bar + 6))
        - 0.20 * math.cos(math.radians(4 * hp_bar - 63))
    )

    d_theta = 30 * math.exp(-(((hp_bar - 275) / 25) ** 2))
    Cp_bar7 = Cp_bar ** 7
    R_C = 2 * math.sqrt(Cp_bar7 / (Cp_bar7 + 25.0 ** 7))
    R_T = -R_C * math.sin(math.radians(2 * d_theta))

    Lp_bar_sq = (Lp_bar - 50) ** 2
    S_L = 1 + (0.015 * Lp_bar_sq) / math.sqrt(20 + Lp_bar_sq)
    S_C = 1 + 0.045 * Cp_bar
    S_H = 1 + 0.015 * Cp_bar * T

    return math.sqrt(
        (dLp / (kL * S_L)) ** 2
        + (dCp / (kC * S_C)) ** 2
        + (dHp / (kH * S_H)) ** 2
        + R_T * (dCp / (kC * S_C)) * (dHp / (kH * S_H))
    )


def delta_e_hex(hex1: str, hex2: str) -> float:
    """CIEDE2000 between two sRGB hex colours."""
    return delta_e_2000(hex_to_lab(hex1), hex_to_lab(hex2))


# Interpretation bands, used to turn a number into user-facing copy.
def describe_delta_e(delta: float) -> str:
    if delta < 1.0:
        return "indistinguishable"
    if delta < 2.3:
        return "very close"
    if delta < 5.0:
        return "close"
    if delta < 10.0:
        return "noticeably different"
    return "clearly different"
