"""Tests for scraper.py HTML extraction functions."""

from unittest.mock import patch, MagicMock
from src.tafsir.scraper import (
    extract_story_links_from_category,
    fetch_story_page,
)


class TestExtractStoryLinks:
    def test_extracts_story_links(self):
        html = '''
        <html><body>
        <a href="/story/123">First Story</a>
        <a href="/story/456">Second Story</a>
        <a href="/other/page">Not a story</a>
        </body></html>
        '''
        result = extract_story_links_from_category(html, "https://example.com/category/1")
        assert len(result) == 2
        assert result[0]["url"] == "https://example.com/story/123"
        assert result[0]["title_raw"] == "First Story"

    def test_deduplicates_urls(self):
        html = '''
        <html><body>
        <a href="/story/123">Story A</a>
        <a href="/story/123">Story A again</a>
        </body></html>
        '''
        result = extract_story_links_from_category(html, "https://example.com/c")
        assert len(result) == 1

    def test_joins_relative_urls(self):
        html = '<html><body><a href="/story/100">Link</a></body></html>'
        result = extract_story_links_from_category(html, "https://example.com/category/1")
        assert result[0]["url"] == "https://example.com/story/100"

    def test_skips_empty_href(self):
        html = '<html><body><a href="">Empty</a><a href="/story/1">Valid</a></body></html>'
        result = extract_story_links_from_category(html, "https://example.com/c")
        assert len(result) == 1

    def test_returns_empty_for_no_stories(self):
        html = '<html><body><a href="/other">Not story</a></body></html>'
        result = extract_story_links_from_category(html, "https://example.com/c")
        assert result == []


class TestFetchStoryPage:
    def test_returns_none_on_fetch_failure(self):
        with patch("src.tafsir.scraper.fetch_page", side_effect=Exception("timeout")):
            result = fetch_story_page("https://example.com/story/1")
        assert result is None

    def test_extracts_title_and_body(self):
        html = '''
        <html><head><title>My Lesson Title</title></head>
        <body><div class="sg-post-content">
        <p>This is the tafsir body text.</p>
        <p>Second paragraph.</p>
        </div></body></html>
        '''
        with patch("src.tafsir.scraper.fetch_page", return_value=html):
            result = fetch_story_page("https://example.com/story/1")
        assert result is not None
        assert result["title"] == "My Lesson Title"
        assert "tafsir body text" in result["body"]

    def test_extracts_category(self):
        html = '''
        <html><head><title>T</title></head>
        <body>
        <a href="/category/surah-al-baqarah">سورة البقرة</a>
        <div class="sg-post-content"><p>body</p></div>
        </body></html>
        '''
        with patch("src.tafsir.scraper.fetch_page", return_value=html):
            result = fetch_story_page("https://example.com/story/1")
        assert result["category_name"] == "سورة البقرة"
        assert "/category/" in result["category_url"]

    def test_fallback_to_article_selector(self):
        html = '''
        <html><head><title>T</title></head>
        <body><article><p>Fallback body text.</p></article></body>
        </html>
        '''
        with patch("src.tafsir.scraper.fetch_page", return_value=html):
            result = fetch_story_page("https://example.com/story/1")
        assert result is not None
        assert "Fallback body text" in result["body"]

    def test_returns_empty_body_when_no_content_found(self):
        html = '<html><head><title>T</title></head><body><p>minimal</p></body></html>'
        with patch("src.tafsir.scraper.fetch_page", return_value=html):
            result = fetch_story_page("https://example.com/story/1")
        assert result is not None
        assert result["body"] == ""
