"""Unit tests for monk_classifier classification functions.

All tests work in OpenCV uint8 LAB space (L ∈ [0, 255], a/b ∈ [0, 255]
where 128 is the neutral centre-point) to stay consistent with the
production code.
"""

import cv2
import numpy as np
import pytest

from detection.monk_classifier import (
    _MONK_RGB,
    _MST_REFERENCE_LAB,
    classify_mst,
    classify_undertone,
)


# ---------------------------------------------------------------------------
# Helper — same conversion used in monk_classifier so tests are self-contained
# ---------------------------------------------------------------------------

def _rgb_to_lab(r: int, g: int, b: int) -> tuple[float, float, float]:
    pixel = np.array([[[b, g, r]]], dtype=np.uint8)
    lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)
    L, a, bv = lab[0, 0]
    return (float(L), float(a), float(bv))


# Pre-compute reference LAB values for the levels used in tests.
_MST3_LAB  = _rgb_to_lab(*_MONK_RGB[2])   # index 2 → MST-3  (#f7ead0)
_MST8_LAB  = _rgb_to_lab(*_MONK_RGB[7])   # index 7 → MST-8  (#604134)


# ---------------------------------------------------------------------------
# classify_mst — nearest-neighbour correctness
# ---------------------------------------------------------------------------

def test_classify_mst_exact_mst3_reference_returns_3():
    """The exact MST-3 reference LAB value must classify as MST level 3."""
    assert classify_mst(_MST3_LAB) == 3


def test_classify_mst_exact_mst8_reference_returns_8():
    """The exact MST-8 reference LAB value must classify as MST level 8."""
    assert classify_mst(_MST8_LAB) == 8


def test_classify_mst_all_references_round_trip():
    """Every reference value should classify as its own MST level.

    This verifies that no two reference points are ambiguous (i.e. no
    reference is closer to a different reference than to itself).
    """
    for idx, lab in enumerate(_MST_REFERENCE_LAB):
        expected = idx + 1
        got = classify_mst(lab)
        assert got == expected, (
            f"MST-{expected} reference classified as MST-{got}"
        )


def test_classify_mst_returns_int():
    assert isinstance(classify_mst(_MST3_LAB), int)


def test_classify_mst_result_in_valid_range():
    level = classify_mst(_MST8_LAB)
    assert 1 <= level <= 10


# ---------------------------------------------------------------------------
# classify_undertone — warm / cool / neutral logic
# ---------------------------------------------------------------------------

def test_classify_undertone_warm_mid_range():
    """b* clearly above a* (yellow-golden) → warm at MST-5 (threshold 6)."""
    # a=128 (neutral), b=142 (+14 yellow): b_shift − a_shift = 14 > 6
    lab = (160.0, 128.0, 142.0)
    assert classify_undertone(lab, mst_level=5) == "warm"


def test_classify_undertone_cool_mid_range():
    """a* clearly above b* (pink-red) → cool at MST-5 (threshold 6)."""
    # a=142 (+14 red), b=128 (neutral): a_shift − b_shift = 14 > 6
    lab = (160.0, 142.0, 128.0)
    assert classify_undertone(lab, mst_level=5) == "cool"


def test_classify_undertone_neutral_mid_range():
    """Equal a* and b* → neutral at MST-5."""
    lab = (160.0, 128.0, 128.0)
    assert classify_undertone(lab, mst_level=5) == "neutral"


def test_classify_undertone_warm_pale_skin():
    """MST 1–3 threshold is 4; a difference of 5.5 should register as warm."""
    # b_shift − a_shift = 5.5 > 4
    lab = (240.0, 128.0, 133.5)
    assert classify_undertone(lab, mst_level=1) == "warm"


def test_classify_undertone_neutral_below_pale_threshold():
    """A 3-point difference at MST-1 (threshold 4) must stay neutral."""
    # b_shift − a_shift = 3 < 4
    lab = (240.0, 128.0, 131.0)
    assert classify_undertone(lab, mst_level=1) == "neutral"


def test_classify_undertone_warm_deep_skin():
    """MST 8–10 threshold is 3; a difference of 4.5 should register as warm."""
    # b_shift − a_shift = 4.5 > 3
    lab = (40.0, 128.0, 132.5)
    assert classify_undertone(lab, mst_level=9) == "warm"


def test_classify_undertone_neutral_below_deep_threshold():
    """A 2-point difference at MST-9 (threshold 3) must stay neutral."""
    # b_shift − a_shift = 2 < 3
    lab = (40.0, 128.0, 130.0)
    assert classify_undertone(lab, mst_level=9) == "neutral"


def test_classify_undertone_returns_string():
    result = classify_undertone(_MST3_LAB, mst_level=3)
    assert isinstance(result, str)
    assert result in {"warm", "cool", "neutral"}
