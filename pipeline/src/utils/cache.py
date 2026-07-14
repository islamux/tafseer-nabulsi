"""Disk-based HTTP response cache using pickle + hash-based filenames."""

import hashlib
import pickle
from pathlib import Path

from src.config import CACHE_DIR


def _cache_key(url: str) -> Path:
    return CACHE_DIR / (hashlib.sha256(url.encode()).hexdigest() + ".pkl")


def get_cached(url: str) -> str | None:
    """Return cached HTML body or None if not cached."""
    path = _cache_key(url)
    if path.exists():
        try:
            data = pickle.loads(path.read_bytes())
            return data.get("body")
        except (pickle.UnpicklingError, KeyError):
            path.unlink(missing_ok=True)
    return None


def set_cached(url: str, body: str) -> None:
    """Persist an HTTP response body to disk cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path = _cache_key(url)
    path.write_bytes(pickle.dumps({"url": url, "body": body}))


def clear_cache() -> int:
    """Delete all cached files. Returns count deleted."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    count = 0
    for f in CACHE_DIR.glob("*.pkl"):
        f.unlink()
        count += 1
    return count
