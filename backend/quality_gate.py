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

import os

import cv2
import numpy as np

# ── Thresholds ───────────────────────────────────────────────────────────────

# Laplacian variance; below = blurry. This number is not universal — it scales
# with resolution and image content, so a downscaled webcam frame scores far
# lower than a full-size phone photo of the same scene. Tune per input path with
# BLUR_MIN rather than editing here.
_BLUR_MIN           = float(os.environ.get("BLUR_MIN", 60.0))
_OVEREXPOSED_V      = 220.0  # HSV V mean; above = blown out
_UNDEREXPOSED_V     = 40.0   # HSV V mean; below = too dark
_YAW_LIMIT          = 25.0   # degrees; horizontal head-turn limit
_PITCH_LIMIT        = 20.0   # degrees; vertical head-tilt limit

# MediaPipe Face Mesh 468-point topology indices used for angle estimation.
_LM_NOSE_TIP    = 4    # actual tip of the nose
_LM_EYE_L_OUTER = 263  # subject's left eye outer corner (right side of image)
_LM_EYE_R_OUTER = 33   # subject's right eye outer corner (left side of image)

# In a level-headed selfie the nose tip sits this fraction of the outer-canthal
# width below the eye line.
#
# 0.75 was the original value and is too high: with correct (aspect-corrected)
# geometry a level face measures ~0.42, which the old constant scored as -22
# degrees of chin-up tilt — enough to fail the +/-20 gate on its own. Standard
# face anthropometry puts outer-canthus separation near 90mm and the eye-line to
# nose-tip drop near 40-45mm, i.e. a ratio of roughly 0.45, which agrees.
#
# PROVISIONAL: this is one measurement plus a textbook estimate, not a
# calibration. Face geometry varies between people, so measure nose_y_ratio
# across the eval set (it is logged on every request) and set NEUTRAL_NOSE_RATIO
# to the median before trusting this gate on real users.
_NEUTRAL_NOSE_BELOW_EYES = float(os.environ.get("NEUTRAL_NOSE_RATIO", 0.45))
# Scale factor so that ±0.30 deviation from neutral ≈ ±20°.
_PITCH_SCALE = 67.0


# ── Individual checks ────────────────────────────────────────────────────────

def check_blur(img_bgr: np.ndarray) -> float:
    """Return the Laplacian variance of *img_bgr* as a sharpness score.

    Scores below ``_BLUR_MIN`` (60 by default) are treated as blurry.
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


def check_face_angle(landmarks, image_shape=None) -> dict:
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

    # MediaPipe normalises x by image WIDTH and y by image HEIGHT, so a
    # normalised y-distance and a normalised x-distance are only comparable on a
    # square image. Scale back into pixels first — otherwise the pitch ratio is
    # multiplied by the aspect ratio (~0.56 on a 9:16 phone photo) and every
    # portrait selfie reads as a severe chin-up tilt.
    if image_shape is not None:
        img_h, img_w = image_shape[0], image_shape[1]
    else:
        img_h = img_w = 1.0

    nose_x, nose_y = nose.x * img_w, nose.y * img_h
    eye_l_x, eye_l_y = eye_l.x * img_w, eye_l.y * img_h
    eye_r_x, eye_r_y = eye_r.x * img_w, eye_r.y * img_h

    face_width = abs(eye_l_x - eye_r_x)
    if face_width < 1e-6:
        return {"yaw": 0.0, "pitch": 0.0, "nose_y_ratio": 0.0, "acceptable": True}

    eye_center_x = (eye_l_x + eye_r_x) / 2.0
    eye_center_y = (eye_l_y + eye_r_y) / 2.0

    # Yaw: lateral nose offset from inter-ocular midpoint, scaled to ±45°.
    # At ratio ±1.0 the nose is directly above an eye corner (≈ ±45°).
    yaw = ((nose_x - eye_center_x) / (face_width * 0.5)) * 45.0

    # Pitch: vertical nose position relative to the neutral forward-facing
    # ratio, scaled so ±0.30 deviation from neutral ≈ ±20°.
    nose_y_ratio = (nose_y - eye_center_y) / face_width
    pitch = (nose_y_ratio - _NEUTRAL_NOSE_BELOW_EYES) * _PITCH_SCALE

    acceptable = abs(yaw) < _YAW_LIMIT and abs(pitch) < _PITCH_LIMIT
    return {
        "yaw":          float(yaw),
        "pitch":        float(pitch),
        "nose_y_ratio": float(nose_y_ratio),  # raw measurement, for calibration
        "acceptable":   bool(acceptable),
    }


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
    angle      = check_face_angle(landmarks, img_bgr.shape)

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


def describe(gate: dict) -> str:
    """One-line summary of measured values vs. thresholds, for logging.

    The gate returns numbers but the API only surfaces the messages, which makes
    a rejection impossible to debug — you can't tell a marginal miss from a wild
    one. Log this alongside any failure.
    """
    angle = gate.get("angle", {})
    bright = gate.get("brightness", {})
    # ASCII only: this string is also sent as an HTTP header, and headers are
    # latin-1 encoded. A stray en dash here raises UnicodeEncodeError and turns
    # the 422 into a 500.
    return (
        f"blur={gate.get('blur_score', 0):.1f} (min {_BLUR_MIN}) "
        f"yaw={angle.get('yaw', 0):+.1f} (limit +/-{_YAW_LIMIT}) "
        f"pitch={angle.get('pitch', 0):+.1f} (limit +/-{_PITCH_LIMIT}) "
        f"nose_y_ratio={angle.get('nose_y_ratio', 0):.3f} "
        f"(neutral {_NEUTRAL_NOSE_BELOW_EYES}) "
        f"mean_v={bright.get('mean_v', float('nan')):.1f} "
        f"(ok {_UNDEREXPOSED_V}-{_OVEREXPOSED_V})"
    )
