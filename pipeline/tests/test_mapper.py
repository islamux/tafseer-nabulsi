"""Tests for media/mapper.py."""

from pathlib import Path

from src.media.mapper import load_media_csv, map_media_links


class TestLoadMediaCsv:
    def test_loads_valid_csv(self, tmp_path):
        csv = tmp_path / "media.csv"
        csv.write_text("1,1,https://example.com/a.mp3,https://example.com/v.mp4\n1,2,https://example.com/a2.mp3,\n")
        result = load_media_csv(csv)
        assert len(result) == 2
        assert result[(1, 1)]["audio_url"] == "https://example.com/a.mp3"
        assert result[(1, 2)]["video_url"] == ""

    def test_skips_malformed_rows(self, tmp_path):
        csv = tmp_path / "media.csv"
        csv.write_text("1,1,https://example.com/a.mp3,\nbad,data,too\n1,2,https://example.com/a2.mp3,\n")
        result = load_media_csv(csv)
        assert len(result) == 2

    def test_returns_empty_when_file_missing(self):
        result = load_media_csv(Path("/nonexistent/file.csv"))
        assert result == {}

    def test_skips_header_like_rows(self, tmp_path):
        csv = tmp_path / "media.csv"
        csv.write_text("surah_id,ayah_number,audio_url,video_url\n1,1,https://example.com/a.mp3,\n")
        result = load_media_csv(csv)
        assert len(result) == 1
        assert (1, 1) in result


class TestMapMediaLinks:
    def test_returns_urls_when_found(self):
        media_map = {(1, 1): {"audio_url": "a.mp3", "video_url": "v.mp4"}}
        result = map_media_links(1, 1, media_map)
        assert result["audio_url"] == "a.mp3"
        assert result["video_url"] == "v.mp4"

    def test_returns_empty_when_not_found(self):
        result = map_media_links(1, 1, {})
        assert result == {"audio_url": "", "video_url": ""}
