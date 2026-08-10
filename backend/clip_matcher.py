"""CLIP-powered foundation shade matching.

Loads ViT-B/32 once at import time (CPU) and pre-computes text embeddings
for every shade in data/shades.json so that per-request work is just a
matrix multiply.

Public API
----------
CLIP_AVAILABLE                                              bool
embed_skin_tone(hex, mst_level, undertone) -> np.ndarray   (512,) unit vector
embed_shade(shade)                         -> np.ndarray   (512,) unit vector
match_shades_clip(mst_level, undertone, hex, n=3) -> list[dict]
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np
import torch

logger = logging.getLogger(__name__)

_SHADES_PATH = Path(__file__).resolve().parent / "data" / "shades.json"
_DEVICE      = "cpu"

# ── Singleton model ───────────────────────────────────────────────────────────

_model = None

try:
    import clip as _clip_lib
    _model, _ = _clip_lib.load("ViT-B/32", device=_DEVICE)
    _model.eval()
    logger.info("CLIP ViT-B/32 loaded on CPU")
except Exception as _load_err:
    logger.warning("CLIP failed to load — shade matching will fall back: %s", _load_err)

CLIP_AVAILABLE: bool = _model is not None


# ── Text encoder ──────────────────────────────────────────────────────────────

def _encode(texts: list[str]) -> np.ndarray:
    """Encode a list of strings → L2-normalised (N, 512) float32 array."""
    import clip as _clip_lib  # already imported above; re-import is free
    tokens = _clip_lib.tokenize(texts, truncate=True).to(_DEVICE)
    with torch.no_grad():
        emb = _model.encode_text(tokens).float()
        emb = emb / emb.norm(dim=-1, keepdim=True)
    return emb.cpu().numpy()


def embed_skin_tone(hex_color: str, mst_level: int, undertone: str) -> np.ndarray:
    """Return a unit embedding for the user's detected skin tone."""
    text = (
        f"skin tone {hex_color} monk scale level {mst_level} {undertone} undertone"
    )
    return _encode([text])[0]


def embed_shade(shade: dict) -> np.ndarray:
    """Return a unit embedding for a single shade dict from shades.json."""
    text = (
        f"{shade['shade_name']} foundation shade "
        f"{shade['hex']} {shade['undertone']} undertone "
        f"{shade['description']}"
    )
    return _encode([text])[0]


# ── Pre-computed shade embedding cache ────────────────────────────────────────

_SHADE_NAMES: list[str]              = []
_SHADE_MATRIX: np.ndarray | None     = None   # shape (N, 512)
_SHADE_META:  dict[str, dict]        = {}     # shade_name → raw shade dict

if CLIP_AVAILABLE:
    try:
        with open(_SHADES_PATH, encoding="utf-8") as _f:
            _shades = json.load(_f)

        _texts = [
            f"{s['shade_name']} foundation shade "
            f"{s['hex']} {s['undertone']} undertone "
            f"{s['description']}"
            for s in _shades
        ]
        _embs = _encode(_texts)   # (N, 512)

        _SHADE_NAMES  = [s["shade_name"] for s in _shades]
        _SHADE_MATRIX = _embs
        _SHADE_META   = {s["shade_name"]: s for s in _shades}

        logger.info("Pre-computed CLIP embeddings for %d shades", len(_shades))
    except Exception as _cache_err:
        logger.warning("Failed to cache shade embeddings: %s", _cache_err)
        CLIP_AVAILABLE = False


# ── Public matcher ────────────────────────────────────────────────────────────

def match_shades_clip(
    mst_level: int,
    undertone: str,
    hex_color: str,
    n: int = 3,
) -> list[dict]:
    """Return top-*n* shades ranked by CLIP cosine similarity.

    Each dict contains: shade_name, hex, description, recommendation,
    match_score (float 0–1).

    Raises RuntimeError if CLIP is unavailable so the caller can fall back.
    """
    if not CLIP_AVAILABLE or _SHADE_MATRIX is None:
        raise RuntimeError("CLIP not available")

    query  = embed_skin_tone(hex_color, mst_level, undertone)   # (512,)
    scores = _SHADE_MATRIX @ query                               # (N,) cosine sim

    top_idx = np.argsort(scores)[::-1][:n]

    results = []
    for idx in top_idx:
        name  = _SHADE_NAMES[idx]
        shade = _SHADE_META[name]
        score = float(scores[idx])
        results.append({
            "shade_name":     name,
            "hex":            shade["hex"],
            "description":    shade["description"],
            "recommendation": (
                f"{name} is your closest CLIP match — "
                f"{shade['description'].rstrip('.')}."
            ),
            "match_score":    round(score, 4),
        })

    return results
