"""CLI entry point for the tafsir pipeline.

Usage:
    uv run python -m src.main --all          Build all 114 surahs
    uv run python -m src.main --surah 1      Build only Surah Al-Fatiha
    uv run python -m src.main --resume       Resume failed surahs
    uv run python -m src.main --report       Show last build report
"""

import argparse
import json
import logging
import sys
from pathlib import Path

from src.config import OUTPUT_DIR, SURAH_COUNT, SURAH_NAMES
from src.merge.builder import build_surah_json, generate_report, save_index, save_surah_json
from src.quran.parser import parse_quran_json
from src.tafsir.category_index import (
    collect_all_stories,
    extract_category_pagination_inputs,
    is_tafsir_title,
    make_ajax_fetcher,
    parse_stories_from_html,
)
from src.tafsir.content_extractor import process_lesson
from src.tafsir.scraper import fetch_page, fetch_story_page
from src.tafsir.surah_index import get_surah_category_urls
from src.utils.logging_setup import setup_logging

logger = logging.getLogger("tafsir-pipeline.main")


def _collect_surah_stories(surah_number: int) -> list[dict]:
    """Fetch a surah's full story list via paginated category AJAX.

    Falls back to the initial server-rendered links if the page exposes no
    pagination inputs.
    """
    cat_info = get_surah_category_urls()[surah_number]
    try:
        cat_html = fetch_page(cat_info["category_url"])
    except Exception as e:
        logger.warning("  Failed to fetch category page for surah %d: %s", surah_number, e)
        return []

    stories = parse_stories_from_html(cat_html)
    pagination = extract_category_pagination_inputs(cat_html)
    if pagination:
        fetcher = make_ajax_fetcher(pagination.base_url)
        ajax_stories = collect_all_stories(pagination.category_id, fetcher)
        seen = {s["url"] for s in stories}
        for s in ajax_stories:
            if s["url"] not in seen:
                seen.add(s["url"])
                stories.append(s)
    return stories


def build_surah(surah_number: int, quran_surahs: list) -> dict | None:
    """Build JSON for a single surah. Returns the data dict or None on failure."""
    from src.quran.parser import get_surah_by_index

    surah_name = SURAH_NAMES[surah_number - 1]
    logger.info("Building surah %d (%s)...", surah_number, surah_name)

    # Get Quran text
    quran_surah = get_surah_by_index(quran_surahs, surah_number)
    if not quran_surah:
        logger.error("Quran surah %d not found", surah_number)
        return None

    # Collect ALL stories for this surah, then keep the tafsir lessons
    stories = _collect_surah_stories(surah_number)
    tafsir_count = sum(1 for s in stories if is_tafsir_title(s["title"]))
    logger.info("  Found %d stories (%d tafsir)", len(stories), tafsir_count)

    tafsir_entries = []
    for s in stories:
        if not is_tafsir_title(s["title"]):
            continue
        try:
            result = fetch_story_page(s["url"])
            if not result:
                continue
            entry = process_lesson(result["title"], result["body"])
            if entry.ayah_numbers:
                tafsir_entries.append(entry)
        except Exception as e:
            logger.warning("  Failed to process story '%s': %s", s.get("title", "?")[:40], e)

    logger.info("  Processed %d tafsir entries", len(tafsir_entries))

    # Build and save
    data = build_surah_json(quran_surah, tafsir_entries, surah_number)
    out_path = save_surah_json(surah_number, data)
    logger.info("  Saved %s", out_path)

    return data


def main():
    parser = argparse.ArgumentParser(description="Tafsir Nabulsi Data Pipeline")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--all", action="store_true", help="Build all 114 surahs")
    group.add_argument("--surah", type=int, help="Build a specific surah (1-114)")
    group.add_argument("--resume", action="store_true", help="Resume failed surahs only")
    group.add_argument("--report", action="store_true", help="Show last build report")
    parser.add_argument("--log-level", default="INFO", help="Log level (DEBUG/INFO/WARNING)")

    args = parser.parse_args()
    setup_logging(args.log_level)

    if args.report:
        report_path = OUTPUT_DIR / "_report.json"
        if report_path.exists():
            report = json.loads(report_path.read_text())
            print(json.dumps(report, indent=2, ensure_ascii=False))
        else:
            print("No report found. Run a build first.")
        return

    # Load Quran
    logger.info("Loading Quran text from AlQuran.cloud...")
    quran_surahs = parse_quran_json()
    logger.info("Loaded %d surahs", len(quran_surahs))

    # Determine which surahs to build
    if args.surah:
        surah_numbers = [args.surah]
    elif args.resume:
        existing = {int(f.stem) for f in OUTPUT_DIR.glob("*.json") if f.stem.isdigit()}
        surah_numbers = [i for i in range(1, SURAH_COUNT + 1) if i not in existing]
        logger.info("Resuming: %d surahs missing", len(surah_numbers))
    else:
        surah_numbers = list(range(1, SURAH_COUNT + 1))

    # Build
    all_data = []
    failed = []

    for num in surah_numbers:
        try:
            data = build_surah(num, quran_surahs)
            if data:
                all_data.append(data)
            else:
                failed.append(num)
        except Exception as e:
            logger.error("Surah %d failed: %s", num, e)
            failed.append(num)

    # Save index and report
    if all_data:
        # Load any previously built surahs for index completeness
        existing_data = []
        for i in range(1, SURAH_COUNT + 1):
            f = OUTPUT_DIR / f"{i}.json"
            if f.exists() and i not in [d["surah_id"] for d in all_data]:
                existing_data.append(json.loads(f.read_text()))
        existing_data.extend(all_data)
        existing_data.sort(key=lambda d: d["surah_id"])

        save_index(existing_data)
        report = generate_report(existing_data)
        report_path = OUTPUT_DIR / "_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        logger.info("Report: %.1f%% coverage (%d/%d ayahs)",
                     report["coverage_pct"],
                     report["with_tafsir"],
                     report["total_ayahs"])
        if report["total_gaps"] > 0:
            logger.info("  %d ayahs without tafsir", report["total_gaps"])

    if failed:
        logger.error("Failed surahs: %s", failed)
        sys.exit(1)

    logger.info("Done.")


if __name__ == "__main__":
    main()
