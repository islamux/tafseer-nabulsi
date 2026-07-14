"""Surah index: maps surah numbers to nabulsi.com category URLs from sitemap."""

from src.config import SURAH_NAMES, get_sitemap_category_url


def get_surah_category_urls() -> dict[int, dict]:
    """Return a dict mapping surah_number → {name, category_url}.

    Uses sitemap-parsed URLs for accurate category page links.
    Falls back to constructed URLs if sitemap lookup fails.
    """
    result = {}
    for i, name in enumerate(SURAH_NAMES):
        num = i + 1
        url = get_sitemap_category_url(num)
        if not url:
            # Fallback: construct from slug
            from src.config import NABULSI_CATEGORY_URL, SURAH_SLUGS
            url = NABULSI_CATEGORY_URL.format(slug=SURAH_SLUGS[num])
        result[num] = {
            "name": name,
            "category_url": url,
        }
    return result
