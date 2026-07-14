"""Tests for the merge builder module."""

from src.merge.builder import build_surah_json, generate_report
from src.quran.parser import Ayah, Surah
from src.tafsir.content_extractor import TafsirEntry


def _make_surah(index: int = 1, ayah_texts: dict[int, str] | None = None) -> Surah:
    if ayah_texts is None:
        ayah_texts = {1: "بِسْمِ ٱللَّهِ", 2: "ٱلْحَمْدُ"}
    ayahs = [Ayah(number=n, text=t) for n, t in ayah_texts.items()]
    return Surah(index=index, ayahs=ayahs)


def test_build_surah_with_tafsir():
    surah = _make_surah()
    entries = [
        TafsirEntry(ayah_numbers=[1], title="تفسير الآية 1", theme="المقدمة", body="نص طويل"),
    ]
    data = build_surah_json(surah, entries, surah_id=1)

    assert data["surah_id"] == 1
    assert len(data["ayahs"]) == 2
    assert data["ayahs"][0]["tafsir_long"] == "نص طويل"
    assert data["ayahs"][0]["tafsir_short"] == "المقدمة"
    assert data["ayahs"][1]["tafsir_long"] == ""


def test_build_surah_no_tafsir():
    surah = _make_surah()
    data = build_surah_json(surah, [], surah_id=1)
    for ayah in data["ayahs"]:
        assert ayah["tafsir_long"] == ""
        assert ayah["tafsir_short"] == ""


def test_build_surah_shared_tafsir():
    """A tafsir entry covering multiple ayahs."""
    surah = _make_surah()
    entries = [
        TafsirEntry(ayah_numbers=[1, 2], title="تفسير الآيتان 1-2", theme="مقدمة عامة", body="نص مشترك"),
    ]
    data = build_surah_json(surah, entries, surah_id=1)
    assert data["ayahs"][0]["tafsir_long"] == "نص مشترك"
    assert data["ayahs"][1]["tafsir_long"] == "نص مشترك"


def test_generate_report():
    surah_data = [
        {
            "surah_id": 1,
            "ayahs": [
                {"number": 1, "text": "test", "tafsir_short": "s", "tafsir_long": "long", "media": {}},
                {"number": 2, "text": "test", "tafsir_short": "", "tafsir_long": "", "media": {}},
            ],
        }
    ]
    report = generate_report(surah_data)
    assert report["total_ayahs"] == 2
    assert report["with_tafsir"] == 1
    assert report["without_tafsir"] == 1
    assert report["coverage_pct"] == 50.0
    assert "1:2" in report["gaps"]
