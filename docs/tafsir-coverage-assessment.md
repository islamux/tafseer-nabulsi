# Tafsir Coverage Assessment — Opinion & Decision Record

> Reference answer to `docs/todo.md` ("make a plan to complete the missing ayahs and tafseer").
> Date: 2026-07-16 · Branch: `fix/tafsir-coverage-gaps`
> Execution detail: see [`tafsir-coverage-plan.md`](./tafsir-coverage-plan.md)

---

## TL;DR — The verdict

**The "missing ayahs and tafseer" are not missing source content. They are a broken data pipeline.**

Nabulsi's complete tafsir exists site-wide (confirmed via the live sitemap). The app shows
only **7.5 %** coverage because the scraper fails for most surahs, not because the scholarship
is absent. Fixing two pipeline bugs will recover the vast majority; only a small residual will
need fallback sources.

---

## Measured state (from `web/public/data/_report.json`)

| Metric | Value |
|---|---|
| Coverage | **7.5 %** (467 / 6,236 ayahs) |
| Surahs with **zero** tafsir | **95 / 114** |
| Pattern | whole contiguous blocks at exactly 0 % (surahs 8–48, …); only short Juz ʿAmma surahs + Al-Kahf survived |

---

## Why this happened (two root causes, both in the pipeline)

### 1. Sitemap encoding bug — primary, explains the 95 dead surahs

`pipeline/src/config.py:72` reads the sitemap via `requests.text`, which defaults to Latin-1
when no charset is declared. The sitemap is UTF-8, so **Arabic** category URLs become mojibake
and return empty stub pages:

```
correct : /category/(008) سورة الأنفال24
fetched : /category/(008)Ø³ÙØ±Ø©-Ø§ÙØ£ÙÙØ§Ù   → HTTP 200, 0 story links
```

Only English-named URLs (`(018)-Al-Kahf1662`) escaped. **Proven live:** decoding as UTF-8
makes **all 114/114** surahs resolve; previously-dead surahs then return real tafsir lessons
(surah 8 → 8 tafsir links, surah 9 → 14, surah 36 → 11).

### 2. Category pages are AJAX-paginated — blocks high coverage even after fix #1

`scraper.py:37-62` scrapes one server-rendered category page, but nabulsi.co renders only
~7–14 lessons behind an "إظهار المزيد من الدروس" button. What's server-rendered is mostly
empty thumbnails and **cross-surah** "related" lessons. No `/page/N/` to follow.

**Reliable source = the sitemap:** `sitemap.xml` lists **12,792 `/story/` URLs** (the full
content set). Fix = fetch them (disk-cached, one-time ~5 h), keep titles containing تفسير,
and bucket per-surah by each story's self-declared category.

---

## Secondary gaps (within-surah granularity)

- **`parse_ayah_range`** (`lesson_parser.py`) misses edge cases: spaced en-dash
  (`1 – 8`), "part" notation (`2-2`).
- **Membership filter** (`main.py:65`, `surah_name in ...`) is fragile; should parse the
  story's `(NNN)` category prefix instead.

## Tooling gaps that made this hard to see

- Coverage report truncates gaps to the first 50 (`builder.py:97`) — can't plan 5,769.
- Pipeline `output/` + `.cache/` are gitignored & uncommitted → build not reproducible.
- No per-surah logging of "stories found / matched / dropped / why".
- No automated `pipeline/output → web/public/data` sync.

---

## What I recommend (summary)

1. **Phase 1 — encoding fix** (~15 min): UTF-8 sitemap decode + test. Immediate floor raise.
2. **Phase 2 — sitemap-driven discovery**: fetch all stories once, bucket by self-declared
   category. The change that takes coverage from ~token to near-complete.
3. **Phase 3 — parsing/matching hardening**, using the real title corpus from Phase 2.
4. **Phase 4 — rebuild + full report + wire to web** (remove `gaps[:50]`, add sync step).
5. **Phase 5 — residual gaps**: ayahs Nabulsi groups into wide ranges inherit the covering
   lesson; any truly-missing surah falls back to the PDF sources in
   [`tafseer_nabulsi_report.md`](./tafseer_nabulsi_report.md).

Full file:line targets and verification signals: **[`tafsir-coverage-plan.md`](./tafsir-coverage-plan.md)**.

---

## Risks to flag

- First full fetch ≈ 5 h (one-time, disk-cached). Optional polite concurrency can cut this.
- Secure redistribution permission from the Nabulsi encyclopedia before shipping full text
  (per `tafseer_nabulsi_report.md` §3.4).
