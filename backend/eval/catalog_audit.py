#!/usr/bin/env python3
"""Audit the shade catalogue for coverage gaps.

Answers one question per skin tone: *if this person used Tinted, how good is
the best shade we could offer them?* Reported in CIEDE2000, where 2.3 is the
just-noticeable difference and 10 is "clearly a different colour".

This is a property of the catalogue, not of the matching code, and it is
measurable without any user data — the reference skin tones are the ten Monk
values the classifier already targets.

    python eval/catalog_audit.py
    python eval/catalog_audit.py --json audit.json
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from color_science import delta_e_2000, describe_delta_e, hex_to_lab  # noqa: E402
from detection.monk_classifier import _MONK_RGB  # noqa: E402
from detection.shade_matcher import load_shades  # noqa: E402

UNDERTONES = ("warm", "neutral", "cool")

# Above this, the best available shade is not a usable match.
USABLE_DELTA_E = 5.0


def audit() -> dict:
    shades = load_shades()

    by_undertone = Counter(s["undertone"] for s in shades)
    coverage = []

    for level, rgb in enumerate(_MONK_RGB, start=1):
        skin_hex = "#%02X%02X%02X" % rgb
        skin_lab = hex_to_lab(skin_hex)

        row = {"level": level, "skin_hex": skin_hex, "by_undertone": {}}
        for undertone in UNDERTONES:
            pool = [s for s in shades if s["undertone"] == undertone]
            if not pool:
                row["by_undertone"][undertone] = None
                continue
            best = min(
                (delta_e_2000(skin_lab, hex_to_lab(s["hex"])), s["shade_name"])
                for s in pool
            )
            row["by_undertone"][undertone] = {
                "delta_e": round(best[0], 2),
                "shade": best[1],
                "usable": best[0] <= USABLE_DELTA_E,
            }

        overall = min(
            (delta_e_2000(skin_lab, hex_to_lab(s["hex"])), s["shade_name"])
            for s in shades
        )
        row["best_any_undertone"] = {
            "delta_e": round(overall[0], 2),
            "shade": overall[1],
            "closeness": describe_delta_e(overall[0]),
        }
        coverage.append(row)

    return {
        "catalogue_size": len(shades),
        "by_undertone": dict(by_undertone),
        "usable_threshold": USABLE_DELTA_E,
        "coverage": coverage,
    }


def render(report: dict) -> str:
    lines: list[str] = []
    p = lines.append

    p(f"Catalogue: {report['catalogue_size']} shades")
    counts = report["by_undertone"]
    total = sum(counts.values())
    for undertone in UNDERTONES:
        n = counts.get(undertone, 0)
        p(f"  {undertone:<8} {n:>3}  ({n / total:.0%})")

    p("")
    p(f"Best available match per Monk level (CIEDE2000; usable <= {report['usable_threshold']})")
    p("")
    p("| MST | skin    | warm | neutral | cool | best | verdict |")
    p("|----:|:--------|-----:|--------:|-----:|-----:|:--------|")
    for row in report["coverage"]:
        cells = []
        for undertone in UNDERTONES:
            entry = row["by_undertone"][undertone]
            cells.append("—" if entry is None else f"{entry['delta_e']:.1f}")
        best = row["best_any_undertone"]
        p(
            f"| {row['level']} | {row['skin_hex']} | {cells[0]} | {cells[1]} | "
            f"{cells[2]} | {best['delta_e']:.1f} | {best['closeness']} |"
        )

    unusable = [
        r["level"] for r in report["coverage"]
        if r["best_any_undertone"]["delta_e"] > report["usable_threshold"]
    ]
    if unusable:
        p("")
        p(f"No usable match at MST {unusable} — the best shade in the catalogue is")
        p("still a visibly different colour. That is a data gap, not a matching bug.")

    thin = [u for u in UNDERTONES if counts.get(u, 0) < total * 0.2]
    if thin:
        p("")
        p(f"Thin undertone coverage: {', '.join(thin)}. Users with these undertones")
        p("fall back to a compromise shade at most depths.")

    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", type=Path)
    args = ap.parse_args()

    report = audit()
    print(render(report))
    if args.json:
        args.json.write_text(json.dumps(report, indent=2) + "\n")
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
