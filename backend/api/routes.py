from fastapi import APIRouter, File, UploadFile

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "project": "GlowMatch"}


@router.post("/analyze")
async def analyze(file: UploadFile = File(...)) -> dict[str, str]:
    return {"message": "analysis coming soon"}
