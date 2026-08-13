"""Tests for CIELAB conversion and CIEDE2000.

CIEDE2000 has several discontinuities (hue wrap-around, the zero-chroma cases)
that are easy to implement subtly wrong and that never show up on typical
inputs. Sharma, Wu & Dalal (2005) published test data specifically to catch
them; the cases below are taken from that paper and include the pairs designed
to straddle those discontinuities.
"""

import pytest

from color_science import (
    delta_e_2000,
    delta_e_76,
    delta_e_hex,
    describe_delta_e,
    hex_to_lab,
    hex_to_rgb,
)

# (lab1, lab2, expected dE2000) from Sharma et al. (2005), Table 1.
SHARMA_CASES = [
    ((50.0000, 2.6772, -79.7751), (50.0000, 0.0000, -82.7485), 2.0425),
    ((50.0000, 3.1571, -77.2803), (50.0000, 0.0000, -82.7485), 2.8615),
    ((50.0000, 2.8361, -74.0200), (50.0000, 0.0000, -82.7485), 3.4412),
    ((50.0000, -1.3802, -84.2814), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, -1.1848, -84.8006), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, -0.9009, -85.5211), (50.0000, 0.0000, -82.7485), 1.0000),
    ((50.0000, 0.0000, 0.0000), (50.0000, -1.0000, 2.0000), 2.3669),
    ((50.0000, -1.0000, 2.0000), (50.0000, 0.0000, 0.0000), 2.3669),
    # These three straddle a hue discontinuity: a 0.0001 change in b* moves the
    # result, which is exactly why Sharma published them.
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0009), 7.1792),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0010), 7.1792),
    ((50.0000, 2.4900, -0.0010), (50.0000, -2.4900, 0.0011), 7.2195),
    ((50.0000, -0.0010, 2.4900), (50.0000, 0.0009, -2.4900), 4.8045),
    ((50.0000, 2.5000, 0.0000), (50.0000, 0.0000, -2.5000), 4.3065),
    ((50.0000, 2.5000, 0.0000), (73.0000, 25.0000, -18.0000), 27.1492),
    ((50.0000, 2.5000, 0.0000), (61.0000, -5.0000, 29.0000), 22.8977),
    ((50.0000, 2.5000, 0.0000), (56.0000, -27.0000, -3.0000), 31.9030),
    ((50.0000, 2.5000, 0.0000), (58.0000, 24.0000, 15.0000), 19.4535),
    ((50.0000, 2.5000, 0.0000), (50.0000, 3.1736, 0.5854), 1.0000),
    ((50.0000, 2.5000, 0.0000), (50.0000, 3.2972, 0.0000), 1.0000),
    ((50.0000, 2.5000, 0.0000), (50.0000, 1.8634, 0.5757), 1.0000),
    ((50.0000, 2.5000, 0.0000), (50.0000, 3.2592, 0.3350), 1.0000),
    ((60.2574, -34.0099, 36.2677), (60.4626, -34.1751, 39.4387), 1.2644),
    ((63.0109, -31.0961, -5.8663), (62.8187, -29.7946, -4.0864), 1.2630),
    ((61.2901, 3.7196, -5.3901), (61.4292, 2.2480, -4.9620), 1.8731),
    ((35.0831, -44.1164, 3.7933), (35.0232, -40.0716, 1.5901), 1.8645),
    ((22.7233, 20.0904, -46.6940), (23.0331, 14.9730, -42.5619), 2.0373),
    ((36.4612, 47.8580, 18.3852), (36.2715, 50.5065, 21.2231), 1.4146),
    ((90.8027, -2.0831, 1.4410), (91.1528, -1.6435, 0.0447), 1.4441),
    ((90.9257, -0.5406, -0.9208), (88.6381, -0.8985, -0.7239), 1.5381),
    ((6.7747, -0.2908, -2.4247), (5.8714, -0.0985, -2.2286), 0.6377),
    ((2.0776, 0.0795, -1.1350), (0.9033, -0.0636, -0.5514), 0.9082),
]


@pytest.mark.parametrize("lab1,lab2,expected", SHARMA_CASES)
def test_ciede2000_matches_sharma_reference_data(lab1, lab2, expected):
    assert delta_e_2000(lab1, lab2) == pytest.approx(expected, abs=1e-4)


def test_ciede2000_is_symmetric():
    for lab1, lab2, _ in SHARMA_CASES:
        assert delta_e_2000(lab1, lab2) == pytest.approx(delta_e_2000(lab2, lab1), abs=1e-9)


def test_identical_colours_are_zero():
    lab = (52.0, 12.0, 18.0)
    assert delta_e_2000(lab, lab) == pytest.approx(0.0, abs=1e-12)
    assert delta_e_76(lab, lab) == pytest.approx(0.0, abs=1e-12)


# ── CIELAB conversion ─────────────────────────────────────────────────────────

def test_white_and_black_land_where_they_should():
    L, a, b = hex_to_lab("#FFFFFF")
    assert L == pytest.approx(100.0, abs=0.05)
    assert (a, b) == (pytest.approx(0.0, abs=0.02), pytest.approx(0.0, abs=0.02))

    L, a, b = hex_to_lab("#000000")
    assert L == pytest.approx(0.0, abs=0.05)


def test_lightness_is_on_the_0_100_scale_not_0_255():
    """The bug this module exists to fix: OpenCV uint8 LAB stretches L by 2.55x."""
    assert hex_to_lab("#FFFFFF")[0] == pytest.approx(100.0, abs=0.05)
    assert 50.0 < hex_to_lab("#808080")[0] < 56.0


def test_neutral_greys_have_near_zero_chroma():
    for grey in ("#404040", "#808080", "#C0C0C0"):
        _, a, b = hex_to_lab(grey)
        assert abs(a) < 0.5 and abs(b) < 0.5


@pytest.mark.parametrize("value,expected", [
    ("#fff", (255, 255, 255)),
    ("FFFFFF", (255, 255, 255)),
    ("#000000", (0, 0, 0)),
    ("#F6EDE4", (0xF6, 0xED, 0xE4)),
])
def test_hex_parsing_accepts_common_forms(value, expected):
    assert hex_to_rgb(value) == expected


@pytest.mark.parametrize("bad", ["", "#12", "nothex", "#GGGGGG"])
def test_bad_hex_raises(bad):
    with pytest.raises(ValueError):
        hex_to_rgb(bad)


# ── Behaviour that matters for shade matching ─────────────────────────────────

def test_undertone_difference_is_not_drowned_out_by_lightness():
    """The practical reason for this module.

    Two shades at the same depth but opposite undertones must register as more
    different than two shades one small step apart in depth with the same
    undertone. In the old uint8 space L was weighted 2.55x, which inverted this.
    """
    warm = "#C89A6B"
    cool = "#C89A8B"          # same depth, pinker
    slightly_deeper_warm = "#C49667"

    assert delta_e_hex(warm, cool) > delta_e_hex(warm, slightly_deeper_warm)


def test_identical_hex_is_zero_distance():
    assert delta_e_hex("#A07850", "#a07850") == pytest.approx(0.0, abs=1e-9)


@pytest.mark.parametrize("delta,expected", [
    (0.5, "indistinguishable"),
    (1.5, "very close"),
    (3.0, "close"),
    (7.0, "noticeably different"),
    (20.0, "clearly different"),
])
def test_delta_e_descriptions(delta, expected):
    assert describe_delta_e(delta) == expected
