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

# With ALLOWED_ORIGINS unset we're in local dev, so accept any localhost port —
# `npm run dev -- -p 3002` shouldn't require reconfiguring the backend. Once
# ALLOWED_ORIGINS is set (i.e. in production) only those exact origins pass, and
# the localhost escape hatch is off.
DEV_ORIGIN_REGEX = r"http://(localhost|127\.0\.0\.1)(:\d+)?"

_configured = os.environ.get("ALLOWED_ORIGINS", "").strip()
allowed_origins = [o.strip() for o in _configured.split(",") if o.strip()]
dev_origin_regex = None if _configured else DEV_ORIGIN_REGEX

if not _configured:
    print(
        "[cors] ALLOWED_ORIGINS is unset — allowing any localhost port (dev mode). "
        "Set it to your deployed origin before going public."
    )

# Order matters: middleware added last is outermost, so CORS wraps the body-size
# check and a 413 still comes back with CORS headers the browser can read.
app.add_middleware(BodySizeLimitMiddleware, max_bytes=MAX_UPLOAD_BYTES)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=dev_origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(router)
