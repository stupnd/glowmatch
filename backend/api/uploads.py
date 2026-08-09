"""Upload validation for the public /analyze endpoint.

`file.content_type` is whatever the client typed in the multipart header, so it
proves nothing. These helpers cap the read, sniff the real magic bytes, and make
Pillow confirm the image actually decodes at a sane resolution before any of it
reaches MediaPipe or torch.
"""

from __future__ import annotations

import io
import os

from fastapi import HTTPException, UploadFile
from PIL import Image

from api.limits import MAX_UPLOAD_BYTES

# A 12 MP ceiling comfortably covers phone cameras while rejecting decompression
# bombs — a few-KB PNG can otherwise expand to gigabytes of pixel buffer.
MAX_IMAGE_PIXELS = int(os.environ.get("MAX_IMAGE_PIXELS", 12_000_000))

_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
)

_PIL_FORMATS = {"JPEG", "PNG", "GIF", "WEBP", "MPO"}


def sniff_image_type(data: bytes) -> str | None:
    """Return the real MIME type from the file's magic bytes, or None."""
    for signature, mime in _SIGNATURES:
        if data.startswith(signature):
            return mime
    # WebP is a RIFF container: "RIFF" <4-byte size> "WEBP"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def read_image_upload(file: UploadFile) -> bytes:
    """Read an uploaded image, enforcing size, format, and resolution limits.

    Raises 413 if it's too large, 400 if it isn't a decodable image.
    """
    chunks: list[bytes] = []
    total = 0

    while True:
        chunk = await file.read(64 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Image must be smaller than {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)

    data = b"".join(chunks)
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if sniff_image_type(data) is None:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be a JPEG, PNG, WebP, or GIF image.",
        )

    # Header-only parse: confirms it really decodes and gives us dimensions
    # without materialising the full pixel buffer.
    try:
        with Image.open(io.BytesIO(data)) as img:
            image_format = img.format
            width, height = img.size
    except Exception:
        raise HTTPException(status_code=400, detail="Image could not be read.")

    if image_format not in _PIL_FORMATS:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be a JPEG, PNG, WebP, or GIF image.",
        )

    if width * height > MAX_IMAGE_PIXELS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Image resolution is too large ({width}x{height}). "
                "Please upload a photo under 12 megapixels."
            ),
        )

    return data
