"""Pipeline configuration constants and paths."""

from pathlib import Path

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


# Lazy-loaded mapping (delegates to sitemap module)
_SITEMAP_CATEGORY_URLS: dict[int, str] | None = None


def get_sitemap_category_url(surah_number: int) -> str | None:
    """Get the category URL for a surah from the sitemap."""
    global _SITEMAP_CATEGORY_URLS
    if _SITEMAP_CATEGORY_URLS is None:
        from src.tafsir.sitemap import fetch_sitemap_category_urls
        _SITEMAP_CATEGORY_URLS = fetch_sitemap_category_urls()
    return _SITEMAP_CATEGORY_URLS.get(surah_number)
