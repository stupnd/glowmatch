from fastapi import APIRouter, File, HTTPException, UploadFile

from detection.face_detection import extract_skin_pixels

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

    return {
        "pixel_count": len(pixels),
        "sample_pixels": pixels[:5],
    }
