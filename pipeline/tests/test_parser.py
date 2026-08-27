"""Tests for quran/parser.py."""

import json
from pathlib import Path

from src.quran.parser import Surah, Ayah, get_surah_by_index


class TestSurahAyahDataclasses:
    def test_ayah_creation(self):
        a = Ayah(number=1, text="بسم الله")
        assert a.number == 1
        assert a.text == "بسم الله"

    def test_surah_creation(self):
        s = Surah(index=1, ayahs=[Ayah(1, "text")])
        assert s.index == 1
        assert len(s.ayahs) == 1


class TestGetSurahByIndex:
    def test_finds_surah(self):
        surahs = [
            Surah(index=1, ayahs=[]),
            Surah(index=2, ayahs=[]),
        ]
        assert get_surah_by_index(surahs, 2).index == 2

    def test_returns_none_for_missing(self):
        surahs = [Surah(index=1, ayahs=[])]
        assert get_surah_by_index(surahs, 99) is None


class TestParseQuranJson:
    def test_parses_valid_json(self, tmp_path):
        data = {
            "data": {
                "surahs": [
                    {
                        "number": 1,
                        "ayahs": [
                            {"numberInSurah": 1, "text": "بسم الله"},
                            {"numberInSurah": 2, "text": "الحمد لله"},
                        ],
                    },
                    {
                        "number": 2,
                        "ayahs": [
                            {"numberInSurah": 1, "text": "الم"},
                        ],
                    },
                ]
            }
        }
        path = tmp_path / "quran.json"
        path.write_text(json.dumps(data), encoding="utf-8")

        from src.quran.parser import parse_quran_json
        surahs = parse_quran_json(path)
        assert len(surahs) == 2
        assert surahs[0].index == 1
        assert len(surahs[0].ayahs) == 2
        assert surahs[0].ayahs[0].text == "بسم الله"
        assert surahs[1].index == 2
        assert surahs[1].ayahs[0].text == "الم"

    def test_empty_surahs(self, tmp_path):
        data = {"data": {"surahs": []}}
        path = tmp_path / "empty.json"
        path.write_text(json.dumps(data), encoding="utf-8")

        from src.quran.parser import parse_quran_json
        surahs = parse_quran_json(path)
        assert surahs == []
