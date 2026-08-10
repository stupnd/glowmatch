"""Tests for lip colour ranking."""

import pytest

from lip_palette import load_families, rank

UNDERTONES = ("warm", "cool", "neutral")


def test_every_family_is_well_formed():
    for family in load_families():
        assert set(family) >= {"name", "hex", "undertone_affinity", "depth_range", "note"}
        assert family["undertone_affinity"] in UNDERTONES
        assert family["hex"].startswith("#") and len(family["hex"]) == 7
        low, high = family["depth_range"]
        assert 1 <= low <= high <= 10


def test_family_names_are_unique():
    names = [f["name"] for f in load_families()]
    assert len(names) == len(set(names))


@pytest.mark.parametrize("undertone", UNDERTONES)
@pytest.mark.parametrize("level", range(1, 11))
def test_always_returns_something(undertone, level):
    """Scored rather than filtered — nobody gets an empty palette."""
    assert rank(undertone, level, limit=6)


@pytest.mark.parametrize("undertone", ["warm", "cool"])
def test_matching_undertone_ranks_first(undertone):
    top = rank(undertone, 5, limit=3)
    assert top[0]["undertone_affinity"] in (undertone, "neutral")
    # An opposite-undertone family must not beat a matching one at the top.
    opposite = "cool" if undertone == "warm" else "warm"
    assert top[0]["undertone_affinity"] != opposite


def test_depth_is_respected():
    """A fair-skin nude should not lead the palette for deep skin."""
    deep = [f["name"] for f in rank("neutral", 10, limit=6)]
    assert "Nude beige" not in deep[:3]


def test_out_of_depth_families_are_flagged():
    results = rank("warm", 1, limit=len(load_families()))
    flagged = [r for r in results if not r["in_depth_range"]]
    assert flagged, "expected some families to be out of range at MST 1"
    for r in flagged:
        assert "depth" in r["why"].lower()


def test_ranking_is_deterministic():
    assert rank("warm", 6) == rank("warm", 6)


@pytest.mark.parametrize("level,expected", [(-5, 1), (0, 1), (99, 10)])
def test_out_of_range_levels_are_clamped(level, expected):
    assert rank("warm", level) == rank("warm", expected)


@pytest.mark.parametrize("undertone", ["", "  WARM  ", "Unknown", None])
def test_odd_undertones_do_not_raise(undertone):
    assert rank(undertone, 5)  # type: ignore[arg-type]


def test_case_and_whitespace_insensitive():
    assert rank("  WARM ", 5) == rank("warm", 5)


def test_limit_is_honoured():
    assert len(rank("cool", 4, limit=2)) == 2


def test_why_mentions_the_users_undertone_when_it_matches():
    for entry in rank("warm", 6, limit=3):
        if entry["undertone_affinity"] == "warm":
            assert "warm" in entry["why"].lower()
