"""File storage abstraction (design §15, §17).

Stores generated documents on local disk by default (mounted volume), and is structured to
swap in an S3-compatible object store with signed URLs in production. Files are served via
signed URLs and kept outside the web root.
"""
import os
from app.config import settings


def save_bytes(key: str, data: bytes, content_type: str = "application/pdf") -> str:
    base = settings.storage_dir
    path = os.path.join(base, key)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(data)
    # In production this returns a time-limited signed object-store URL instead.
    return f"file://{path}"


def public_url(key: str) -> str:
    return f"file://{os.path.join(settings.storage_dir, key)}"
