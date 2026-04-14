"""Monk Skin Tone Scale classification and undertone detection.

Classification strategy
-----------------------
When a trained model is available at ml/monk_classifier.pt:

  1. MobileNetV3-Small (3-class coarse model) classifies the face crop into
     White / Brown / Black regardless of lighting conditions.
  2. That coarse class constrains the MST search to a sub-range:
       White → MST-1 .. MST-3
       Brown → MST-4 .. MST-7
       Black → MST-8 .. MST-10
  3. Within the constrained range the existing LAB-distance rule selects the
     exact MST level from the average skin-pixel colour.

This prevents warm studio lighting from pushing a fair-skinned person's
average colour into the MST-6 neighbourhood (Brown), because the model
correctly identifies the face as White first.

Undertone detection always uses the LAB approach (unchanged).

When the model file is absent, the original full-range LAB-distance
classifier is used as a fallback so the API continues to work without
requiring PyTorch.
"""

from __future__ import annotations

import cv2
import numpy as np
from pathlib import Path

# ---------------------------------------------------------------------------
# Official Monk Skin Tone Scale hex values
# ---------------------------------------------------------------------------

_MONK_SCALE_RGB: list[tuple[str, tuple[int, int, int]]] = [
    ("MST-1",  (0xF6, 0xED, 0xE4)),
    ("MST-2",  (0xF3, 0xE7, 0xDB)),
    ("MST-3",  (0xF7, 0xEA, 0xD0)),
    ("MST-4",  (0xEA, 0xDA, 0xBA)),
    ("MST-5",  (0xD7, 0xBD, 0x96)),
    ("MST-6",  (0xA0, 0x78, 0x50)),
    ("MST-7",  (0x82, 0x5C, 0x43)),
    ("MST-8",  (0x60, 0x41, 0x34)),
    ("MST-9",  (0x3A, 0x31, 0x2A)),
    ("MST-10", (0x29, 0x24, 0x20)),
]

# Coarse class index → allowed MST labels (mirrors ml/train.py COARSE_CLASSES order)
_MST_RANGES: dict[int, list[str]] = {
    0: ["MST-1", "MST-2", "MST-3"],
    1: ["MST-4", "MST-5", "MST-6", "MST-7"],
    2: ["MST-8", "MST-9", "MST-10"],
}

# ---------------------------------------------------------------------------
# Optional PyTorch inference
# ---------------------------------------------------------------------------

_MODEL_PATH = Path(__file__).resolve().parent.parent / "ml" / "monk_classifier.pt"

_model = None          # TorchScript model or None
_preprocess = None     # torchvision transform pipeline or None

try:
    import torch
    import torchvision.transforms as _T

    _preprocess = _T.Compose([
        _T.ToPILImage(),
        _T.Resize((224, 224)),
        _T.ToTensor(),
        _T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])

    if _MODEL_PATH.exists():
        _model = torch.jit.load(str(_MODEL_PATH), map_location="cpu")
        _model.eval()
        print(f"[monk_classifier] Loaded ML model from {_MODEL_PATH}")
    else:
        print(f"[monk_classifier] Model not found at {_MODEL_PATH} — using LAB fallback")

except ImportError:
    print("[monk_classifier] torch not installed — using LAB fallback")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_monk(
    pixels: list[tuple[int, int, int]],
    image_bytes: bytes | None = None,
) -> dict:
    """Classify skin-tone pixels into a Monk Skin Tone value and undertone.

    Args:
        pixels:      RGB tuples sampled from facial skin landmarks.
        image_bytes: Raw image bytes used to extract the face crop for the
                     ML model.  When None or when the model is unavailable,
                     the full-range LAB-distance classifier is used.

    Returns:
        {
            "monk_scale": "MST-2",
            "undertone":  "cool",
            "avg_rgb":    [R, G, B],
            "avg_hex":    "#f3e7db",
        }
        Returns an empty dict when *pixels* is empty.
    """
    if not pixels:
        return {}

    avg_rgb = _average_rgb(pixels)
    avg_lab = _rgb_to_lab_triple(*avg_rgb)
    undertone = _detect_undertone(avg_lab)
    avg_hex = "#{:02x}{:02x}{:02x}".format(*avg_rgb)

    monk_label = _classify_monk_scale(avg_lab, image_bytes)

    return {
        "monk_scale": monk_label,
        "undertone":  undertone,
        "avg_rgb":    list(avg_rgb),
        "avg_hex":    avg_hex,
    }


