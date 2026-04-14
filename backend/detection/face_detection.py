"""Skin pixel extraction using MediaPipe Face Mesh."""

import cv2
import mediapipe as mp
import numpy as np

# Landmark indices for cheeks and forehead.
# These are stable across faces and sit on flat skin patches with
# minimal hair, shadow, or makeup interference.
_CHEEK_LEFT = [234, 227, 116, 123, 147, 187]
_CHEEK_RIGHT = [454, 447, 345, 352, 376, 411]
_FOREHEAD = [10, 67, 69, 104, 108, 151, 337, 338, 297]

_SKIN_LANDMARKS: list[int] = _CHEEK_LEFT + _CHEEK_RIGHT + _FOREHEAD

# Sample a small patch around each landmark to get stable colour readings.
_PATCH_RADIUS = 3


def extract_face_crop(image_bytes: bytes, pad: float = 0.15) -> "np.ndarray | None":
    """Return the face bounding region as an (H, W, 3) RGB uint8 array.

    The crop is expanded by *pad* × face-width/height on each side so the
    model sees a little context beyond the tight mesh box.  Returns None when
    no face is detected or the image cannot be decoded.
    """
    image_bgr = _decode(image_bytes)
    if image_bgr is None:
        return None

    h, w = image_bgr.shape[:2]
    landmarks = _detect_landmarks(image_bgr)
    if landmarks is None:
        return None

    xs = [int(lm.x * w) for lm in landmarks]
    ys = [int(lm.y * h) for lm in landmarks]
    x0, x1 = min(xs), max(xs)
    y0, y1 = min(ys), max(ys)

    pad_x = int((x1 - x0) * pad)
    pad_y = int((y1 - y0) * pad)
    x0 = max(0, x0 - pad_x)
    x1 = min(w, x1 + pad_x)
    y0 = max(0, y0 - pad_y)
    y1 = min(h, y1 + pad_y)

    crop = image_bgr[y0:y1, x0:x1]
    return cv2.cvtColor(crop, cv2.COLOR_BGR2RGB) if crop.size > 0 else None


def extract_skin_pixels(image_bytes: bytes) -> list[tuple[int, int, int]]:
    """Decode *image_bytes*, run MediaPipe Face Mesh, and return RGB tuples
    sampled from cheek and forehead landmarks.

    Returns an empty list when no face is detected or the image cannot be
    decoded.
    """
    image_bgr = _decode(image_bytes)
    if image_bgr is None:
        return []

    h, w = image_bgr.shape[:2]
    landmarks = _detect_landmarks(image_bgr)
    if landmarks is None:
        return []

    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    pixels: list[tuple[int, int, int]] = []

    for idx in _SKIN_LANDMARKS:
        lm = landmarks[idx]
        cx = int(lm.x * w)
        cy = int(lm.y * h)

        x0 = max(cx - _PATCH_RADIUS, 0)
        x1 = min(cx + _PATCH_RADIUS + 1, w)
        y0 = max(cy - _PATCH_RADIUS, 0)
        y1 = min(cy + _PATCH_RADIUS + 1, h)

        patch = image_rgb[y0:y1, x0:x1]
        if patch.size == 0:
            continue

        mean = patch.reshape(-1, 3).mean(axis=0).astype(int)
        pixels.append((int(mean[0]), int(mean[1]), int(mean[2])))

    return pixels


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _decode(image_bytes: bytes) -> np.ndarray | None:
    arr = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return image if image is not None else None


def _detect_landmarks(image_bgr: np.ndarray):
    """Run Face Mesh on a single image and return the first face's landmark
    list, or None when no face is found."""
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

    with mp.solutions.face_mesh.FaceMesh(
        static_image_mode=True,
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=0.5,
    ) as face_mesh:
        results = face_mesh.process(image_rgb)

    if not results.multi_face_landmarks:
        return None

    return results.multi_face_landmarks[0].landmark
