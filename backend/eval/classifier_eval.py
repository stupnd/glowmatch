#!/usr/bin/env python3
"""Stage-level evaluation of the MST classifier — no photographs required.

Why this exists separately from run_eval.py
-------------------------------------------
``run_eval.py`` measures the whole pipeline (photo -> MST) and therefore needs
labelled face photographs, which are consent-bound and slow to collect. But
``classify_mst`` does not take an image: it takes a LAB triplet. That stage can
be characterised *exhaustively and exactly* right now, and its failure modes are
a property of the reference values rather than of any dataset.

What it measures
----------------
1. **Round-trip.** Each reference value must classify as its own level. This is
   a sanity check; anything but 10/10 means the table and the metric disagree.

2. **Decision margin.** For each level, half the distance to the nearest other
   reference. This is the largest measurement error that cannot change the
   answer — a hard guarantee, not an estimate.

3. **Noise robustness.** Monte-Carlo isotropic LAB noise at increasing sigma,
   reporting accuracy per level. Models sensor noise and patch-sampling spread.

4. **Illuminant bias.** A systematic warm/cool shift along b*, which is what
   imperfect white balance actually does. Unlike noise this is *directional*,
   so it biases rather than blurs — the interesting failure.

Usage
-----
    python eval/classifier_eval.py                  # human-readable report
    python eval/classifier_eval.py --json out.json  # machine-readable
    python eval/classifier_eval.py --markdown       # for pasting into docs
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from detection.monk_classifier import (  # noqa: E402
    _MONK_RGB,
    _MST_REFERENCE_LAB,
    classify_mst,
)

LEVELS = list(range(1, 11))
RNG_SEED = 20260810


# ── 1. Round-trip ─────────────────────────────────────────────────────────────

def round_trip() -> dict:
    wrong = [
        {"level": lvl, "got": classify_mst(ref)}
        for lvl, ref in zip(LEVELS, _MST_REFERENCE_LAB)
        if classify_mst(ref) != lvl
    ]
    return {"passed": len(LEVELS) - len(wrong), "total": len(LEVELS), "failures": wrong}


# ── 2. Decision margin ────────────────────────────────────────────────────────

def _euclidean(a, b) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def margins() -> list[dict]:
    """Half the distance to the nearest other reference, per level.

    Any measurement error smaller than this cannot flip the classification, so
    it is a guaranteed-correct radius rather than a statistical one.
    """
    out = []
    for i, lvl in enumerate(LEVELS):
        others = [
            (_euclidean(_MST_REFERENCE_LAB[i], _MST_REFERENCE_LAB[j]), LEVELS[j])
            for j in range(len(LEVELS))
            if j != i
        ]
        nearest_dist, nearest_lvl = min(others)
        out.append(
            {
                "level": lvl,
                "hex": "#%02X%02X%02X" % _MONK_RGB[i],
                "nearest_level": nearest_lvl,
                "nearest_distance": round(nearest_dist, 2),
                "safe_radius": round(nearest_dist / 2, 2),
            }
        )
    return out


# ── 3. Noise robustness ───────────────────────────────────────────────────────

def noise_sweep(sigmas: list[float], trials: int = 4000) -> list[dict]:
    rng = np.random.default_rng(RNG_SEED)
    rows = []
    for sigma in sigmas:
        per_level = {}
        for i, lvl in enumerate(LEVELS):
            ref = np.array(_MST_REFERENCE_LAB[i])
            samples = ref + rng.normal(0, sigma, size=(trials, 3))
            correct = sum(1 for s in samples if classify_mst(tuple(s)) == lvl)
            per_level[lvl] = correct / trials
        rows.append(
            {
                "sigma": sigma,
                "overall": round(sum(per_level.values()) / len(per_level), 4),
                "per_level": {k: round(v, 4) for k, v in per_level.items()},
            }
        )
    return rows


# ── 4. Illuminant bias ────────────────────────────────────────────────────────

def illuminant_sweep(shifts: list[float]) -> list[dict]:
    """Systematic shift along b* (blue-yellow), i.e. residual white-balance error.

    Positive = warmer (yellower) light, negative = cooler (bluer).
    """
    rows = []
    for shift in shifts:
        per_level, flips = {}, {}
        for i, lvl in enumerate(LEVELS):
            L, a, b = _MST_REFERENCE_LAB[i]
            got = classify_mst((L, a, b + shift))
            per_level[lvl] = int(got == lvl)
            if got != lvl:
                flips[lvl] = got
        rows.append(
            {
                "b_shift": shift,
                "correct": sum(per_level.values()),
                "total": len(LEVELS),
                "flips": flips,
            }
        )
    return rows


# ── 5. Shot-noise-weighted robustness (a MODEL, not a measurement) ────────────

def shot_noise_sweep(base_sigma: float, trials: int = 4000) -> list[dict]:
    """Re-run the noise sweep with sigma scaled by expected photon shot noise.

    The uniform-sigma sweep above assumes every skin tone is measured with the
    same precision. Physically it is not: darker skin reflects less light, so
    fewer photons reach the sensor and the *relative* noise is larger. For
    shot-noise-limited capture the signal-to-noise ratio goes as sqrt(signal),
    so sigma scales as 1/sqrt(L).

    This is a first-order MODEL, not a measurement. It ignores sensor read
    noise, ISO gain, denoising, and the fact that phone cameras meter the whole
    frame rather than the face. It is here because the uniform-sigma result on
    its own invites a wrong conclusion — that the deep end of the scale is
    "safe" — when its wider decision margins are partly offset by a noisier
    measurement. Only run_eval.py on real photographs settles the question.
    """
    rng = np.random.default_rng(RNG_SEED + 1)
    l_values = [ref[0] for ref in _MST_REFERENCE_LAB]
    l_max = max(l_values)

    rows = []
    for i, lvl in enumerate(LEVELS):
        ref = np.array(_MST_REFERENCE_LAB[i])
        # Normalised so the lightest tone keeps base_sigma and darker tones get
        # proportionally more noise.
        scale = math.sqrt(l_max / max(ref[0], 1.0))
        sigma = base_sigma * scale
        samples = ref + rng.normal(0, sigma, size=(trials, 3))
        correct = sum(1 for s in samples if classify_mst(tuple(s)) == lvl)
        rows.append(
            {
                "level": lvl,
                "L": round(float(ref[0]), 1),
                "sigma_scale": round(scale, 2),
                "effective_sigma": round(sigma, 2),
                "accuracy": round(correct / trials, 4),
            }
        )
    return rows


# ── Report ────────────────────────────────────────────────────────────────────

SHOT_NOISE_BASE_SIGMA = 5.0


def build(args) -> dict:
    return {
        "round_trip": round_trip(),
        "margins": margins(),
        "noise": noise_sweep([1, 2, 3, 5, 8, 12, 16, 20]),
        "illuminant": illuminant_sweep([-16, -12, -8, -4, -2, 2, 4, 8, 12, 16]),
        "shot_noise": {
            "base_sigma": SHOT_NOISE_BASE_SIGMA,
            "is_model_not_measurement": True,
            "rows": shot_noise_sweep(SHOT_NOISE_BASE_SIGMA),
        },
        "meta": {
            "metric": "squared Euclidean in OpenCV uint8 LAB",
            "reference": "Monk et al. (2023) canonical sRGB values",
            "seed": RNG_SEED,
        },
    }


def render(report: dict, markdown: bool) -> str:
    b = "**" if markdown else ""
    lines: list[str] = []
    p = lines.append

    rt = report["round_trip"]
    p(f"{b}Round-trip{b}: {rt['passed']}/{rt['total']} references classify as themselves")
    if rt["failures"]:
        for f in rt["failures"]:
            p(f"  MST-{f['level']} -> MST-{f['got']}")
    p("")

    p(f"{b}Decision margins{b} — largest LAB error that cannot change the answer")
    p("")
    p("| MST | hex | nearest | distance | safe radius |")
    p("|----:|:----|--------:|---------:|------------:|")
    for m in report["margins"]:
        p(
            f"| {m['level']} | {m['hex']} | {m['nearest_level']} | "
            f"{m['nearest_distance']} | {m['safe_radius']} |"
        )
    p("")

    p(f"{b}Noise robustness{b} — accuracy under isotropic LAB noise")
    p("")
    header = "| sigma | overall | " + " | ".join(f"L{l}" for l in LEVELS) + " |"
    p(header)
    p("|" + "---:|" * (len(LEVELS) + 2))
    for row in report["noise"]:
        cells = " | ".join(f"{row['per_level'][l]:.2f}" for l in LEVELS)
        p(f"| {row['sigma']} | {row['overall']:.3f} | {cells} |")
    p("")

    p(f"{b}Illuminant bias{b} — systematic b* shift (warm +, cool −)")
    p("")
    p("| b* shift | correct | levels that flip |")
    p("|---------:|--------:|:-----------------|")
    for row in report["illuminant"]:
        flips = (
            ", ".join(f"{k}→{v}" for k, v in row["flips"].items())
            if row["flips"]
            else "—"
        )
        p(f"| {row['b_shift']:+} | {row['correct']}/{row['total']} | {flips} |")
    p("")

    sn = report["shot_noise"]
    p(f"{b}Shot-noise-weighted accuracy{b} — MODEL, not a measurement")
    p(f"(base sigma {sn['base_sigma']}, scaled by sqrt(L_max / L) per level)")
    p("")
    p("| MST | L | sigma x | effective sigma | accuracy |")
    p("|----:|--:|--------:|----------------:|---------:|")
    for r in sn["rows"]:
        p(
            f"| {r['level']} | {r['L']} | {r['sigma_scale']} | "
            f"{r['effective_sigma']} | {r['accuracy']:.2f} |"
        )
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", type=Path, help="write the raw report here")
    ap.add_argument("--markdown", action="store_true", help="markdown emphasis")
    args = ap.parse_args()

    report = build(args)
    print(render(report, args.markdown))

    if args.json:
        args.json.write_text(json.dumps(report, indent=2) + "\n")
        print(f"\nwrote {args.json}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
