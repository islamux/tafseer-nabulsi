# Tafsir Coverage Plan — Complete Missing Ayahs & Tafseer

Diagnosis performed on the live `nabulsi.co` sitemap and the deployed data in `web/public/data/`.
Branch: `fix/tafsir-coverage-gaps`. Execution order: **Phase 1 → 2 → 3 → 4 → 5**.

---

## 0. Current State (measured)

Source: `web/public/data/_report.json` + per-surah JSON analysis.

| Metric | Value |
|---|---|
| Total ayahs | 6,236 |
| Ayahs with tafsir | 467 |
| Ayahs **without** tafsir | 5,769 |
| Coverage | **7.5 %** |
| Surahs with **zero** tafsir | **95 / 114** |

Covered surahs are almost entirely short ones in Juz ʿAmma (78–114) plus Al-Kahf (18) —
i.e. those whose category URLs happened to resolve cleanly. Whole contiguous blocks
(surahs 8–48, etc.) sit at exactly 0 %.

---

## 1. Root-Cause Analysis (evidence-based)

Three distinct failure modes, in priority order.

### RC-1 — Sitemap encoding bug  *(PRIMARY — explains 95 zero-coverage surahs)*

`pipeline/src/config.py:72-75` reads the sitemap via `requests.get(...).text`. When the
response's `Content-Type` lacks an explicit charset, `requests` defaults `text/*` bodies to
**ISO-8859-1** (per HTTP/1.1). The sitemap is UTF-8 (mandated by the sitemaps protocol), so
every **Arabic** category URL is mis-decoded into mojibake:

```
correct : /category/(008) سورة الأنفال24
fetched : /category/(008)Ø³ÙØ±Ø©-Ø§ÙØ£ÙÙØ§Ù   ← UTF-8 bytes read as Latin-1
```

The mojibake URL still returns HTTP 200, but it is a ~70 KB stub page containing **zero**
`/story/` links → zero tafsir entries for that surah. Only surahs whose sitemap URL is
**pure ASCII / English** (e.g. `(018)-Al-Kahf1662`) escaped the bug.

**Proof (live probe, this session):** decoding the sitemap as UTF-8 makes **all 114/114**
surahs resolve to a clean category URL. Probing previously-dead surahs with their corrected
URL returns real pages with tafsir lessons:

| Surah | Buggy URL result | Fixed (UTF-8) URL result |
|---|---|---|
| 8 الأنفال | 0 story links | 30 `/story/`, 8 with تفسير |
| 9 التوبة | 0 | 48 `/story/`, 14 تفسير |
| 36 يس | 0 | 39 `/story/`, 11 تفسير |

### RC-2 — Category pages are AJAX-paginated  *(blocks high coverage even after RC-1)*

`extract_story_links_from_category` (`scraper.py:37-62`) scrapes only the server-rendered
HTML of a single category page. But nabulsi.co category pages render a small initial batch
(~7–14 lesson cards) behind an **"إظهار المزيد من الدروس"** (Show more lessons) button —
a JS/AJAX "load more". What is server-rendered is mostly:

- empty-title thumbnail links, and
- **cross-surah** "related/recent" lessons (e.g. سورة النجم and سورة الكهف lessons appear
  on the الأنفال category page).

Result: even with the encoding fix, per-surah lesson yield from the category page is small,
noisy, and non-deterministic (surah 8 returned 8 tafsir links in one run, 2 in another).
There is **no** `/page/N/` pagination to follow.

**The reliable index is the sitemap itself:** `https://www.nabulsi.com/sitemap.xml` contains
**12,792 `/story/` URLs** — the complete content set. Each story page declares its own
category (already extracted by `fetch_story_page` → `category_name`), so lessons can be
bucketed per-surah from the story's self-declared metadata, not from a category listing.

### RC-3 — Ayah-range parsing & matching gaps  *(SECONDARY — within-surah granularity)*

