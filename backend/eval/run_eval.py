#!/usr/bin/env python3
"""
Run the eval test set against the Tinted analysis pipeline.

Loads backend/eval/test_set.json, runs each sample through the skin-tone
pipeline directly (no HTTP server required), and reports exact and within-1
MST accuracy broken down by lighting condition.

Usage (run from the backend/ directory):
    python eval/run_eval.py
    python eval/run_eval.py --lighting warm
    python eval/run_eval.py --verbose

Notes:
- Solid-color placeholder images will fail face detection — that is expected.
  Replace placeholders with real face photos before interpreting results.
- Lighting condition is metadata only; the pipeline does not receive it.
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

EVAL_DIR    = Path(__file__).resolve().parent
BACKEND_DIR = EVAL_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from detection.face_detection import detect_face, extract_skin_sample_from_image
from detection.monk_classifier import classify_monk

TEST_SET = EVAL_DIR / "test_set.json"


def run(lighting_filter: str | None, verbose: bool) -> None:
    data    = json.loads(TEST_SET.read_text())
    samples = data["samples"]

    if lighting_filter:
        samples = [s for s in samples if s["lighting"] == lighting_filter]

    if not samples:
        print("No samples match the filter.")
        return

    exact_by_light: dict[str, list[bool]] = defaultdict(list)
    w1_by_light:    dict[str, list[bool]] = defaultdict(list)
    rows: list[str] = []
    skipped = 0

    for sample in samples:
        img_path = EVAL_DIR / sample["image_path"]
        sid      = sample["id"]

        if not img_path.exists():
            rows.append(f"  ?  {sid:<30} image not found — skipped")
            skipped += 1
            continue

        try:
            image_bytes         = img_path.read_bytes()
            img_bgr, landmarks  = detect_face(image_bytes)
            if landmarks is None:
                rows.append(f"  ?  {sid:<30} no face detected — skipped")
                skipped += 1
                continue
            skin   = extract_skin_sample_from_image(img_bgr, landmarks)
            result = classify_monk(skin, image_bytes)
            pred   = int(result["monk_scale"].split("-")[1])
            true   = sample["true_mst"]
            diff   = abs(pred - true)
            ok_e   = diff == 0
            ok_w1  = diff <= 1
            exact_by_light[sample["lighting"]].append(ok_e)
            w1_by_light[sample["lighting"]].append(ok_w1)
            marker = "✓" if ok_e else ("~" if ok_w1 else "✗")
            line   = f"  {marker}  {sid:<30} true={true}  pred={pred}  Δ={diff}"
            if verbose and "undertone" in result:
                line += f"  ({result['undertone']})"
            rows.append(line)
        except Exception as exc:
            rows.append(f"  !  {sid:<30} ERROR: {exc}")
            skipped += 1

    ran = len(samples) - skipped
    print(f"\nEval results — {ran} ran, {skipped} skipped\n")
    for row in rows:
        print(row)

    if not ran:
        return

    all_exact = [v for vals in exact_by_light.values() for v in vals]
    all_w1    = [v for vals in w1_by_light.values()    for v in vals]
    print(f"\nOverall")
    print(f"  Exact match:   {sum(all_exact)}/{ran}  ({sum(all_exact)/ran:.0%})")
    print(f"  Within ±1 MST: {sum(all_w1)}/{ran}  ({sum(all_w1)/ran:.0%})")

    if len(exact_by_light) > 1:
        print("\nBy lighting")
        for light in sorted(exact_by_light):
            e  = exact_by_light[light]
            w1 = w1_by_light[light]
            print(f"  {light:<8}  exact={sum(e)}/{len(e)}  within-1={sum(w1)}/{len(w1)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--lighting", choices=["neutral", "warm", "low"], help="Only run samples with this lighting tag")
    parser.add_argument("--verbose",  action="store_true",                help="Show undertone in output")
    args = parser.parse_args()
    run(args.lighting, args.verbose)


if __name__ == "__main__":
    main()
