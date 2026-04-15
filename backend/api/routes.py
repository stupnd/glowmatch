from fastapi import APIRouter, File, HTTPException, UploadFile

from api.claude_recommendations import get_shade_recommendations
from detection.face_detection import extract_skin_pixels
from detection.monk_classifier import classify_monk
from detection.shade_matcher import match_shades

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "project": "GlowMatch"}


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict:
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if not file.content_type or file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    image_bytes = await file.read()
    pixels = extract_skin_pixels(image_bytes)

    if not pixels:
        raise HTTPException(status_code=422, detail="No face detected in the image.")

    result = classify_monk(pixels, image_bytes)

    matched_shades = match_shades(result["monk_scale"], result["undertone"])

    try:
        recommendations = get_shade_recommendations(
            result["monk_scale"],
            result["undertone"],
            result["avg_hex"],
            matched_shades,
        )
        for shade, rec in zip(matched_shades, recommendations):
            shade["recommendation"] = rec
    except Exception:
        for shade in matched_shades:
            shade["recommendation"] = shade.get("description", "")

    return {
        "pixel_count": len(pixels),
        "monk_scale": result["monk_scale"],
        "undertone": result["undertone"],
        "avg_hex": result["avg_hex"],
        "matched_shades": matched_shades,
    }
