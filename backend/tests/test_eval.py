"""Smoke tests for backend/eval/test_set.json.

Verifies the test set's structure and that every referenced image file exists.
Does NOT run the ML pipeline — use eval/run_eval.py for that.

Run from the backend/ directory:
    pytest tests/test_eval.py -v
"""
import json
from pathlib import Path

import pytest

EVAL_DIR       = Path(__file__).resolve().parent.parent / "eval"
TEST_SET       = EVAL_DIR / "test_set.json"
VALID_LIGHTING = {"neutral", "warm", "low"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load() -> dict:
    return json.loads(TEST_SET.read_text())


def _samples() -> list[dict]:
    if not TEST_SET.exists():
        return []
    return _load().get("samples", [])


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_test_set_is_valid_json():
    assert TEST_SET.exists(), f"test_set.json not found at {TEST_SET}"
    data = _load()
    assert isinstance(data, dict),        "root must be a JSON object"
    assert "samples" in data,             'must have a "samples" key'
    assert isinstance(data["samples"], list), '"samples" must be a list'
    assert len(data["samples"]) > 0,      '"samples" must not be empty'


def test_all_samples_have_required_keys():
    required = {"id", "image_path", "true_mst", "lighting"}
    for sample in _samples():
        missing = required - sample.keys()
        assert not missing, f"sample {sample.get('id', '?')} missing keys: {missing}"


def test_true_mst_values_in_range():
    for sample in _samples():
        mst = sample["true_mst"]
        assert isinstance(mst, int), (
            f"true_mst must be int, got {type(mst).__name__} in {sample['id']}"
        )
        assert 1 <= mst <= 10, f"true_mst out of range in {sample['id']}: {mst}"


def test_lighting_values_valid():
    for sample in _samples():
        assert sample["lighting"] in VALID_LIGHTING, (
            f"invalid lighting '{sample['lighting']}' in {sample['id']}. "
            f"Must be one of: {sorted(VALID_LIGHTING)}"
        )


def test_ids_are_unique():
    ids = [s["id"] for s in _samples()]
    dupes = [i for i in ids if ids.count(i) > 1]
    assert not dupes, f"duplicate sample IDs: {list(set(dupes))}"


def test_image_paths_exist():
    missing = []
    for sample in _samples():
        img = EVAL_DIR / sample["image_path"]
        if not img.exists():
            missing.append(
                f"  {sample['id']}: {img}\n"
                f"    → run: python eval/add_sample.py "
                f"--image <path> --mst {sample['true_mst']} --lighting {sample['lighting']}"
            )
    assert not missing, "Missing image files:\n" + "\n".join(missing)
