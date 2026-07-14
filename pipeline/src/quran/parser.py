"""Parse AlQuran.cloud JSON into structured Quran data.

AlQuran.cloud API returns:
{
  "data": [
    {
      "number": 1,
      "name": "الفاتحة",
      "englishName": "Al-Faatiha",
      "revelationType": "Meccan",
      "numberOfAyahs": 7,
      "ayahs": [
        {
          "number": 1,
          "text": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
          "numberInSurah": 1,
          ...
        }
      ]
    }
  ]
}
"""

import json
from dataclasses import dataclass
from pathlib import Path

from src.quran.fetcher import fetch_quran_json


@dataclass
class Ayah:
    number: int
    text: str


@dataclass
class Surah:
    index: int
    ayahs: list[Ayah]


def parse_quran_json(json_path: Path | None = None) -> list[Surah]:
    """Parse AlQuran.cloud JSON and return list of Surah objects.

    If json_path is None, fetches and caches the JSON automatically.
    """
    if json_path is None:
        json_path = fetch_quran_json()

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    surahs: list[Surah] = []
    for sura in data["data"]["surahs"]:
        surah_idx = sura["number"]
        ayahs: list[Ayah] = []
        for aya in sura["ayahs"]:
            ayah_num = aya["numberInSurah"]
            text = aya["text"]
            ayahs.append(Ayah(number=ayah_num, text=text))
        surahs.append(Surah(index=surah_idx, ayahs=ayahs))

    return surahs


def get_surah_by_index(surahs: list[Surah], index: int) -> Surah | None:
    """Get a single surah by its index (1-114)."""
    for s in surahs:
        if s.index == index:
            return s
    return None
