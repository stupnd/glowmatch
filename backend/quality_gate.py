"""Pre-analysis image quality checks.

Runs before MediaPipe patch extraction so the user gets an actionable error
message (blur / lighting / angle) rather than a generic detection failure.

Public API
----------
check_blur(img_bgr)                  -> float
check_brightness(img_bgr)            -> dict
check_face_angle(landmarks)          -> dict
run_quality_gate(img_bgr, landmarks) -> dict
"""

from __future__ import annotations

import cv2
import numpy as np

# ── Thresholds ───────────────────────────────────────────────────────────────

_BLUR_MIN           = 80.0   # Laplacian variance; below = blurry
_OVEREXPOSED_V      = 220.0  # HSV V mean; above = blown out
_UNDEREXPOSED_V     = 40.0   # HSV V mean; below = too dark
_YAW_LIMIT          = 25.0   # degrees; horizontal head-turn limit
_PITCH_LIMIT        = 20.0   # degrees; vertical head-tilt limit

# MediaPipe Face Mesh 468-point topology indices used for angle estimation.
_LM_NOSE_TIP    = 4    # actual tip of the nose
_LM_EYE_L_OUTER = 263  # subject's left eye outer corner (right side of image)
_LM_EYE_R_OUTER = 33   # subject's right eye outer corner (left side of image)

# Empirical: in a neutral selfie the nose tip is ~0.75× the inter-ocular width
# below the midpoint of the two eye outer corners.
_NEUTRAL_NOSE_BELOW_EYES = 0.75
# Scale factor so that ±0.30 deviation from neutral ≈ ±20°.
_PITCH_SCALE = 67.0


# ── Individual checks ────────────────────────────────────────────────────────

def check_blur(img_bgr: np.ndarray) -> float:
    """Return the Laplacian variance of *img_bgr* as a sharpness score.

    A score below 80 indicates a blurry image.
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def check_brightness(img_bgr: np.ndarray) -> dict:
    """Return brightness statistics derived from the HSV V channel.

    Returns::

        {
            "mean_v":       float,  # mean V across the whole image [0–255]
            "std_v":        float,  # std of V (useful for diagnostics)
            "overexposed":  bool,   # mean_v > 220
            "underexposed": bool,   # mean_v < 40
        }
    """
    hsv   = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    v     = hsv[:, :, 2].astype(np.float32)
    mean_v = float(v.mean())
    std_v  = float(v.std())
    return {
        "mean_v":       mean_v,
        "std_v":        std_v,
        "overexposed":  mean_v > _OVEREXPOSED_V,
        "underexposed": mean_v < _UNDEREXPOSED_V,
    }


def check_face_angle(landmarks) -> dict:
    """Estimate yaw and pitch from three MediaPipe Face Mesh landmarks.

    Uses nose tip (#4), subject's left eye outer corner (#263), and subject's
    right eye outer corner (#33).  Angles are in degrees and use a linear
    approximation of the 2-D projection geometry.

    Returns::

        {
            "yaw":        float,  # positive = nose toward viewer's right
            "pitch":      float,  # positive = chin down, negative = chin up
            "acceptable": bool,   # abs(yaw) < 25 and abs(pitch) < 20
        }
    """
    nose  = landmarks[_LM_NOSE_TIP]
    eye_l = landmarks[_LM_EYE_L_OUTER]
    eye_r = landmarks[_LM_EYE_R_OUTER]

    face_width = abs(eye_l.x - eye_r.x)
    if face_width < 1e-6:
        return {"yaw": 0.0, "pitch": 0.0, "acceptable": True}

    eye_center_x = (eye_l.x + eye_r.x) / 2.0
    eye_center_y = (eye_l.y + eye_r.y) / 2.0

    # Yaw: lateral nose offset from inter-ocular midpoint, scaled to ±45°.
    # At ratio ±1.0 the nose is directly above an eye corner (≈ ±45°).
    yaw = ((nose.x - eye_center_x) / (face_width * 0.5)) * 45.0

    # Pitch: vertical nose position relative to the neutral forward-facing
    # ratio, scaled so ±0.30 deviation from neutral ≈ ±20°.
    nose_y_ratio = (nose.y - eye_center_y) / face_width
    pitch = (nose_y_ratio - _NEUTRAL_NOSE_BELOW_EYES) * _PITCH_SCALE

    acceptable = abs(yaw) < _YAW_LIMIT and abs(pitch) < _PITCH_LIMIT
    return {"yaw": float(yaw), "pitch": float(pitch), "acceptable": bool(acceptable)}


# ── Composite gate ───────────────────────────────────────────────────────────

def run_quality_gate(img_bgr: np.ndarray, landmarks) -> dict:
    """Run all three quality checks and return a combined result.

    Returns::

        {
            "passed":          bool,
            "blur_score":      float,
            "brightness":      dict,      # from check_brightness
            "angle":           dict,      # from check_face_angle
            "failure_reasons": list[str], # one message per failing check
        }

    ``passed`` is True only when every check passes.  ``failure_reasons``
    contains human-readable messages the frontend can display directly.
    """
    blur_score = check_blur(img_bgr)
    brightness = check_brightness(img_bgr)
    angle      = check_face_angle(landmarks)

    failure_reasons: list[str] = []

    if blur_score < _BLUR_MIN:
        failure_reasons.append(
            "Image is too blurry — try holding your phone steady."
        )
    if brightness["overexposed"]:
        failure_reasons.append(
            "Image is too bright — step away from direct light or turn off the flash."
        )
    if brightness["underexposed"]:
        failure_reasons.append(
            "Image is too dark — move to a better-lit area or turn on a light."
        )
    if abs(angle["yaw"]) >= _YAW_LIMIT:
        failure_reasons.append(
            "Face is angled too far to the side — look directly at the camera."
        )
    if abs(angle["pitch"]) >= _PITCH_LIMIT:
        failure_reasons.append(
            "Face is tilted too far up or down — keep your chin level with the camera."
        )

    return {
        "passed":          len(failure_reasons) == 0,
        "blur_score":      blur_score,
        "brightness":      brightness,
        "angle":           angle,
        "failure_reasons": failure_reasons,
    }
