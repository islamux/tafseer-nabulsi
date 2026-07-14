# Tafsir Nabulsi — Data Pipeline

Generates per-surah JSON files containing Quranic text, Nabulsi's tafsir, and media links.

## Setup

```bash
cd pipeline
uv sync
```

## Usage

```bash
# Build all 114 surahs
uv run python -m src.main --all

# Build a single surah (for testing)
uv run python -m src.main --surah 1

# Resume failed surahs
uv run python -m src.main --resume

# View build report
uv run python -m src.main --report
```

## Media URLs

To add audio/video links, create `media.csv` (see `media.csv.example`):
```
surah_id,ayah_number,audio_url,video_url
1,1,https://example.com/audio/1-1.mp3,https://youtube.com/watch?v=xxx
```

## Output

- `output/1.json` … `output/114.json` — per-surah data
- `output/_index.json` — surah metadata index
- `output/_report.json` — coverage report

## Tests

```bash
uv run pytest tests/
```

## Architecture

```
src/
├── main.py              CLI entry point
├── config.py            Constants, URLs, surah metadata
├── quran/               Quran text from Tanzil.net
│   ├── fetcher.py       Download + cache XML
│   └── parser.py        XML → structured data
├── tafsir/              Tafsir from nabulsi.com
│   ├── surah_index.py   Surah → category URL map
│   ├── lesson_parser.py Arabic title → ayah range
│   ├── scraper.py       Polite fetch + disk cache
│   └── content_extractor.py  HTML → clean text
├── media/               Media URL mapping
│   └── mapper.py        CSV → lookup table
├── merge/               Data merging
│   └── builder.py       Final JSON assembly
└── utils/               Shared utilities
    ├── cache.py         Disk-based HTTP cache
    ├── rate_limit.py    1 req/sec rate limiter
    └── logging_setup.py Structured logging
```
