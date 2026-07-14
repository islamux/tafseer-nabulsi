"""Merge Quran text, tafsir, and media into the final JSON schema."""

import json
from pathlib import Path

from src.config import OUTPUT_DIR, SURAH_NAMES
from src.media.mapper import load_media_csv, map_media_links
from src.quran.parser import Surah
from src.tafsir.content_extractor import TafsirEntry


def build_surah_json(
    surah: Surah,
    tafsir_entries: list[TafsirEntry],
    surah_id: int,
) -> dict:
    """Build the final JSON structure for a single surah."""
    media_map = load_media_csv()

    ayah_list = []
    for ayah in surah.ayahs:
        # Find all tafsir entries that mention this ayah
        matching = [t for t in tafsir_entries if ayah.number in t.ayah_numbers]

        if matching:
            tafsir_long = "\n\n".join(t.body for t in matching)
            tafsir_short = "; ".join(t.theme for t in matching if t.theme)
        else:
            tafsir_long = ""
            tafsir_short = ""

        media = map_media_links(surah_id, ayah.number, media_map)

        ayah_list.append({
            "number": ayah.number,
            "text": ayah.text,
            "tafsir_short": tafsir_short,
            "tafsir_long": tafsir_long,
            "media": media,
        })

    return {
        "surah_id": surah_id,
        "name": SURAH_NAMES[surah_id - 1],
        "ayahs": ayah_list,
    }


def save_surah_json(surah_id: int, data: dict) -> Path:
    """Save a surah's JSON to the output directory."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"{surah_id}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return out_path


def save_index(surahs_data: list[dict]) -> Path:
    """Save the surah index (_index.json)."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    index = []
    for i, s in enumerate(surahs_data, 1):
        index.append({
            "surah_id": i,
            "name": SURAH_NAMES[i - 1],
            "ayah_count": len(s["ayahs"]),
            "has_tafsir": any(a["tafsir_long"] for a in s["ayahs"]),
        })

    out_path = OUTPUT_DIR / "_index.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    return out_path


def generate_report(surahs_data: list[dict]) -> dict:
    """Generate a coverage report after building all surahs."""
    total_ayahs = 0
    with_tafsir = 0
    without_tafsir = 0
    gaps = []

    for s in surahs_data:
        for a in s["ayahs"]:
            total_ayahs += 1
            if a["tafsir_long"]:
                with_tafsir += 1
            else:
                without_tafsir += 1
                gaps.append(f"{s['surah_id']}:{a['number']}")

    return {
        "total_ayahs": total_ayahs,
        "with_tafsir": with_tafsir,
        "without_tafsir": without_tafsir,
        "coverage_pct": round(with_tafsir / total_ayahs * 100, 1) if total_ayahs else 0,
        "gaps": gaps[:50],  # first 50 gaps
        "total_gaps": len(gaps),
    }
