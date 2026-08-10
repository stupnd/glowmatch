# Tinted Eval

Labeled test set and tooling for measuring MST classification accuracy across lighting conditions.

---

## Lighting condition definitions

| Tag | Meaning |
|-----|---------|
| `neutral` | Overcast sky or indirect window light — diffuse, no strong color cast |
| `warm` | Ring light or indoor incandescent/bulb — warm orange-yellow cast |
| `low` | Dim or underexposed — face visible but under-lit |

---

## Adding a new sample

```bash
# from the backend/ directory
python eval/add_sample.py \
  --image  path/to/photo.jpg \
  --mst    5 \
  --lighting warm \
  --notes  "optional free-text description"
```

The script:
1. Copies the image into `eval/images/` (appending `_2`, `_3`, … if the name collides).
2. Appends a new entry to `eval/test_set.json` with a unique ID.
3. Prints the entry ID and the new total count.

**Guidelines for good samples**
- Use face-forward photos with the full face visible.
- Avoid heavy filters, extreme crops, or drawn-on skin.
- Verify the `true_mst` against the [Monk Scale reference](https://skintone.google/) before adding.
- Include samples across all three lighting tags and across the full MST-1–10 range.

---

## Replacing placeholder images

The five entries in `test_set.json` ship with solid-color placeholder PNGs
(named `.jpg`) that satisfy the path-existence smoke test but contain no face
data. They will always be skipped during a real eval run ("no face detected").

To replace a placeholder:

```bash
python eval/add_sample.py --image real_mst5_photo.jpg --mst 5 --lighting neutral
```

Then delete the old placeholder entry from `test_set.json` by hand (or just
leave it; it will be skipped at runtime).

---

## Running the eval

```bash
# from the backend/ directory
python eval/run_eval.py

# filter to a single lighting condition
python eval/run_eval.py --lighting warm

# show undertone alongside predictions
python eval/run_eval.py --verbose
```

Output legend:
- `✓` — exact match (pred == true_mst)
- `~` — within ±1 MST
- `✗` — off by 2 or more
- `?` — skipped (image missing or no face detected)
- `!` — pipeline error

---

## Smoke tests

```bash
# from the backend/ directory
pytest tests/test_eval.py -v
```

The smoke tests verify structural correctness of `test_set.json` (valid JSON,
required keys, MST range 1–10, valid lighting tags, unique IDs, all referenced
image files present on disk). They do **not** run the ML pipeline.

---

## test_set.json schema

```jsonc
{
  "samples": [
    {
      "id":         "mst05_neutral",          // unique string key
      "image_path": "images/photo.jpg",       // relative to eval/
      "true_mst":   5,                        // integer 1–10
      "lighting":   "neutral",                // "neutral" | "warm" | "low"
      "notes":      "optional free-text"      // optional
    }
  ]
}
```
