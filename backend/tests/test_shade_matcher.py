"""Unit tests for shade_matcher.

Structural tests use match_shades (LAB colour-distance ranking).
Priority-ordering tests use match_shades_legacy to verify the fallback
heuristic independently.
"""

import pytest

from detection.shade_matcher import load_shades, match_shades, match_shades_legacy


# ---------------------------------------------------------------------------
# load_shades sanity checks
# ---------------------------------------------------------------------------

def test_load_shades_returns_nonempty_list():
    shades = load_shades()
    assert isinstance(shades, list)
    assert len(shades) > 0


def test_load_shades_all_have_required_keys():
    required = {"shade_name", "hex", "mst_range", "undertone", "description"}
    for s in load_shades():
        assert required <= s.keys(), f"Missing keys in shade {s.get('shade_name')}"


def test_load_shades_mst_range_valid():
    for s in load_shades():
        lo, hi = s["mst_range"]
        assert 1 <= lo <= hi <= 10, f"Bad mst_range in shade {s['shade_name']}"


def test_load_shades_undertone_values():
    valid = {"warm", "cool", "neutral"}
    for s in load_shades():
        assert s["undertone"] in valid, f"Unknown undertone in {s['shade_name']}"


def test_load_shades_hex_format():
    for s in load_shades():
        h = s["hex"]
        assert h.startswith("#") and len(h) == 7, f"Bad hex in {s['shade_name']}"


# ---------------------------------------------------------------------------
# match_shades — return count
# ---------------------------------------------------------------------------

def test_match_shades_returns_exactly_n():
    results = match_shades(5, "neutral", n=3)
    assert len(results) == 3


def test_match_shades_returns_fewer_when_n_equals_1():
    results = match_shades(5, "neutral", n=1)
    assert len(results) == 1


def test_match_shades_result_has_recommendation_field():
    results = match_shades(5, "neutral", n=1)
    assert "recommendation" in results[0]
    assert isinstance(results[0]["recommendation"], str)
    assert len(results[0]["recommendation"]) > 0


def test_match_shades_result_has_all_expected_keys():
    expected = {"shade_name", "hex", "description", "recommendation"}
    for r in match_shades(3, "warm", n=3):
        assert expected <= r.keys()


def test_match_shades_no_duplicate_shades():
    results = match_shades(5, "warm", n=3)
    names = [r["shade_name"] for r in results]
    assert len(names) == len(set(names))


# ---------------------------------------------------------------------------
# LAB-distance ranking tests
# ---------------------------------------------------------------------------

def test_match_shades_returns_match_score():
    """Every result should carry a match_score in (0, 1]."""
    results = match_shades(5, "warm", "#c89868", n=3)
    for r in results:
        assert "match_score" in r, "Results must include match_score"
        assert 0 < r["match_score"] <= 1, f"match_score out of range: {r['match_score']}"


def test_match_shades_scores_are_descending():
    """Top-n results should be sorted best-first."""
    results = match_shades(5, "warm", "#c89868", n=3)
    scores = [r["match_score"] for r in results]
    assert scores == sorted(scores, reverse=True), "Scores must be descending"


# ---------------------------------------------------------------------------
# match_shades — priority ordering
# ---------------------------------------------------------------------------

def test_exact_undertone_ranks_before_neutral():
    """Legacy: warm user at MST-6 should get a 'direct match' warm recommendation first."""
    results = match_shades_legacy(6, "warm", n=3)
    first = next(
        (r for r in results if "direct match" in r["recommendation"]),
        None,
    )
    assert first is not None, "Expected a direct-match recommendation in legacy results"
    assert "warm" in first["recommendation"]


def test_neutral_user_gets_neutral_shades_first():
    """Legacy: neutral user at MST-7 gets neutral direct-match shades ranked highest."""
    results = match_shades_legacy(7, "neutral", n=3)
    direct = [r for r in results if "direct match" in r["recommendation"]]
    for r in direct:
        assert "neutral" in r["recommendation"]


def test_adjacent_fills_when_exact_mst_exhausted():
    """Legacy: MST-1 has no cool shades; results must reference adjacent MST levels."""
    results = match_shades_legacy(1, "cool", n=3)
    assert len(results) == 3
    recs = " ".join(r["recommendation"] for r in results)
    assert "one level" in recs


def test_deep_mst_gets_results():
    """MST-10 should return 3 results without error."""
    results = match_shades(10, "neutral", n=3)
    assert len(results) == 3


def test_fair_mst_gets_results():
    """MST-1 with warm undertone should return 3 results without error."""
    results = match_shades(1, "warm", n=3)
    assert len(results) == 3


def test_cool_undertone_mid_range():
    """Legacy: MST-5 cool — 165C is the only exact-match cool shade; must appear."""
    results = match_shades_legacy(5, "cool", n=3)
    names = [r["shade_name"] for r in results]
    assert "165C" in names, f"Expected 165C in legacy results; got {names}"
