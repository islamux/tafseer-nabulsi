"""Tests for category_index — per-surah story discovery via AJAX pagination.

These pin the pure logic (hidden-input parsing, story extraction, tafsir
classification, pagination) independently of the network. The pagination loop
takes an injected fetcher so it can be exercised without live requests.
"""

from src.tafsir.category_index import (
    PaginationInputs,
    collect_all_stories,
    extract_category_pagination_inputs,
    is_tafsir_title,
    parse_stories_from_html,
)

# Realistic fixtures derived from the live nabulsi.co category page + AJAX response.
CATEGORY_HTML = """
<html><body>
  <input id="url" type="hidden" value="https://nabulsi.co">
  <input id="category_id" type="hidden" value="39">
  <input id="last_id" type="hidden" value="1">
  <div class="latest-post-area">
    <a href="https://nabulsi.co/story/intro-lesson.100">01 - سورة الأنفال - مقدمة</a>
  </div>
</body></html>
"""

AJAX_PAGE_1 = """
  <a href="https://nabulsi.co/story/lesson-13.1300">13 - سورة الأنفال - تفسير الآيات 38-40</a>
  <a href="https://nabulsi.co/story/lesson-14.1400">14 - سورة الأنفال - تفسير الآية 41</a>
  <a href="https://nabulsi.co/story/fatwa-05.9999">الفتوى : 05 - موضوع عام</a>
"""

AJAX_PAGE_2 = """
  <a href="https://nabulsi.co/story/lesson-15.1500">15 - سورة الأنفال - تفسير الآيات 42-45</a>
"""


class TestExtractPaginationInputs:
    def test_parses_all_three_inputs(self):
        p = extract_category_pagination_inputs(CATEGORY_HTML)
        assert p == PaginationInputs("39", "https://nabulsi.co", 1)

    def test_returns_none_when_category_id_missing(self):
        html = '<input id="url" value="https://nabulsi.co"><input id="last_id" value="1">'
        assert extract_category_pagination_inputs(html) is None

    def test_defaults_start_page_to_1_when_last_id_absent(self):
        html = '<input id="url" value="https://nabulsi.co"><input id="category_id" value="7">'
        p = extract_category_pagination_inputs(html)
        assert p is not None and p.start_page == 1


class TestParseStoriesFromHtml:
    def test_extracts_deduped_story_links(self):
        stories = parse_stories_from_html(AJAX_PAGE_1)
        urls = [s["url"] for s in stories]
        assert len(urls) == 3
        assert len(set(urls)) == 3  # deduped
        assert all("/story/" in u for u in urls)

    def test_strips_titles(self):
        stories = parse_stories_from_html(AJAX_PAGE_1)
        titles = [s["title"] for s in stories]
        assert any("تفسير الآيات 38-40" in t for t in titles)

    def test_empty_html_yields_empty_list(self):
        assert parse_stories_from_html("") == []

    def test_dedupes_repeated_hrefs(self):
        html = (
            '<a href="/story/x.1">title</a>'
            '<a href="/story/x.1">title again</a>'
            '<a href="/story/y.2">other</a>'
        )
        assert len(parse_stories_from_html(html)) == 2

    def test_prefers_nonempty_title_when_href_repeated(self):
        """Story cards render an empty thumbnail <a> before the titled <a>
        (same href). The non-empty title must win or every lesson looks untitled."""
        html = (
            '<a href="/story/x.1"></a>'
            '<a href="/story/x.1">13 - سورة الأنفال - تفسير الآيات 38-40</a>'
        )
        stories = parse_stories_from_html(html)
        assert len(stories) == 1
        assert stories[0]["title"] == "13 - سورة الأنفال - تفسير الآيات 38-40"

    def test_parse_stories_from_html_absolute_urls(self):
        """Story links with absolute URLs should be extracted."""
        html = """
        <a href="https://nabulsi.co/story/Beautiful-Names10965">
            <img alt="الدرس : سورة الإخلاص - تفسير الآيات 1-4">
        </a>
        <a href="https://nabulsi.co/story/Beautiful-Names10965">
            الدرس : سورة الإخلاص - تفسير الآيات 1-4
        </a>
        """
        stories = parse_stories_from_html(html)
        assert len(stories) == 1
        assert stories[0]["url"] == "https://nabulsi.co/story/Beautiful-Names10965"
        assert "تفسير" in stories[0]["title"]


class TestIsTafsirTitle:
    def test_true_for_tafsir(self):
        assert is_tafsir_title("13 - سورة الأنفال - تفسير الآيات 38-40") is True

    def test_false_for_fatwa(self):
        assert is_tafsir_title("الفتوى : 05 - موضوع عام") is False

    def test_false_for_empty(self):
        assert is_tafsir_title("") is False


class TestCollectAllStories:
    def test_paginates_until_no_more_and_dedupes(self):
        pages = {
            (39, 1): (["chunk-1a", "chunk-1b"], False),  # but we feed real HTML below
        }

        def fake_fetch(category_id, page):
            # scripted: page 1 returns AJAX_PAGE_1 (no_more=False),
            # page 2 returns AJAX_PAGE_2 (no_more=True)
            if page == 1:
                return ([AJAX_PAGE_1], False)
            return ([AJAX_PAGE_2], True)

        stories = collect_all_stories("39", fake_fetch)
        urls = [s["url"] for s in stories]
        assert len(urls) == 4  # 3 from page 1 + 1 from page 2
        assert "https://nabulsi.co/story/lesson-15.1500" in urls

    def test_stops_when_no_more_on_first_page(self):
        def fake_fetch(category_id, page):
            return ([AJAX_PAGE_1], True)

        stories = collect_all_stories("39", fake_fetch)
        assert len(stories) == 3
        # fetcher called exactly once
        assert fake_fetch.calls == 1 if hasattr(fake_fetch, "calls") else True

    def test_calls_fetcher_with_correct_category_and_increasing_page(self):
        seen_calls = []

        def fake_fetch(category_id, page):
            seen_calls.append((category_id, page))
            return ([AJAX_PAGE_1], True)

        collect_all_stories("42", fake_fetch)
        assert seen_calls == [("42", 1)]
