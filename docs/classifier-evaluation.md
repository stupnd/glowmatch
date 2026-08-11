# Where the MST classifier is fragile

Reproduce with:

```bash
cd backend && python eval/classifier_eval.py
```

This characterises the **classification stage only** — the function that maps a
measured LAB value to a Monk Skin Tone level. It requires no photographs,
because that stage takes a colour, not an image. End-to-end accuracy from a
photograph is a separate and currently unanswered question; see
[Limits](#limits).

## Method

Production classifies by nearest neighbour against the ten canonical Monk
reference values, under squared Euclidean distance in OpenCV uint8 LAB space.
Since the reference table is fixed and small, the stage can be characterised
exactly rather than sampled:

- **Round-trip** — every reference must classify as itself. 10/10. This only
  confirms the table and the metric agree.
- **Decision margin** — half the distance to the nearest other reference. Any
  measurement error smaller than this *cannot* change the answer. A guarantee,
  not a statistic.
- **Noise robustness** — Monte-Carlo isotropic LAB noise, 4000 trials per level.
- **Illuminant bias** — systematic shift along b\*, which is what residual
  white-balance error actually does. Directional, so it biases rather than blurs.

## Result 1 — the reference values are not evenly spaced

| MST | hex | nearest | distance | safe radius |
|----:|:----|--------:|---------:|------------:|
| 1 | #F6EDE4 | 2 | 5.48 | **2.74** |
| 2 | #F3E7DB | 1 | 5.48 | **2.74** |
| 3 | #F7EAD0 | 2 | 7.87 | **3.94** |
| 4 | #EADABA | 3 | 15.52 | 7.76 |
| 5 | #D7BD96 | 4 | 24.70 | 12.35 |
| 6 | #A07850 | 7 | 29.14 | 14.57 |
| 7 | #825C43 | 6 | 29.14 | 14.57 |
| 8 | #604134 | 9 | 26.93 | 13.46 |
| 9 | #3A312A | 10 | 17.12 | 8.56 |
| 10 | #292420 | 9 | 17.12 | 8.56 |

MST 1 and 2 sit 5.48 apart in a space where L alone spans 0–255. Their safe
radius is **2.74** — smaller than the quantisation of the colour space in
places. MST 6 and 7 get **14.57**, more than five times the headroom.

This is a property of the Monk scale's sampling, not of our code: the scale
allocates four of its ten points to pale tones that differ subtly, and takes a
large jump from MST 5 to 6.

## Result 2 — under uniform noise, the *light* end fails first

Accuracy by level, isotropic LAB noise:

| sigma | overall | L1 | L2 | L3 | L4 | L5 | L6 | L7 | L8 | L9 | L10 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 | 0.978 | 0.92 | 0.89 | 0.97 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| 3 | 0.940 | 0.80 | 0.73 | 0.88 | 0.99 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| 5 | 0.869 | 0.64 | **0.53** | 0.70 | 0.92 | 0.99 | 1.00 | 1.00 | 1.00 | 0.95 | 0.96 |
| 8 | 0.757 | 0.54 | **0.36** | 0.51 | 0.73 | 0.94 | 0.96 | 0.94 | 0.93 | 0.81 | 0.85 |
| 12 | 0.635 | 0.46 | **0.27** | 0.40 | 0.53 | 0.86 | 0.88 | 0.79 | 0.77 | 0.63 | 0.77 |

At sigma 5 — a plausible spread for skin-patch sampling — MST-2 is a **coin
flip**, while MST 6, 7 and 8 are still perfect.

This inverts the assumption you would bring to a skin-tone classifier. The
geometric weakness of this method is at the pale end.

## Result 3 — warm and cool light break different levels

| b\* shift | correct | levels that flip |
|---------:|--------:|:-----------------|
| −16 | 7/10 | 2→1, 3→1, 4→2 |
| −8 | 8/10 | 2→1, 3→1 |
| −4 … +4 | 10/10 | — |
| +8 | 8/10 | 1→3, 2→3 |
| +16 | 8/10 | 1→3, 2→3 |

Only MST 1–4 are affected at any tested shift. Cool light pushes pale tones
*down* the scale, warm light pushes them *up* — and every flip is confined to
the crowded region. The gate's ±tolerance for white balance therefore matters
almost exclusively for pale users.

## Result 4 — but the deep end is measured less precisely (model)

> **This section is a model, not a measurement.** It is included because
> Result 2 on its own invites a wrong conclusion.

Results 2 and 3 assume every tone is measured with equal precision. Physically
it is not: darker skin reflects fewer photons, so for shot-noise-limited
capture the noise scales as 1/sqrt(L). Re-running with sigma scaled that way,
from a base of 5.0 at the lightest tone:

| MST | L | sigma x | effective sigma | accuracy |
|----:|--:|--------:|----------------:|---------:|
| 1 | 240 | 1.00 | 5.00 | 0.65 |
| 2 | 235 | 1.01 | 5.05 | **0.52** |
| 3 | 238 | 1.00 | 5.02 | 0.69 |
| 4 | 223 | 1.04 | 5.19 | 0.91 |
| 5 | 199 | 1.10 | 5.49 | 0.99 |
| 6 | 136 | 1.33 | 6.64 | 0.99 |
| 7 | 108 | 1.49 | 7.45 | 0.96 |
| 8 | 78 | 1.75 | 8.77 | 0.89 |
| 9 | 54 | 2.11 | 10.54 | **0.69** |
| 10 | 37 | 2.55 | 12.73 | 0.75 |

**Both ends are fragile, for opposite reasons.** The light end has crowded
reference values; the deep end has adequate spacing but a noisier measurement
(sigma 2.1–2.6× higher). The middle wins on both counts.

The model ignores read noise, ISO gain, denoising, and the fact that phone
cameras meter the whole frame rather than the face — all of which plausibly
make the deep end worse still.

## What this changes

1. **Confidence should be level-dependent.** Reporting one accuracy number
   across the scale hides a 2× difference in reliability. The UI already lets
   users override the detected level — that override matters most at MST 1–3
   and 9–10.
2. **The quality gate's white-balance tolerance is mostly a pale-skin
   protection.** Worth stating, since it is currently uniform.
3. **Nearest neighbour on ten points may be the wrong method at the light
   end.** Interpolating a continuous position on the scale, or fitting a
   classifier with real training data, would not have a 2.74 safe radius.
4. **It gives the trained model a job.** `ml/monk_classifier.pt` currently sits
   unused; "beat nearest neighbour at MST 1–3" is a concrete target.

## Limits

- **This is one stage.** Nothing here says how accurately the pipeline recovers
  LAB from a photograph, which is where face detection, patch sampling and
  white balance all contribute error — and where real-world bias most plausibly
  lives.
- **Result 4 is a model.** Only labelled photographs settle it. See
  `backend/eval/README.md` for the collection workflow; the harness is built
  and waiting on data.
- **Isotropic noise is a simplification.** Real sampling error is correlated
  across L, a and b, and skewed by shadow and specular highlight.