Even for covered surahs, individual ayahs are missed. Two sub-causes:

- **`parse_ayah_range`** (`lesson_parser.py:14-51`) handles `[ال]آية/آيتان/آيات N[-M]` but
  the live titles show edge cases: en-dash with spaces (`تفسير الآيات 1 – 8`), the `الأيات`
  spelling (with أ not آ — already covered), and "part" notation (`تفسير الأيات 2-2` =
  part 2 of 2, not ayahs 2→2). Mis-parsed titles drop coverage silently.
- **Membership filter** (`main.py:65`): `surah_name in cat_name or surah_name in title`.
  Fragile for surahs whose names collide (e.g. الفاتحة vs a title mentioning another) and
  for the cross-surah noise from RC-2.

### Tooling gaps (block planning & reproducibility)

| ID | Issue | Location |
|---|---|---|
| T1 | Coverage report truncates gaps to first 50 (`gaps[:50]`) — cannot plan 5,769 | `builder.py:97` |
| T2 | Pipeline `output/` and `.cache/` are gitignored & uncommitted — build is not reproducible | `pipeline/.gitignore` |
| T3 | No per-surah diagnostic logging (stories found / matched / dropped / why) | `main.py:build_surah` |
| T4 | No automated link from `pipeline/output/` → `web/public/data/` (manual copy) | — |

---

## 2. The Plan

### Phase 1 — Fix the encoding bug (quick win, ~15 min)

Unblocks category resolution for all 114 surahs. Independent of the larger RC-2 rework, so
ship it first to immediately raise the floor.

| ID | Change | Location |
|---|---|---|
| P1.1 | Decode sitemap as UTF-8: use `resp.content.decode("utf-8")` (or set `resp.encoding = "utf-8"` before `.text`) | `config.py:72-75` |
| P1.2 | Invalidate the stale `.cache/sitemap_categories.json` so it rebuilds cleanly (delete on first run; the loader checks existence) | `config.py:66-69` |
| P1.3 | Add a unit test feeding a UTF-8 sitemap fixture with Arabic + English category URLs, asserting all 114 resolve and none contain mojibake markers (`Ø`, `Ù`) | `pipeline/tests/` (new) |

### Phase 2 — Category-AJAX story discovery (the big fix)  *(revised after probing)*

> **Probe finding (2026-07-16):** nabulsi.co category pages expose a paginated AJAX
> endpoint — a `get-read-more-post-category` GET driven by hidden inputs
> (`#category_id`, `#last_id`, `#url`) on the category page. This yields a surah's
> **full** story list in a few lightweight calls. Verified on surah 8: 36 stories /
> 18 tafsir lessons in 3 batches. This replaces both the broken single-page scrape
> (RC-2) **and** the originally-planned 12,792-page sitemap sweep — ~100× cheaper,
> and surah assignment is implicit (one category = one surah), solving P2.3 for free.

