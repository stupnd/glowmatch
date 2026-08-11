#!/usr/bin/env python3
"""
Add a labeled sample to the eval test set.

Usage:
    python eval/add_sample.py --image path/to/photo.jpg --mst 5 --lighting warm
    python eval/add_sample.py --image path/to/photo.jpg --mst 2 --lighting neutral --notes "side profile, avoid"
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

EVAL_DIR       = Path(__file__).resolve().parent
IMAGES_DIR     = EVAL_DIR / "images"
TEST_SET       = EVAL_DIR / "test_set.json"
VALID_LIGHTING = {"neutral", "warm", "low"}


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Add a labeled sample to backend/eval/test_set.json.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--image",    required=True,                              help="Path to the source image file")
    parser.add_argument("--mst",      required=True, type=int,                    help="True Monk Skin Tone level (1–10)")
    parser.add_argument("--lighting", required=True, choices=sorted(VALID_LIGHTING), help="Lighting condition")
    parser.add_argument("--notes",    default="",                                 help="Optional free-text note about this sample")
    # This dataset is photographs of people's faces labelled by skin tone. The
    # provenance of each one has to be recorded at the point of adding it,
    # because it cannot be reconstructed later.
    parser.add_argument("--source",   required=True,                              help="Where it came from, e.g. 'FairFace', 'self', 'colleague-consented'")
    parser.add_argument("--consent",  required=True, choices=["explicit", "dataset-license", "self"],
                        help="Basis for using this image")
    parser.add_argument("--coverage", action="store_true",                        help="Print level coverage after adding")
    args = parser.parse_args()

    src = Path(args.image)
    if not src.exists():
        sys.exit(f"Error: image not found: {src}")
    if not 1 <= args.mst <= 10:
        sys.exit(f"Error: --mst must be 1–10, got {args.mst}")

    IMAGES_DIR.mkdir(exist_ok=True)

    # Avoid silently clobbering an existing file
    dest = IMAGES_DIR / src.name
    if dest.exists():
        stem, suffix = src.stem, src.suffix
        n = 2
        while dest.exists():
            dest = IMAGES_DIR / f"{stem}_{n}{suffix}"
            n += 1
    shutil.copy2(src, dest)

    data = json.loads(TEST_SET.read_text()) if TEST_SET.exists() else {"samples": []}

    existing_ids = {s["id"] for s in data["samples"]}
    base_id = f"mst{args.mst:02d}_{args.lighting}"
    entry_id = base_id
    n = 2
    while entry_id in existing_ids:
        entry_id = f"{base_id}_{n}"
        n += 1

    entry: dict = {
        "id":         entry_id,
        "image_path": f"images/{dest.name}",
        "true_mst":   args.mst,
        "lighting":   args.lighting,
        "source":     args.source,
        "consent":    args.consent,
    }
    if args.notes:
        entry["notes"] = args.notes

    data["samples"].append(entry)
    TEST_SET.write_text(json.dumps(data, indent=2) + "\n")

    print(f"Added : {entry_id}")
    print(f"Image : {entry['image_path']}")
    print(f"Total : {len(data['samples'])} samples")

    if args.coverage:
        print()
        print_coverage(data["samples"])


# Per-level target. Below this the per-level accuracy has confidence intervals
# too wide to act on; docs/classifier-evaluation.md shows reliability varies
# more than 2x across the scale, so a pooled number is not a substitute.
TARGET_PER_LEVEL = 5


def print_coverage(samples: list[dict]) -> None:
    counts: dict[int, int] = {}
    for s in samples:
        counts[s["true_mst"]] = counts.get(s["true_mst"], 0) + 1

    print("Coverage (target %d per level)" % TARGET_PER_LEVEL)
    short = []
    for lvl in range(1, 11):
        n = counts.get(lvl, 0)
        bar = "#" * min(n, TARGET_PER_LEVEL) + "." * max(0, TARGET_PER_LEVEL - n)
        flag = "" if n >= TARGET_PER_LEVEL else f"  needs {TARGET_PER_LEVEL - n} more"
        if n < TARGET_PER_LEVEL:
            short.append(lvl)
        print(f"  MST {lvl:>2}  [{bar}] {n}{flag}")
    if short:
        print(f"\n  Still short at MST {short}.")


if __name__ == "__main__":
    main()
