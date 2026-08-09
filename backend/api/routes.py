import asyncio
import base64
import json
import os
import queue as thread_queue
import threading

import httpx
from ddgs import DDGS
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from api.claude_recommendations import get_full_beauty_recommendations
from api.limits import (
    ANALYZE_RULES,
    SEARCH_RULES,
    client_key,
    limiter,
    spend_guard,
)
from api.uploads import read_image_upload
from color_utils import preprocess_image
from detection.face_detection import (
    detect_face,
    extract_patches_streaming,
    extract_skin_sample_from_image,
    run_landmark_detection,
)
from detection.monk_classifier import classify_monk, classify_mst_with_distances
from detection.shade_matcher import match_shades
from foundation_matcher import match_foundation
from quality_gate import describe as describe_gate, run_quality_gate

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
    request: Request,
    file: UploadFile = File(...),
    budget: str = Form(default="all"),
) -> dict:
    limiter.check(client_key(request), "analyze", ANALYZE_RULES)
    spend_guard.check()

    image_bytes = await read_image_upload(file)

    # ── Preprocess + landmark detection ──────────────────────────────────────
    try:
        img_bgr, landmarks = await asyncio.to_thread(detect_face, image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    if landmarks is None:
        raise HTTPException(
            status_code=422,
            detail=["No face detected — try a well-lit, front-facing photo with your full face visible."],
        )

    # ── Pre-analysis quality gate ─────────────────────────────────────────────
    gate = run_quality_gate(img_bgr, landmarks)
    if not gate["passed"]:
        # Also surfaced as a response header so the measured values are visible
        # in the browser's network tab, not just the server terminal. The body
        # shape is unchanged — the frontend still gets a plain list of strings.
        print(f"[quality-gate] REJECTED  {describe_gate(gate)}")
        raise HTTPException(
            status_code=422,
            detail=gate["failure_reasons"],
            headers={"X-Quality-Gate": describe_gate(gate)},
        )
    print(f"[quality-gate] passed    {describe_gate(gate)}")

    # ── Skin pixel extraction ─────────────────────────────────────────────────
    try:
        sample = await asyncio.to_thread(extract_skin_sample_from_image, img_bgr, landmarks)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    result = classify_monk(sample, image_bytes)
    mst_level = int(result["monk_scale"].split("-")[1])
    matched_shades = await asyncio.to_thread(
        match_shades, mst_level, result["undertone"], result["avg_hex"]
    )

    try:
        beauty_recs = await asyncio.to_thread(
            get_full_beauty_recommendations,
            monk_scale=result["monk_scale"],
            undertone=result["undertone"],
            avg_hex=result["avg_hex"],
            budget=budget,
        )
    except Exception as e:
        print(f"Claude recommendations failed: {e}")
        beauty_recs = {}

    return {
        "pixel_count":     sample.patch_count,
        "monk_scale":      result["monk_scale"],
        "undertone":       result["undertone"],
        "avg_hex":         result["avg_hex"],
        "matched_shades":  matched_shades,
        "recommendations": beauty_recs,
    }


# ── Analyze (streaming SSE) ───────────────────────────────────────────────────

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _run_streaming_pipeline(image_bytes: bytes, budget: str, q: thread_queue.Queue) -> None:
    """Synchronous pipeline that emits SSE-formatted dicts into *q*.

    Runs in a daemon thread so it can block freely.  The async generator in
    analyze_stream drains *q* and yields each event to the client.
    """
    def emit(event: dict) -> None:
        q.put(event)

    try:
        # ── Stage 1: preprocessing ────────────────────────────────────────────
        emit({"stage": "preprocessing", "message": "Applying white balance correction..."})
        img_bgr = preprocess_image(image_bytes)
        h, w = img_bgr.shape[:2]

        # ── Stage 2: face detection ───────────────────────────────────────────
        landmarks = run_landmark_detection(img_bgr)
        if landmarks is None:
            emit({"stage": "error", "errors": [
                "No face detected — try a well-lit, front-facing photo with your full face visible."
            ]})
            return

        # Bounding box from all 468 landmark points.
        all_xs = [int(lm.x * w) for lm in landmarks]
        all_ys = [int(lm.y * h) for lm in landmarks]
        bbox = [min(all_xs), min(all_ys), max(all_xs) - min(all_xs), max(all_ys) - min(all_ys)]

        # Only the 17 sampled landmark indices, in image pixel space.
        from detection.face_detection import _ALL_LANDMARKS as _SAMPLE_IDX
        sampled_pts = [[int(landmarks[i].x * w), int(landmarks[i].y * h)] for i in _SAMPLE_IDX]

        emit({
            "stage":        "face_detected",
            "landmarks":    sampled_pts,
            "bbox":         bbox,
            "image_width":  w,
            "image_height": h,
        })

        # ── Stage 3: quality gate ─────────────────────────────────────────────
        gate = run_quality_gate(img_bgr, landmarks)
        if not gate["passed"]:
            print(f"[quality-gate] REJECTED  {describe_gate(gate)}")
            emit({"stage": "error", "errors": gate["failure_reasons"]})
            return

        # ── Stage 4: per-patch sampling ───────────────────────────────────────
        def on_patch(patch: dict) -> None:
            emit({"stage": "sampling", "patch": patch})

        try:
            skin_sample = extract_patches_streaming(img_bgr, landmarks, on_patch)
        except ValueError as exc:
            emit({"stage": "error", "errors": [str(exc)]})
            return

        # ── Stage 5: aggregating ──────────────────────────────────────────────
        emit({
            "stage":            "aggregating",
            "trimmed_mean_rgb": list(skin_sample.rgb),
            "patch_count":      skin_sample.patch_count,
            "rejected_count":   skin_sample.rejected_count,
        })

        # ── Stage 6: classifying ──────────────────────────────────────────────
        classification = classify_monk(skin_sample, image_bytes)
        mst_level = int(classification["monk_scale"].split("-")[1])
        distances = classify_mst_with_distances(skin_sample.lab)

        emit({
            "stage":     "classifying",
            "mst_level": mst_level,
            "distances": distances,
        })

        # ── Stage 7: shade matching ───────────────────────────────────────────
        matched_shades = match_shades(mst_level, classification["undertone"], classification["avg_hex"])
        emit({"stage": "matching", "shades": matched_shades})

        # ── Stage 8: beauty recs → complete ──────────────────────────────────
        try:
            beauty_recs = get_full_beauty_recommendations(
                monk_scale=classification["monk_scale"],
                undertone=classification["undertone"],
                avg_hex=classification["avg_hex"],
                budget=budget,
            )
        except Exception as exc:
            print(f"[analyze-stream] beauty recs failed: {exc}")
            beauty_recs = {}

        emit({
            "stage": "complete",
            "result": {
                "pixel_count":     skin_sample.patch_count,
                "monk_scale":      classification["monk_scale"],
                "undertone":       classification["undertone"],
                "avg_hex":         classification["avg_hex"],
                "matched_shades":  matched_shades,
                "recommendations": beauty_recs,
            },
        })

    except Exception as exc:
        emit({"stage": "error", "errors": [f"Unexpected error: {exc}"]})


@router.post("/analyze-stream")
async def analyze_stream(
    request: Request,
    file: UploadFile = File(...),
    budget: str = Form(default="all"),
) -> StreamingResponse:
    """Run the analysis pipeline and stream each stage as a server-sent event."""
    # Same cost profile as /analyze, so it shares the bucket — a client can't
    # double its budget by alternating between the two.
    limiter.check(client_key(request), "analyze", ANALYZE_RULES)
    spend_guard.check()

    image_bytes = await read_image_upload(file)
    q: thread_queue.Queue = thread_queue.Queue()

    def _run() -> None:
        _run_streaming_pipeline(image_bytes, budget, q)
        q.put(None)  # sentinel

    threading.Thread(target=_run, daemon=True).start()

    async def gen():
        loop = asyncio.get_event_loop()
        while True:
            event = await loop.run_in_executor(None, q.get)
            if event is None:
                break
            yield _sse(event)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Foundation match ──────────────────────────────────────────────────────────

class FoundationMatchRequest(BaseModel):
    shade_input: str
    mst_level:   int
    undertone:   str


@router.post("/match-foundation")
async def match_foundation_endpoint(request: Request, req: FoundationMatchRequest) -> dict:
    # CLIP inference is CPU-heavy and match_foundation also calls Claude, so this
    # needs both the throttle and the budget check.
    limiter.check(client_key(request), "match", SEARCH_RULES)
    spend_guard.check()

    if not req.shade_input.strip():
        return {"matches": []}
    try:
        matches = await asyncio.to_thread(
            match_foundation,
            req.shade_input.strip(),
            req.mst_level,
            req.undertone,
        )
        return {"matches": matches}
    except Exception as e:
        print(f"Foundation match error: {e}")
        return {"matches": []}


# ── Product search ────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str


def _ddgs_image_search(query: str) -> list[dict]:
    with DDGS() as ddgs:
        return list(ddgs.images(
            query,
            max_results=4,
            safesearch="moderate",
        ))



@router.post("/search-product")
async def search_product(request: Request, req: SearchRequest) -> dict:
    # DuckDuckGo will rate-limit or block the deploy's IP if this runs hot.
    limiter.check(client_key(request), "search", SEARCH_RULES)

    query = req.query.strip()[:200]
    if not query:
        return {"results": []}
    try:
        images = await asyncio.to_thread(
            _ddgs_image_search,
            f"{query} beauty product",
        )
        results = [
            {"imageUrl": img.get("image", ""), "cutoutUrl": None}
            for img in images[:4]
            if img.get("image")
        ]
        return {"results": results}
    except Exception as e:
        print(f"Search error: {e}")
        return {"results": []}
