"""Disk-based HTTP response cache using JSON + hash-based filenames."""

import hashlib
import json
import time
from pathlib import Path

from src.config import CACHE_DIR

CACHE_TTL_DAYS = 30
MIN_BODY_LENGTH = 50


def _cache_key(url: str) -> Path:
    return CACHE_DIR / (hashlib.sha256(url.encode()).hexdigest() + ".json")


def get_cached(url: str) -> str | None:
    """Return cached HTML body or None if not cached or expired."""
    path = _cache_key(url)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        fetched_at = data.get("fetched_at", 0)
        age_days = (time.time() - fetched_at) / 86400
        if age_days > CACHE_TTL_DAYS:
            path.unlink(missing_ok=True)
            return None
        body = data.get("body", "")
        if len(body) < MIN_BODY_LENGTH:
            return None
        return body
    except (json.JSONDecodeError, KeyError):
        path.unlink(missing_ok=True)
        return None


def set_cached(url: str, body: str) -> None:
    """Persist an HTTP response body to disk cache (skip short/empty bodies)."""
    if len(body) < MIN_BODY_LENGTH:
        return
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_key(url)
    path.write_text(
        json.dumps({"url": url, "body": body, "fetched_at": time.time()}, ensure_ascii=False),
        encoding="utf-8",
    )


def clear_cache() -> int:
    """Delete all cached files. Returns count deleted."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    for f in CACHE_DIR.glob("*.json"):
        f.unlink()
        count += 1
    for f in CACHE_DIR.glob("*.pkl"):
        f.unlink()
        count += 1
    return count
