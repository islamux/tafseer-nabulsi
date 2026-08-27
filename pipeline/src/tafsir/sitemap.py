"""Parse nabulsi.com sitemap to map surah numbers to category URLs."""

import json
import re
import warnings
from pathlib import Path

import requests
from bs4 import BeautifulSoup

from src.config import CACHE_DIR, NABULSI_SITEMAP_URL


def parse_category_urls_from_sitemap(sitemap_bytes: bytes) -> dict[int, str]:
    """Parse raw sitemap bytes into surah_number → category_url."""
    text = sitemap_bytes.decode("utf-8", errors="replace")
    soup = BeautifulSoup(text, "xml")
    all_urls = [loc.text.strip() for loc in soup.find_all("loc")]

    surah_map: dict[int, list[str]] = {}
    for url in all_urls:
        m = re.search(r"/category/\((\d{3})\)", url)
        if m:
            surah_num = int(m.group(1))
            if 1 <= surah_num <= 114:
                surah_map.setdefault(surah_num, []).append(url)

    result: dict[int, str] = {}
    for num, urls in surah_map.items():
        english = [u for u in urls if "-Al-" in u or "-al-" in u]
        result[num] = english[0] if english else urls[-1]

    return result


def fetch_sitemap_category_urls() -> dict[int, str]:
    """Fetch sitemap and build surah_number → category_url mapping, with disk cache."""
    cache_path = CACHE_DIR / "sitemap_categories.json"
    if cache_path.exists():
        return {int(k): v for k, v in json.loads(cache_path.read_text()).items()}

    warnings.filterwarnings("ignore")
    resp = requests.get(NABULSI_SITEMAP_URL, timeout=30)
    resp.raise_for_status()
    result = parse_category_urls_from_sitemap(resp.content)

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    return result
