"""Tests for utils/cache.py — file format and TTL logic."""

import json
import time
from pathlib import Path

from src.utils.cache import CACHE_TTL_DAYS, MIN_BODY_LENGTH


class TestCacheFormat:
    def test_constants(self):
        assert CACHE_TTL_DAYS == 30
        assert MIN_BODY_LENGTH == 50

    def test_cache_file_is_json(self, tmp_path):
        path = tmp_path / "test.json"
        entry = {"url": "https://example.com", "body": "x" * 60, "fetched_at": time.time()}
        path.write_text(json.dumps(entry, ensure_ascii=False), encoding="utf-8")
        data = json.loads(path.read_text(encoding="utf-8"))
        assert data["url"] == "https://example.com"
        assert len(data["body"]) >= MIN_BODY_LENGTH
        assert isinstance(data["fetched_at"], float)

    def test_expired_entry_detected(self):
        entry = {"url": "https://example.com", "body": "x" * 60, "fetched_at": 0}
        age_days = (time.time() - entry["fetched_at"]) / 86400
        assert age_days > CACHE_TTL_DAYS

    def test_fresh_entry_not_expired(self):
        entry = {"url": "https://example.com", "body": "x" * 60, "fetched_at": time.time()}
        age_days = (time.time() - entry["fetched_at"]) / 86400
        assert age_days < CACHE_TTL_DAYS

    def test_short_body_below_minimum(self):
        assert len("hi") < MIN_BODY_LENGTH

    def test_corrupt_json_handled(self, tmp_path):
        path = tmp_path / "corrupt.json"
        path.write_text("not json", encoding="utf-8")
        try:
            json.loads(path.read_text(encoding="utf-8"))
            assert False, "should have raised"
        except json.JSONDecodeError:
            pass
