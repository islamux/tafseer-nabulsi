"""Fetch Quran text from AlQuran.cloud API (Uthmani script, JSON)."""

import json
from pathlib import Path

import requests

from src.config import CACHE_DIR, REQUEST_DELAY_SECONDS
from src.utils.rate_limit import wait_if_needed

ALQURAN_CLOUD_URL = "https://api.alquran.cloud/v1/quran/quran-uthmani"
_QURAN_CACHE = CACHE_DIR / "quran_uthmani.json"


def fetch_quran_json(force: bool = False) -> Path:
    """Download the full Quran in Uthmani script from AlQuran.cloud.

    Returns the local cached JSON path.
    """
    if _QURAN_CACHE.exists() and not force:
        return _QURAN_CACHE

    _QURAN_CACHE.parent.mkdir(parents=True, exist_ok=True)

    wait_if_needed(REQUEST_DELAY_SECONDS)
    resp = requests.get(ALQURAN_CLOUD_URL, timeout=60)
    resp.raise_for_status()

    _QURAN_CACHE.write_text(resp.text, encoding="utf-8")
    return _QURAN_CACHE