| ID | Change | Location |
|---|---|---|
| P2.1 | New module `src/tafsir/category_index.py`: `extract_category_pagination_inputs(html)`, `parse_stories_from_html(html)`, `is_tafsir_title(title)`, and a pagination loop `collect_all_stories(category_id, fetcher)` (fetcher injected for testability) | new file |
| P2.2 | Refactor `build_surah`: fetch the (now UTF-8-correct) category page → read pagination inputs → `collect_all_stories` → keep `is_tafsir_title` → fetch each story page (disk-cached) → `process_lesson` | `main.py:28-83` |
| P2.3 | Surah assignment is implicit (stories come from that surah's own category). The fragile `surah_name in ...` substring test (`main.py:65`) is removed. | `main.py` |
| P2.4 | Keep the disk cache (`utils/cache.py`) — story pages are cached permanently; only the category AJAX calls repeat. First full run is now minutes, not hours. | `README.md` |

### Phase 3 — Harden ayah-range parsing & matching

Closes the within-surah granularity gaps (RC-3).

| ID | Change | Location |
|---|---|---|
| P3.1 | Extend `parse_ayah_range`: handle spaced en/em-dash (`1 – 8`), and a "part" notation (`N-M` where M is a part count, not an ayah) — distinguish by context | `lesson_parser.py` |
| P3.2 | Collect a corpus of real lesson titles (dump during Phase 2 fetch) and add table-driven tests for every observed format | `pipeline/tests/test_lesson_parser.py` |
| P3.3 | Replace substring membership with `(NNN)` category-prefix parsing (done in P2.3); keep a fallback only if prefix absent | `main.py` |

### Phase 4 — Rebuild, report, wire to web

| ID | Change | Location |
|---|---|---|
| P4.1 | Remove the `gaps[:50]` truncation; emit the **full** gap list (or per-surah gap counts) so the report is plannable | `builder.py:97` |
| P4.2 | Add per-surah diagnostics to the report: `stories_found`, `tafsir_matched`, `ayahs_covered`, `unparsed_titles[]` | `builder.py:generate_report`, `main.py` |
| P4.3 | Run `uv run python -m src.main --all`, verify coverage target (see §4), copy `pipeline/output/*.json` → `web/public/data/` | — |
| P4.4 | Add a `pipeline` → `web/public/data` copy/sync step (npm script or Make target) so rebuilds aren't manual | `package.json` / Makefile |

### Phase 5 — Residual genuine gaps

After Phases 1–4, the remaining gaps are ayahs Nabulsi does not dissect individually (he
groups them into wide ranges, e.g. one lesson covering ayahs 1–17).

| ID | Change |
|---|---|
| P5.1 | Strategy for range-grouped ayahs: an ayah with no own lesson inherits the body of the **nearest covering range** (already partially done in `builder.py:23`), with a UI badge like "covered by lesson on آيات 1–17" |
| P5.2 | If a surah still shows major gaps after Phase 2, fall back to the PDF sources listed in `docs/tafseer_nabulsi_report.md` (Archive.org / noor-book 852-page PDF) via a PDF→text extraction pass |
| P5.3 | Final coverage report; decide a ship threshold (e.g. ≥ 95 % of ayahs have tafsir, directly or via range inheritance) |

---

## 3. Execution Order & Dependencies

```
Phase 1 (encoding)  ──►  immediate floor raise, no blockers
Phase 2 (sitemap)   ──►  depends on nothing; supersedes category scraping (RC-2)
Phase 3 (parsing)   ──►  best done after Phase 2 produces a real title corpus
Phase 4 (rebuild)   ──►  depends on 1+2+3
Phase 5 (residual)  ──►  depends on 4's report to know what's left
```

## 4. Verification (how we know each phase worked)

| Phase | Success signal |
|---|---|
| 1 | `_fetch_sitemap_category_urls()` returns 114 URLs, **none** containing `Ø`/`Ù`; unit test green |
| 2 | `--report` shows ≥ ~70 % of surahs have `tafsir_matched > 0` (was 19/114) |
| 3 | `unparsed_titles[]` per surah drops to ~0 against the real title corpus |
| 4 | `coverage_pct` ≥ target; `web/public/data/_report.json` refreshed; app renders tafsir for previously-empty surahs (e.g. 8, 9, 36) |
| 5 | Ship threshold met; remaining gaps are documented as "range-inherited" or sourced |

## 5. Risks

- **First-run fetch time (~5 h for 12,792 pages).** Mitigation: disk cache (one-time),
  optional polite concurrency (P2.5).
- **`nabulsi.co` layout/encoding drift.** Mitigation: sitemap is the stable contract; story
  pages change less often than category AJAX widgets.
- **Rate limiting / blocking.** Mitigation: keep `REQUEST_DELAY_SECONDS`; cache aggressively.
- **Licensing:** per `docs/tafseer_nabulsi_report.md` §3.4, formal permission from the
  Nabulsi encyclopedia should be secured before public redistribution of full text.
