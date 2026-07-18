"""Tests for the lesson_parser module — Arabic title → ayah range."""

from src.tafsir.lesson_parser import parse_ayah_range


class TestSingleAyah:
    def test_single_number(self):
        assert parse_ayah_range("الدرس: تفسير الآية 24 ، الحب لله") == [24]

    def test_single_with_prefix(self):
        assert parse_ayah_range("01 - سورة التوبة - تفسير الآية 19") == [19]

    def test_single_aya_space(self):
        assert parse_ayah_range("تفسير الآية 5") == [5]


class TestDualAyah:
    def test_dual_range(self):
        assert parse_ayah_range("تفسير الآيتان 25-26 ، الإفقار") == [25, 26]

    def test_dual_em_dash(self):
        assert parse_ayah_range("تفسير الآيتان 38–39") == [38, 39]


class TestPluralAyah:
    def test_plural_range(self):
        assert parse_ayah_range("تفسير الآيات 1-5") == [1, 2, 3, 4, 5]

    def test_plural_wide_range(self):
        result = parse_ayah_range("تفسير الآيات 10-15")
        assert result == [10, 11, 12, 13, 14, 15]


class TestEdgeCases:
    def test_no_match(self):
        assert parse_ayah_range("قانون المعيشة الضنك") == []

    def test_empty_string(self):
        assert parse_ayah_range("") == []

    def test_numbers_not_ayah(self):
        # Numbers that aren't preceded by آية patterns should not match
        assert parse_ayah_range("الدرس 16 - قانون التغيير") == []

    def test_arabic_comma_separator(self):
        result = parse_ayah_range("الدرس 05 - تفسير الآية 28 ، الفرق بين نجس و نجس")
        assert result == [28]

    def test_two_ayahs_no_dash(self):
        # Fallback should catch single numbers
        result = parse_ayah_range("تفسير آية 100")
        assert result == [100]

    def test_spaced_en_dash(self):
        """Spaced en-dash should work like regular dash."""
        result = parse_ayah_range("تفسير الآيات 1 – 8")
        assert result == [1, 2, 3, 4, 5, 6, 7, 8]

    def test_part_notation(self):
        """Part notation (same number repeated) should return single ayah."""
        result = parse_ayah_range("تفسير الآيات 2-2")
        assert result == [2]  # "part 2 of 2" = single ayah 2

    def test_comma_separated_numbers(self):
        assert parse_ayah_range("تفسير الآيات 1، 2، 3") == [1, 2, 3]

    def test_bare_number_after_tafsir(self):
        result = parse_ayah_range("تفسير 24")
        assert result == [24]

    def test_number_after_colon(self):
        assert parse_ayah_range("تفسير: الآية 24") == [24]

    def test_title_with_only_number(self):
        assert parse_ayah_range("الآيات 5-10") == list(range(5, 11))
