"""Tests for the deterministic half of the skincare quiz."""

import pytest

from skincare_quiz import QUESTIONS, QUESTIONS_BY_ID, TAGS, score


# ── Question set integrity ────────────────────────────────────────────────────

def test_every_option_weight_uses_a_known_tag():
    for question in QUESTIONS:
        for option in question.options:
            unknown = set(option.weights) - set(TAGS)
            assert not unknown, f"{question.id}/{option.value} has unknown tags {unknown}"


def test_option_values_are_unique_within_a_question():
    for question in QUESTIONS:
        values = [opt.value for opt in question.options]
        assert len(values) == len(set(values)), f"{question.id} has duplicate values"


def test_question_ids_are_unique():
    ids = [q.id for q in QUESTIONS]
    assert len(ids) == len(set(ids))


# ── Scoring ───────────────────────────────────────────────────────────────────

def test_concerns_accumulate_rather_than_compete():
    """Two concerns pointing at the same tag should add up.

    This is the whole reason for tag scoring over a decision tree.
    """
    one = score({"concerns": ["dark_spots"]})
    both = score({"concerns": ["dark_spots", "dullness"]})
    assert both.tag_scores["brightening"] > one.tag_scores["brightening"]


def test_dry_sensitive_skin_leads_with_gentle_and_hydrating():
    result = score({
        "skin_type": "sensitive",
        "concerns": ["redness", "dehydration"],
        "routine_depth": "minimal",
    })
    assert result.sensitive is True
    assert "gentle" in result.top_tags
    assert "calming" in result.top_tags


def test_routine_depth_sets_step_count():
    none = score({"routine_depth": "none"})
    advanced = score({"routine_depth": "advanced"})
    assert len(none.routine_steps) < len(advanced.routine_steps)
    assert none.routine_steps[0] == "cleanser"
    assert none.routine_steps[-1] == "sunscreen"


def test_high_exfoliating_score_promotes_an_exfoliant_step():
    result = score({
        "routine_depth": "minimal",          # skeleton has no exfoliant
        "concerns": ["texture", "dullness"],  # 3 + 2 = 5, over the threshold
        "goal_timeline": "quick",
    })
    assert "exfoliant" in result.routine_steps


def test_promoted_step_lands_in_application_order_not_appended():
    result = score({
        "routine_depth": "minimal",
        "concerns": ["texture", "dullness"],
        "goal_timeline": "quick",
    })
    steps = result.routine_steps
    assert steps[-1] == "sunscreen", "sunscreen must stay last"
    assert steps.index("exfoliant") < steps.index("moisturiser")
    assert steps.index("cleanser") < steps.index("exfoliant")


def test_sensitive_skin_does_not_get_an_exfoliant_promoted():
    """Reactive skin plus a texture concern should not auto-add an acid."""
    result = score({
        "skin_type": "sensitive",
        "routine_depth": "minimal",
        "concerns": ["texture", "dullness", "redness"],
    })
    assert result.sensitive is True
    assert "exfoliant" not in result.routine_steps


def test_rarely_wearing_spf_is_the_strongest_single_signal():
    result = score({"sun_habits": "rarely"})
    assert result.tag_scores["spf"] == 4
    assert result.top_tags[0] == "spf"


def test_rationale_only_covers_top_tags_and_names_the_answers():
    result = score({
        "skin_type": "dry",
        "concerns": ["dehydration"],
    })
    assert set(result.rationale).issubset(set(result.top_tags))
    assert "Dry" in result.rationale["hydrating"]
    assert "Dehydration" in result.rationale["hydrating"]


def test_rationale_does_not_repeat_the_same_answer_label():
    result = score({"skin_type": "sensitive", "concerns": ["redness"]})
    for reasons in result.rationale.values():
        assert len(reasons) == len(set(reasons))


# ── Robustness ────────────────────────────────────────────────────────────────

def test_empty_answers_still_produce_a_usable_routine():
    result = score({})
    assert result.routine_steps, "must fall back to a default skeleton"
    assert result.top_tags == ()


def test_unknown_question_and_option_ids_are_ignored():
    """A stale client should degrade, not 500."""
    result = score({
        "not_a_question": "whatever",
        "skin_type": "not_an_option",
        "concerns": ["dark_spots", "invented_concern"],
    })
    assert result.tag_scores["brightening"] == 3
    assert result.tag_scores["oil-control"] == 0


def test_single_value_accepted_where_a_list_is_expected():
    """Clients sometimes send a bare string for a multi-select with one pick."""
    listed = score({"concerns": ["acne"]})
    bare = score({"concerns": "acne"})
    assert bare.tag_scores == listed.tag_scores


def test_non_string_answer_values_do_not_raise():
    result = score({"skin_type": 42, "concerns": [None, {"a": 1}, "acne"]})
    assert result.tag_scores["acne-fighting"] == 3


@pytest.mark.parametrize("depth", ["none", "minimal", "moderate", "advanced"])
def test_sunscreen_is_always_last_step(depth):
    assert score({"routine_depth": depth}).routine_steps[-1] == "sunscreen"


@pytest.mark.parametrize("question", QUESTIONS, ids=lambda q: q.id)
def test_each_option_alone_scores_without_error(question):
    for option in question.options:
        answer = [option.value] if question.multi else option.value
        result = score({question.id: answer})
        assert set(result.tag_scores) == set(TAGS)