# ---------------------------------------------------------------------------
# MST classification
# ---------------------------------------------------------------------------

def _classify_monk_scale(
    avg_lab: tuple[float, float, float],
    image_bytes: bytes | None,
) -> str:
    """Return the MST label, using the ML model when available."""
    if _model is not None and image_bytes is not None:
        coarse = _run_model(image_bytes)
        if coarse is not None:
            allowed = _MST_RANGES.get(coarse, list(_MONK_SCALE_LAB_MAP.keys()))
            return _nearest_monk_in(avg_lab, allowed)

    return _nearest_monk(avg_lab)


def _run_model(image_bytes: bytes) -> int | None:
    """Run the TorchScript model and return the coarse class index (0/1/2).

    Returns None on any error so the caller can fall back to LAB distance.
    """
    try:
        from detection.face_detection import extract_face_crop  # avoid circular at module level
        import torch

        crop_rgb = extract_face_crop(image_bytes)
        if crop_rgb is None:
            return None

        tensor = _preprocess(crop_rgb).unsqueeze(0)  # (1, 3, 224, 224)
        with torch.no_grad():
            logits = _model(tensor)
        return int(logits.argmax(dim=1).item())
    except Exception as exc:
        print(f"[monk_classifier] ML inference failed: {exc} — falling back to LAB")
        return None


# ---------------------------------------------------------------------------
# LAB helpers
# ---------------------------------------------------------------------------

def _rgb_to_lab_triple(r: int, g: int, b: int) -> tuple[float, float, float]:
    pixel = np.array([[[b, g, r]]], dtype=np.uint8)
    lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB)
    L, a, b_val = lab[0, 0]
    return (float(L), float(a), float(b_val))


def _average_rgb(pixels: list[tuple[int, int, int]]) -> tuple[int, int, int]:
    n = len(pixels)
    r = round(sum(p[0] for p in pixels) / n)
    g = round(sum(p[1] for p in pixels) / n)
    b = round(sum(p[2] for p in pixels) / n)
    return (r, g, b)


def _lab_sq_dist(
    a: tuple[float, float, float],
    b: tuple[float, float, float],
) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2


def _nearest_monk(lab: tuple[float, float, float]) -> str:
    return min(_MONK_SCALE_LAB, key=lambda e: _lab_sq_dist(lab, e[1]))[0]


def _nearest_monk_in(lab: tuple[float, float, float], allowed: list[str]) -> str:
    allowed_set = set(allowed)
    subset = [(label, lab_val) for label, lab_val in _MONK_SCALE_LAB
              if label in allowed_set]
    return min(subset, key=lambda e: _lab_sq_dist(lab, e[1]))[0]


def _detect_undertone(lab: tuple[float, float, float]) -> str:
    _L, a, b = lab
    a_shift = a - 128.0
    b_shift = b - 128.0
    _THRESHOLD = 6.0
    if b_shift - a_shift > _THRESHOLD:
        return "warm"
    if a_shift - b_shift > _THRESHOLD:
        return "cool"
    return "neutral"


# ---------------------------------------------------------------------------
# Deferred initialisation
# ---------------------------------------------------------------------------

_MONK_SCALE_LAB: list[tuple[str, tuple[float, float, float]]] = [
    (label, _rgb_to_lab_triple(r, g, b))
    for label, (r, g, b) in _MONK_SCALE_RGB
]

_MONK_SCALE_LAB_MAP: dict[str, tuple[float, float, float]] = dict(_MONK_SCALE_LAB)
