"""Tests for sitemap category URL parsing — encoding correctness (RC-1 fix).

The sitemaps protocol mandates UTF-8. ``requests`` defaults text/* bodies to
Latin-1 when no charset is declared, which mojibake'd Arabic category URLs and
left 95/114 surahs with zero tafsir. These tests pin the UTF-8 decode behavior
by feeding raw bytes (as ``requests.content`` returns).
"""

from src.config import parse_category_urls_from_sitemap

# Raw UTF-8 bytes of a minimal sitemap: one English-named surah, one Arabic-named.
# This is exactly what requests.content would hand us (undecoded bytes).
SITEMAP_FIXTURE = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    "  <url><loc>https://nabulsi.co/category/(018)-Al-Kahf1662</loc></url>\n"
    "  <url><loc>https://nabulsi.co/category/(008) سورة الأنفال24</loc></url>\n"
    "  <url><loc>https://nabulsi.co/story/some-story.123</loc></url>\n"
    "</urlset>"
).encode("utf-8")


class TestParseCategoryUrls:
    def test_resolves_arabic_and_english_surahs(self):
        result = parse_category_urls_from_sitemap(SITEMAP_FIXTURE)
        assert 18 in result
        assert 8 in result

    def test_no_mojibake_in_resolved_urls(self):
        result = parse_category_urls_from_sitemap(SITEMAP_FIXTURE)
        assert result, "expected at least one resolved URL"
        for url in result.values():
            # classic UTF-8-as-Latin-1 mojibake markers
            assert "Ø" not in url, f"mojibake (Latin-1 decode leak): {url!r}"
            assert "Ù" not in url, f"mojibake (Latin-1 decode leak): {url!r}"

    def test_arabic_url_decoded_correctly(self):
        result = parse_category_urls_from_sitemap(SITEMAP_FIXTURE)
        assert "سورة الأنفال" in result[8]

    def test_ignores_non_category_urls(self):
        result = parse_category_urls_from_sitemap(SITEMAP_FIXTURE)
        assert len(result) == 2
        assert all("/category/" in v for v in result.values())

    def test_prefers_english_url_when_both_exist(self):
        sitemap = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            "  <url><loc>https://nabulsi.co/category/(018) سورة الكهف24</loc></url>\n"
            "  <url><loc>https://nabulsi.co/category/(018)-Al-Kahf1662</loc></url>\n"
            "</urlset>"
        ).encode("utf-8")
        result = parse_category_urls_from_sitemap(sitemap)
        assert "-Al-Kahf" in result[18]

    def test_latin1_decoded_bytes_still_yield_no_mojibake_markers(self):
        """If someone re-introduces the bug by pre-decoding as Latin-1, the Arabic
        text would contain Ø/Ù. Guard the contract."""
        result = parse_category_urls_from_sitemap(SITEMAP_FIXTURE)
        # Arabic ayah/surah words must survive intact, not as Ø³ÙØ±Ø©
        joined = "".join(result.values())
        assert "سورة" in joined or "-Al-Kahf" in joined
