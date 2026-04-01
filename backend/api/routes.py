from fastapi import APIRouter, File, HTTPException, UploadFile

from detection.face_detection import extract_skin_pixels
from detection.monk_classifier import classify_monk

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "project": "GlowMatch"}


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    image_bytes = await file.read()
    pixels = extract_skin_pixels(image_bytes)

    if not pixels:
        raise HTTPException(status_code=422, detail="No face detected in the image.")

    result = classify_monk(pixels)

    return {
        "pixel_count": len(pixels),
        "monk_scale": result["monk_scale"],
        "undertone": result["undertone"],
        "avg_hex": result["avg_hex"],
    }
