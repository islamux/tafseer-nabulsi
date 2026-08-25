import warnings
from unittest.mock import patch


def test_fetch_story_page_warns_on_failure():
    from src.tafsir.scraper import fetch_story_page
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        with patch("src.tafsir.scraper.fetch_page", side_effect=Exception("timeout")):
            result = fetch_story_page("https://example.com/story/1")
        assert result is None
        assert len(w) == 1
        assert "https://example.com/story/1" in str(w[0].message)
