"""Pipeline configuration constants and paths."""

import re
from pathlib import Path

import requests
import warnings
from bs4 import BeautifulSoup

# --- Paths ---
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PIPELINE_DIR = PROJECT_ROOT
OUTPUT_DIR = PIPELINE_DIR / "output"
CACHE_DIR = PIPELINE_DIR / ".cache"
MEDIA_CSV_PATH = PIPELINE_DIR / "media.csv"

# --- AlQuran.cloud ---
ALQURAN_CLOUD_API = "https://api.alquran.cloud/v1/quran/quran-uthmani"

# --- nabulsi.com ---
NABULSI_BASE_URL = "https://www.nabulsi.com"
NABULSI_CATEGORY_URL = NABULSI_BASE_URL + "/category/{slug}"
NABULSI_STORY_URL = NABULSI_BASE_URL + "/story/{slug}"
NABULSI_SITEMAP_URL = NABULSI_BASE_URL + "/sitemap.xml"

# --- Rate limiting ---
REQUEST_DELAY_SECONDS = 1.5
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2

# --- Quran surah metadata ---
SURAH_COUNT = 114
# fmt: off
SURAH_NAMES = [
    "الفاتحة", "البقرة", "آل عمران", "النساء", "المائدة", "الأنعام", "الأعراف",
    "الأنفال", "التوبة", "يونس", "هود", "يوسف", "الرعد", "إبراهيم", "الحجر",
    "النحل", "الإسراء", "الكهف", "مريم", "طه", "الأنبياء", "الحج", "المؤمنون",
    "النور", "الفرقان", "الشعراء", "النمل", "القصص", "العنكبوت", "الروم", "لقمان",
    "السجدة", "الأحزاب", "سبأ", "فاطر", "يس", "الصافات", "ص", "الزمر", "غافر",
    "فصلت", "الشورى", "الزخرف", "الدخان", "الجاثية", "الأحقاف", "محمد", "الفتح",
    "الحجرات", "ق", "الذاريات", "الطور", "النجم", "القمر", "الرحمن", "الواقعة",
    "الحديد", "المجادلة", "الحشر", "الممتحنة", "الصف", "الجمعة", "المنافقون",
    "التغابن", "الطلاق", "التحريم", "الملك", "القلم", "الحاقة", "المعارج",
    "نوح", "الجن", "المزمل", "المدثر", "القيامة", "الإنسان", "المرسلات",
    "النبأ", "النازعات", "عبس", "التكوير", "الإنفطار", "المطففين", "الإنشقاق",
    "البروج", "الطارق", "الأعلى", "الغاشية", "الفجر", "البلد", "الشمس",
    "الليل", "الضحى", "الشرح", "التين", "العلق", "القدر", "البينة",
    "الزلزلة", "العاديات", "القارعة", "التكاثر", "العصر", "الهمزة",
    "الفيل", "قريش", "الماعون", "الكوثر", "الكافرون", "النصر", "المسد",
    "الإخلاص", "الفلق", "ال الناس",
]
# fmt: on

# Surah name → category URL slug mapping (parenthesized number + name)
SURAH_SLUGS = {
    i + 1: f"({str(i + 1).zfill(3)}) سورة {name}" for i, name in enumerate(SURAH_NAMES)
}


def _fetch_sitemap_category_urls() -> dict[int, str]:
    """Fetch sitemap and build surah_number → category_url mapping.

    Parses the XML sitemap to find category URLs for each surah.
    Returns dict mapping surah number (1-114) to the best category URL.
    """
    cache_path = CACHE_DIR / "sitemap_categories.json"
    if cache_path.exists():
        import json
        return {int(k): v for k, v in json.loads(cache_path.read_text()).items()}

    warnings.filterwarnings("ignore")
    resp = requests.get(NABULSI_SITEMAP_URL, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "xml")
    all_urls = [loc.text.strip() for loc in soup.find_all("loc")]

    surah_map: dict[int, list[str]] = {}
    for url in all_urls:
        m = re.search(r"/category/\((\d{3})\)", url)
        if m:
            surah_num = int(m.group(1))
            if 1 <= surah_num <= 114:
                if surah_num not in surah_map:
                    surah_map[surah_num] = []
                surah_map[surah_num].append(url)

    # Prefer English-named URLs, then the one ending with a number (ID)
    result: dict[int, str] = {}
    for num, urls in surah_map.items():
        # Prefer English names
        english = [u for u in urls if "-Al-" in u or "-al-" in u]
        if english:
            result[num] = english[0]
        else:
            # Pick the last one (usually the canonical version)
            result[num] = urls[-1]

    # Cache for later runs
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    import json
    cache_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))

    return result


# Lazy-loaded mapping
_SITEMAP_CATEGORY_URLS: dict[int, str] | None = None


def get_sitemap_category_url(surah_number: int) -> str | None:
    """Get the category URL for a surah from the sitemap."""
    global _SITEMAP_CATEGORY_URLS
    if _SITEMAP_CATEGORY_URLS is None:
        _SITEMAP_CATEGORY_URLS = _fetch_sitemap_category_urls()
    return _SITEMAP_CATEGORY_URLS.get(surah_number)
