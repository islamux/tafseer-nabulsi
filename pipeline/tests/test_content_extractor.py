"""Tests for the content_extractor module."""

from src.tafsir.content_extractor import process_lesson, _extract_theme, _clean_text


class TestExtractTheme:
    def test_comma_separated(self):
        title = "01 - سورة التوبة - تفسير الآية 24 ، الحب لله وحده"
        assert _extract_theme(title) == "الحب لله وحده"

    def test_dash_separated(self):
        title = "سورة البقرة - تفسير الآية 1 - المقدمة"
        assert _extract_theme(title) == "المقدمة"

    def test_no_separator(self):
        title = "تفسير الآية 24"
        assert _extract_theme(title) == ""


class TestCleanText:
    def test_normalizes_whitespace(self):
        assert _clean_text("  hello   world  ") == "hello world"

    def test_collapses_newlines(self):
        text = "line1\n\n\nline2"
        result = _clean_text(text)
        assert "\n\n" not in result

    def test_strips(self):
        assert _clean_text("  leading and trailing  ") == "leading and trailing"


class TestProcessLesson:
    def test_end_to_end_comma_title(self):
        title = "01 - سورة التوبة - تفسير الآية 19 ، الإخلاص"
        body = "نص طويل جداً يحتوي على تفسير الإخلاص."
        result = process_lesson(title, body)
        assert result.ayah_numbers == [19]
        assert result.theme == "الإخلاص"
        assert result.body == "نص طويل جداً يحتوي على تفسير الإخلاص."

    def test_end_to_end_range_title(self):
        title = "تفسير الآيات 5-8"
        body = "تفسير خمس إلى ثمانية."
        result = process_lesson(title, body)
        assert result.ayah_numbers == [5, 6, 7, 8]
        assert result.body == "تفسير خمس إلى ثمانية."

    def test_empty_title_returns_empty_ayahs(self):
        result = process_lesson("", "some body text")
        assert result.ayah_numbers == []
        assert result.body == "some body text"

    def test_unrecognized_title_returns_empty_ayahs(self):
        result = process_lesson("قانون المعيشة الضنك", "some body")
        assert result.ayah_numbers == []
        assert result.theme == ""

    def test_body_is_cleaned(self):
        title = "تفسير الآية 1"
        body = "  نص   بمسافات   متعددة  "
        result = process_lesson(title, body)
        assert result.body == "نص بمسافات متعددة"
