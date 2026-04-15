import asyncio
import base64
import json
import os
import time

import httpx
from ddgs import DDGS
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from api.claude_recommendations import get_full_beauty_recommendations
from detection.face_detection import extract_skin_pixels
from detection.monk_classifier import classify_monk
from detection.shade_matcher import match_shades

router = APIRouter()

REMOVEBG_API_KEY = os.environ.get("REMOVEBG_API_KEY")


# ── Background removal ────────────────────────────────────────────────────────

async def remove_background(image_url: str) -> str | None:
    """Remove background from image URL via remove.bg.
    Returns a data-URI base64 PNG with transparent background, or None."""
    if not REMOVEBG_API_KEY or not image_url:
        return None
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.remove.bg/v1.0/removebg",
                data={"image_url": image_url, "size": "auto"},
                headers={"X-Api-Key": REMOVEBG_API_KEY},
                timeout=30.0,
            )
            if response.status_code == 200:
                img_data = base64.b64encode(response.content).decode("utf-8")
                return f"data:image/png;base64,{img_data}"
            print(f"remove.bg returned {response.status_code}: {response.text[:200]}")
    except Exception as e:
        print(f"remove.bg error: {e}")
    return None


# ── Health ────────────────────────────────────────────────────────────────────

@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "project": "GlowMatch"}


# ── Analyze ───────────────────────────────────────────────────────────────────

@router.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    budget: str = Form(default="all"),
) -> dict:
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
        beauty_recs = get_full_beauty_recommendations(
            monk_scale=result["monk_scale"],
            undertone=result["undertone"],
            avg_hex=result["avg_hex"],
            budget=budget,
        )
    except Exception as e:
        print(f"Claude recommendations failed: {e}")
        beauty_recs = {}

    return {
        "pixel_count":    len(pixels),
        "monk_scale":     result["monk_scale"],
        "undertone":      result["undertone"],
        "avg_hex":        result["avg_hex"],
        "matched_shades": matched_shades,
        "recommendations": beauty_recs,
    }


# ── Product search ────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str


@router.post("/search-product")
async def search_product(req: SearchRequest) -> dict:
    query = req.query.strip()
    if not query:
        return {"results": []}

    try:
        raw_results: list[dict] = []

        time.sleep(1)
        with DDGS() as ddgs:
            images = list(ddgs.images(
                f"{query} lip product official",
                max_results=4,
                safesearch="moderate",
            ))

        for img in images:
            raw_results.append({
                "brand":    "",
                "name":     img.get("title", query),
                "shade":    "",
                "imageUrl": img.get("image", ""),
            })

        if not raw_results:
            return {"results": []}

        from api.claude_recommendations import client as claude_client

        parse_prompt = f"""Parse these beauty product search results.
Query: "{query}"
Results: {json.dumps(raw_results)}

Return ONLY a JSON array, no markdown:
[{{"brand": "...", "name": "...", "shade": "...", "imageUrl": "..."}}]
Extract brand separately. Keep imageUrl as-is. Max 4 results."""

        message = claude_client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": parse_prompt}],
        )
        text   = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text)

        # Remove backgrounds in parallel
        image_urls = [item.get("imageUrl", "") for item in parsed[:4]]
        cutouts = await asyncio.gather(*[remove_background(url) for url in image_urls])

        processed_results = [
            {**item, "imageUrl": item.get("imageUrl", ""), "cutoutUrl": cutout}
            for item, cutout in zip(parsed[:4], cutouts)
        ]
        return {"results": processed_results}

    except Exception as e:
        print(f"Search error: {e}")
        return {"results": []}
