import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.limits import MAX_UPLOAD_BYTES
from api.middleware import BodySizeLimitMiddleware
from api.routes import router

app = FastAPI(title="GlowMatch API")


# ── CORS ──────────────────────────────────────────────────────────────────────
# Set ALLOWED_ORIGINS to the deployed frontend origin(s), comma-separated.
# Falls back to local dev origins so `npm run dev` works without config.

DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

_configured = os.environ.get("ALLOWED_ORIGINS", "").strip()
allowed_origins = (
    [origin.strip() for origin in _configured.split(",") if origin.strip()]
    if _configured
    else DEV_ORIGINS
)

if not _configured:
    print(
        "[cors] ALLOWED_ORIGINS is unset — allowing localhost only. "
        "Set it to your Vercel origin before going public."
    )

# Order matters: middleware added last is outermost, so CORS wraps the body-size
# check and a 413 still comes back with CORS headers the browser can read.
app.add_middleware(BodySizeLimitMiddleware, max_bytes=MAX_UPLOAD_BYTES)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router)
