#!/usr/bin/env python3
"""Run the eval test set against the Tinted analysis pipeline end to end.

Loads eval/test_set.json, runs each sample through the full pipeline (no HTTP
server required), and reports exact and within-1 MST accuracy broken down by
**MST level** and by lighting condition.

The per-level breakdown is the important one. docs/classifier-evaluation.md
shows the classifier's reliability varies more than 2x across the scale, so a
single headline accuracy number averages over the exact thing worth knowing.

Usage (from the backend/ directory):
    python eval/run_eval.py
    python eval/run_eval.py --lighting warm
    python eval/run_eval.py --json report.json
    python eval/run_eval.py --verbose

Placeholder guard
-----------------
The repository ships placeholder images so the harness is runnable before real
data exists. They are detected and the run REFUSES to report accuracy, because
a number computed over placeholders looks exactly like a real result and is
worse than no number at all. See eval/README.md for collecting real samples.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

EVAL_DIR = Path(__file__).resolve().parent
BACKEND_DIR = EVAL_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

import numpy as np  # noqa: E402
import cv2  # noqa: E402

from detection.face_detection import detect_face, extract_skin_sample_from_image  # noqa: E402
from detection.monk_classifier import classify_monk  # noqa: E402

TEST_SET = EVAL_DIR / "test_set.json"

# Anything at or below this is not a photograph — the shipped placeholders are
# 74 bytes.
PLACEHOLDER_MAX_BYTES = 2048


def is_placeholder(path: Path) -> bool:
    """True if *path* is a stand-in rather than a real photograph.

    Two signals: implausibly small for a photo, or (for larger files) almost no
    colour variance, which is what a solid-colour fill looks like.
    """
    try:
        if path.stat().st_size <= PLACEHOLDER_MAX_BYTES:
            return True
        img = cv2.imread(str(path))
        if img is None:
            return True
        return float(np.std(img)) < 1.0
    except Exception:
        return True


# ── Running ───────────────────────────────────────────────────────────────────

def evaluate(samples: list[dict], verbose: bool) -> dict:
    per_sample: list[dict] = []

    for sample in samples:
        path = EVAL_DIR / sample["image_path"]
        row = {
            "id": sample["id"],
            "true_mst": sample["true_mst"],
            "lighting": sample.get("lighting", "unknown"),
            "predicted": None,
            "status": None,
        }

        if not path.exists():
            row["status"] = "missing"
        else:
            try:
                image_bytes = path.read_bytes()
                img_bgr, landmarks = detect_face(image_bytes)
                if landmarks is None:
                    row["status"] = "no-face"
                else:
                    skin = extract_skin_sample_from_image(img_bgr, landmarks)
                    result = classify_monk(skin, image_bytes)
                    row["predicted"] = int(result["monk_scale"].split("-")[1])
                    row["undertone"] = result.get("undertone")
                    row["status"] = "ok"
            except Exception as exc:  # noqa: BLE001 — report, don't crash the run
                row["status"] = "error"
                row["error"] = str(exc)

        if row["status"] == "ok":
            row["delta"] = abs(row["predicted"] - row["true_mst"])
            row["exact"] = row["delta"] == 0
            row["within1"] = row["delta"] <= 1
        per_sample.append(row)

    scored = [r for r in per_sample if r["status"] == "ok"]

    def rate(rows: list[dict], key: str) -> float | None:
        return round(sum(r[key] for r in rows) / len(rows), 4) if rows else None

    by_level: dict[int, list[dict]] = defaultdict(list)
    by_light: dict[str, list[dict]] = defaultdict(list)
    for r in scored:
        by_level[r["true_mst"]].append(r)
        by_light[r["lighting"]].append(r)

    # Confusion: true level -> predicted level -> count.
    confusion: dict[int, dict[int, int]] = defaultdict(lambda: defaultdict(int))
    for r in scored:
        confusion[r["true_mst"]][r["predicted"]] += 1

    return {
        "counts": {
            "total": len(per_sample),
            "scored": len(scored),
            **{
                status: sum(1 for r in per_sample if r["status"] == status)
                for status in ("missing", "no-face", "error")
            },
        },
        "overall": {"exact": rate(scored, "exact"), "within1": rate(scored, "within1")},
        "by_level": {
            lvl: {
                "n": len(rows),
                "exact": rate(rows, "exact"),
                "within1": rate(rows, "within1"),
            }
            for lvl, rows in sorted(by_level.items())
        },
        "by_lighting": {
            light: {
                "n": len(rows),
                "exact": rate(rows, "exact"),
                "within1": rate(rows, "within1"),
            }
            for light, rows in sorted(by_light.items())
        },
        "confusion": {t: dict(preds) for t, preds in sorted(confusion.items())},
        "samples": per_sample if verbose else None,
    }


# ── Reporting ─────────────────────────────────────────────────────────────────

def render(report: dict) -> str:
    lines: list[str] = []
    p = lines.append
    c = report["counts"]

    p(f"\nScored {c['scored']} of {c['total']} samples"
      f"  (missing {c['missing']}, no-face {c['no-face']}, error {c['error']})")

    if not c["scored"]:
        p("\nNothing scored — no accuracy to report.")
        return "\n".join(lines)

    o = report["overall"]
    p(f"\nOverall    exact {o['exact']:.0%}    within +/-1 {o['within1']:.0%}")

    p("\nBy MST level  (the breakdown that matters — see docs/classifier-evaluation.md)")
    p("  lvl    n   exact  within1")
    missing_levels = []
    for lvl in range(1, 11):
        stats = report["by_level"].get(lvl) or report["by_level"].get(str(lvl))
        if not stats:
            missing_levels.append(lvl)
            p(f"  {lvl:>3}    -       -        -")
            continue
        p(f"  {lvl:>3}  {stats['n']:>3}   {stats['exact']:>5.0%}    {stats['within1']:>5.0%}")
    if missing_levels:
        p(f"\n  ! No samples for MST {missing_levels}. Accuracy is unmeasured there,")
        p("    which is not the same as accurate.")

    if len(report["by_lighting"]) > 1:
        p("\nBy lighting")
        for light, s in report["by_lighting"].items():
            p(f"  {light:<8} n={s['n']:<3} exact {s['exact']:.0%}  within1 {s['within1']:.0%}")

    if report["confusion"]:
        p("\nConfusion (true -> predicted)")
        for true, preds in report["confusion"].items():
            spread = ", ".join(f"{k}x{v}" for k, v in sorted(preds.items()))
            p(f"  {true:>3} -> {spread}")

    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("--lighting", choices=["neutral", "warm", "low"])
    ap.add_argument("--verbose", action="store_true", help="include per-sample rows")
    ap.add_argument("--json", type=Path, help="write the raw report here")
    ap.add_argument(
        "--allow-placeholders",
        action="store_true",
        help="run anyway (for testing the harness itself — output is meaningless)",
    )
    args = ap.parse_args()

    samples = json.loads(TEST_SET.read_text())["samples"]
    if args.lighting:
        samples = [s for s in samples if s.get("lighting") == args.lighting]
    if not samples:
        print("No samples match the filter.")
        return 1

    placeholders = [s for s in samples if is_placeholder(EVAL_DIR / s["image_path"])]
    if placeholders and not args.allow_placeholders:
        print(
            f"\nREFUSING TO RUN: {len(placeholders)} of {len(samples)} samples are "
            f"placeholder images, not photographs.\n"
        )
        for s in placeholders:
            print(f"  {s['id']:<32} {s['image_path']}")
        print(
            "\nAn accuracy number computed over these would look exactly like a real\n"
            "result. Collect real labelled samples first — eval/README.md documents\n"
            "the workflow, and eval/add_sample.py registers them.\n"
            "\nTo exercise the harness itself anyway: --allow-placeholders\n"
        )
        return 2

    report = evaluate(samples, args.verbose)
    print(render(report))

    if args.json:
        args.json.write_text(json.dumps(report, indent=2, default=str) + "\n")
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
