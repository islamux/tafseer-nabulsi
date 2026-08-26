# Pipeline Subsystem Findings (Task 3)

Scope: read-only review of `pipeline/src/**` (14 substantive modules, ~1,100 LOC) at commit `43ed46d`, branch `audit/full-project-review`.
IDs: `PIP-001`+. Severity: Critical / High / Medium / Low. Effort: S < 1h, M = hours, L = days.

### PIP-001 | High | bugs | S
- **Location:** `pipeline/src/merge/builder.py:95-98`
- **Evidence:**
  ```python
  for i, s in enumerate(surahs_data, 1):
      index.append({
          "surah_id": i,
          "name": SURAH_NAMES[i - 1],
  ```
- **Why it matters:** `_index.json` entries are numbered by list position, not by `s["surah_id"]`. Any partial build produces a gapped `surahs_data` (main.py:156-162 only loads surah files that exist), so every entry after the first gap is mislabeled: e.g. running `--surah 2` on a fresh output dir writes one index entry `{"surah_id": 1, "name": "الفاتحة", "ayah_count": 286}` — Al-Baqarah's data published as Al-Fatiha. All downstream consumers of `_index.json` receive wrong names/counts.
- **Suggested fix:** Key each index entry off `s["surah_id"]` (`"surah_id": s["surah_id"], "name": s.get("name", SURAH_NAMES[s["surah_id"] - 1])`) instead of the enumerate counter, and log a warning when gaps are detected.

### PIP-002 | High | bugs | S
- **Location:** `pipeline/src/main.py:41-45`
- **Evidence:**
  ```python
      try:
          cat_html = fetch_page(cat_info["category_url"])
      except Exception as e:
          logger.warning("  Failed to fetch category page for surah %d: %s", surah_number, e)
          return []
  ```
- **Why it matters:** A transient category-page fetch failure yields `stories == []`, yet `build_surah` (main.py:74-99) proceeds, saves a valid-looking `{n}.json` with empty `tafsir_long` for every ayah, and returns `data` — so main counts it a success (exit code 0). Worse, `--resume` (main.py:132-133) skips any existing `{n}.json`, so the empty-tafsir surah is permanently baked in and never retried.
- **Suggested fix:** Distinguish "fetched but genuinely no lessons" from "fetch failed": return `None`/raise on fetch failure so the surah lands in `failed`; have `--resume` treat zero-tafsir surahs as suspect (re-check or require an explicit keep-file).

### PIP-003 | High | bugs | S
- **Location:** `pipeline/src/main.py:87-88`
- **Evidence:**
  ```python
              entry = process_lesson(result["title"], result["body"])
              if entry.ayah_numbers:
                  tafsir_entries.append(entry)
  ```
- **Why it matters:** Any lesson whose title doesn't match `lesson_parser` regexes (or whose range is reversed, e.g. `الآيتان 26-25` → `range(26, 26)` = `[]` at lesson_parser.py:37) produces `ayah_numbers == []` and is silently discarded — no log, no counter. Real tafsir content vanishes from the dataset while coverage reports make the gaps look organic.
- **Suggested fix:** Log a warning including the raw title whenever `entry.ayah_numbers` is empty; optionally collect them into the build report under an `unparsed_titles` key.

### PIP-004 | High | bugs | S
- **Location:** `pipeline/src/tafsir/scraper.py:70-73`
- **Evidence:**
  ```python
      try:
          html = fetch_page(url)
      except Exception:
          return None
  ```
  consumed by `main.py:83-84`: `if not result: continue`
- **Why it matters:** After retries are exhausted (or on any extraction error), the story page is dropped with zero logging — the exception is swallowed and the caller silently skips. Combined with PIP-002's resume behavior, network blips during long runs permanently remove tafsir pages from output with no trace to investigate.
- **Suggested fix:** Log the URL and exception (`logger.warning("Failed story page %s: %s", url, e)`) before returning `None`, and aggregate failed URLs into the report.

### PIP-005 | High | bugs | M
- **Location:** `pipeline/src/merge/builder.py:71-77`
- **Evidence:**
  ```python
        lo = min(entry.ayah_numbers)
        hi = max(entry.ayah_numbers)
        midpoint = (lo + hi) / 2
        distance = abs(ayah_number - midpoint)
        if distance < best_distance:
  ```
- **Why it matters:** `_find_nearest_range` (used at builder.py:32-35 for ayahs with no direct tafsir) has no distance cap: in a long surah, ayah 250 can inherit commentary written for ayahs 1–3 simply because it's the nearest range. The output schema has no provenance flag, so the web UI presents unrelated commentary as that ayah's tafsir — wrong religious content attribution.
- **Suggested fix:** Cap inheritance distance (e.g. within ±N ayahs of the range edge, or inside `[lo - k, hi + k]`), and add an explicit `"tafsir_inherited": true/false` field so clients can distinguish inherited from direct tafsir.

### PIP-006 | Medium | security | S
- **Location:** `pipeline/src/utils/cache.py:19`
- **Evidence:**
  ```python
            data = pickle.loads(path.read_bytes())
  ```
- **Why it matters:** HTTP response bodies are persisted via `pickle.dumps` (cache.py:30) and deserialized with `pickle.loads`. Pickle is an arbitrary-code-execution vector if a cache file is tampered with or corrupted maliciously; the payload is just `{url, body}` strings, which need no pickle. The brief's unsafe-deserialization dimension applies even though the threat actor here is local-only.
- **Suggested fix:** Store JSON (`{"url": ..., "body": ..., "fetched_at": ...}`) instead of pickle; catch `json.JSONDecodeError` on read and delete bad entries.

### PIP-007 | Medium | bugs | M
- **Location:** `pipeline/src/utils/cache.py:17-23`
- **Evidence:**
  ```python
      if path.exists():
          try:
              data = pickle.loads(path.read_bytes())
              return data.get("body")
  ```
- **Why it matters:** The cache has no TTL or validity check, and `set_cached` stores any HTTP-200 body unconditionally (scraper.py:26) — including empty bodies, consent/challenge pages, or soft-error HTML. Once poisoned, every future run reuses the bad body forever; the sitemap cache (config.py:91-93) never expires either. Re-runs cannot recover without manually deleting `.cache/`.
- **Suggested fix:** Persist `fetched_at` with each entry and expire after N days; skip caching bodies below a minimum length or lacking expected markers (e.g. `<html`); add `--force-refresh`.

### PIP-008 | Medium | bugs | S
- **Location:** `pipeline/src/tafsir/content_extractor.py:59-60`
- **Evidence:**
  ```python
      text = re.sub(r"\s+", " ", text)
      text = re.sub(r"\n\s*\n", "\n", text)
  ```
- **Why it matters:** The first regex collapses all whitespace including `\n`, so the second regex can never match (dead code), and the paragraph structure deliberately produced by `get_text(separator="\n")` (scraper.py:96) is destroyed — every `tafsir_long` becomes a single-line blob, losing paragraph breaks in published content.
- **Suggested fix:** Collapse horizontal whitespace per line first: `text = re.sub(r"[^\S\n]+", " ", text)`, then squeeze 3+ newlines: `re.sub(r"\n{3,}", "\n\n", text.strip())`.

### PIP-009 | Medium | bugs | M
- **Location:** `pipeline/src/tafsir/category_index.py:92-102`
- **Evidence:**
  ```python
      while True:
          chunks, no_more = fetch_page(category_id, page)
  ```
  with the live fetcher doing a bare `requests.get(...)` (category_index.py:112-118) — no retry.
- **Why it matters:** Pagination walk is unbounded (terminates only when the endpoint signals `no_more`) and unguarded: a server that keeps returning `data[1] = 0` loops forever; a single transient network error mid-walk raises through `_collect_surah_stories` (which only guards the initial category fetch, main.py:41-45) and aborts the entire surah even though earlier pages were parsed. Unlike `scraper.fetch_page`, this path has no retry/backoff.
- **Suggested fix:** Add a `max_pages` safety bound; wrap per-page fetches with the same retry/backoff used elsewhere; on page failure, log and return stories collected so far instead of failing the whole surah.

### PIP-010 | Medium | bugs | S
- **Location:** `pipeline/src/media/mapper.py:37-38`
- **Evidence:**
  ```python
              surah_id = int(row[0].strip())
              ayah_number = int(row[1].strip())
  ```
- **Why it matters:** A single malformed row (e.g. `1, "١".encode() garbage`, trailing comma producing an empty field) raises `ValueError` that propagates up through `build_surah_json` → `build_surah` → main's per-surah handler, failing the whole surah build over one bad CSV line. No validation gap handling despite this being hand-maintained input.
- **Suggested fix:** Wrap the row parse in try/except, log-and-skip invalid rows (optionally counting them in the return).

### PIP-011 | Medium | solid | M
- **Location:** `pipeline/src/config.py:6-8`
- **Evidence:**
  ```python
  import requests
  import warnings
  from bs4 import BeautifulSoup
  ```
  plus `_fetch_sitemap_category_urls()` performing a live GET (config.py:96).
- **Why it matters:** The configuration module performs network I/O and HTML/XML parsing, and lazily triggers an HTTP fetch from `get_sitemap_category_url` via global state (config.py:109-117). This inverts dependencies — importing constants can reach the network — makes config untestable without mocking, and couples every consumer (e.g. `surah_index.py`) to requests/bs4.
- **Suggested fix:** Move sitemap fetching/parsing/caching into `tafsir/surah_index.py` (or a `discovery.py`); keep `config.py` pure constants and paths.

### PIP-012 | Medium | clean-code | S
- **Location:** `pipeline/src/tafsir/scraper.py:46`
- **Evidence:**
  ```python
      for link in soup.select("a[href*='/story/']"):
  ```
  duplicated as `category_index.py:61`: `for a in soup.select("a[href*='/story/']"):` — plus dead helpers `extract_lesson_links` (scraper.py:115), `extract_lesson_content` (scraper.py:140): grep shows no callers anywhere in `src/` or `tests/`.
- **Why it matters:** Two near-identical link extractors exist (`extract_story_links_from_category` vs the superior `parse_stories_from_html` which also upgrades empty titles); the production flow uses only the category_index version. Duplicates drift — a selector fix applied to one copy won't reach the other — and ~70 lines of dead code mislead readers about the real pipeline path.
- **Suggested fix:** Delete `extract_story_links_from_category`, `extract_lesson_links`, and `extract_lesson_content`; keep `parse_stories_from_html` as the canonical extractor.

### PIP-013 | Medium | improvements | S
- **Location:** `pipeline/src/merge/builder.py:86-87`
- **Evidence:**
  ```python
      with open(out_path, "w", encoding="utf-8") as f:
          json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
  ```
  combined with resume detection `main.py:132`: `existing = {int(f.stem) for f in OUTPUT_DIR.glob("*.json") if f.stem.isdigit()}`
- **Why it matters:** Writes are non-atomic: a crash/interrupt mid-write leaves a truncated `{n}.json`, and `--resume` treats mere existence as success — the truncated file is then loaded into `_index.json`/report on the next run (main.py:160 `json.loads(f.read_text())` would crash, or a partial-but-valid-prefix could ship). Merge-step idempotency relies entirely on file presence, not integrity.
- **Suggested fix:** Write to a temp file and `os.replace()` atomically; make `--resume` validate each candidate (`json.load` succeeds, `len(ayahs)` matches expectations) before skipping.

### PIP-014 | Low | bugs | S
- **Location:** `pipeline/src/tafsir/category_index.py:47`
- **Evidence:**
  ```python
          start_page=start_page,
  ```
  never consumed: `collect_all_stories` hardcodes `page = 1` (category_index.py:91), and the AJAX param reuses the name with different semantics: `params={"last_id": str(page), ...}` (category_index.py:114).
- **Why it matters:** `PaginationInputs.start_page` is parsed from the hidden `#last_id` input but ignored by the pagination loop, and a parameter named `last_id` (post-id continuation semantics) receives a page counter. If the endpoint expects a post id, paging may rely entirely on dedupe and the `data[1]` termination flag; the dead field hides the mismatch.
- **Suggested fix:** Seed the loop with `pagination.start_page` (or delete the field); verify against the live endpoint whether `last_id` expects page numbers or post ids and rename accordingly.

### PIP-015 | Low | bugs | S
- **Location:** `pipeline/src/tafsir/scraper.py:34`
- **Evidence:**
  ```python
      raise RuntimeError(f"Failed to fetch {url} after {retries} retries")
  ```
- **Why it matters:** Unreachable in normal flow — the loop either returns or re-raises on the final attempt (scraper.py:29-30). It only executes when `retries=0`, where its message ("after 0 retries") is misleading dead-code defense. Also note the retry loop does correctly apply rate limiting between attempts (scraper.py:31-32), so no limiter-bypass finding there.
- **Suggested fix:** Delete the line; validate `retries >= 1` up front if the parameter remains configurable.

### PIP-016 | Low | clean-code | S
- **Location:** `pipeline/src/quran/fetcher.py:11`
- **Evidence:**
  ```python
  ALQURAN_CLOUD_URL = "https://api.alquran.cloud/v1/quran/quran-uthmani"
  ```
  duplicating unused `config.py:18`: `ALQURAN_CLOUD_API = "https://api.alquran.cloud/v1/quran/quran-uthmani"`; also `clear_cache()` (cache.py:33-40) has no callers and no CLI flag.
- **Why it matters:** Two sources of truth for the Quran API URL (the config constant is dead), and the cache-clearing utility is unreachable from the CLI — operators must hand-delete `.cache/`.
- **Suggested fix:** Import the constant from config (delete the local copy) and expose `--clear-cache` in main's argparse, or remove `clear_cache`.

### PIP-017 | Low | bugs | S
- **Location:** `pipeline/src/main.py:117`
- **Evidence:**
  ```python
          report = json.loads(report_path.read_text())
  ```
  same pattern at main.py:160 and config.py:93 — reads omit `encoding=` while all writers force UTF-8 (e.g. builder.py:86).
- **Why it matters:** `Path.read_text()` without encoding uses the locale preferred encoding; on Windows (cp1252) Arabic surah names in cached/report JSON decode as mojibake, asymmetrically corrupting data that was written correctly.
- **Suggested fix:** Add `encoding="utf-8"` to every `read_text()` call.

### PIP-018 | Low | clean-code | S
- **Location:** `pipeline/src/config.py:95`
- **Evidence:**
  ```python
      warnings.filterwarnings("ignore")
  ```
- **Why it matters:** Globally suppresses every warning process-wide as a hidden side effect of fetching the sitemap — library deprecations and real runtime warnings vanish for the rest of the run, not just bs4/lxml noise during this one call.
- **Suggested fix:** Scope it: `with warnings.catch_warnings(): warnings.simplefilter("ignore", category=<specific>)` around the BeautifulSoup parse only.

### PIP-019 | Low | improvements | S
- **Location:** `pipeline/src/merge/builder.py:18`
- **Evidence:**
  ```python
      media_map = load_media_csv()
  ```
- **Why it matters:** The media CSV is re-read and re-parsed from disk for every surah — 114 identical file reads per full run — because it sits inside `build_surah_json` instead of being loaded once by the orchestrator.
- **Suggested fix:** Load once in `main()` and pass `media_map` into `build_surah_json(surah, tafsir_entries, surah_id, media_map)`.

### PIP-020 | Low | bugs | S
- **Location:** `pipeline/src/main.py:129-130`
- **Evidence:**
  ```python
      if args.surah:
          surah_numbers = [args.surah]
  ```
- **Why it matters:** No bounds check on `--surah`: `--surah 0` makes `SURAH_NAMES[surah_number - 1]` (main.py:64) silently resolve via negative indexing to `"ال الناس"` (config.py:50) and logs nonsense names; `--surah 999` fails later with a less obvious error.
- **Suggested fix:** Validate immediately: `if not 1 <= args.surah <= SURAH_COUNT: parser.error("--surah must be 1-114")`.

### PIP-021 | Low | clean-code | S
- **Location:** `pipeline/src/tafsir/scraper.py:23`
- **Evidence:**
  ```python
              resp = requests.get(url, timeout=30)
  ```
  vs the custom UA defined at category_index.py:21 (`DEFAULT_HEADERS = {"User-Agent": "tafsir-pipeline/0.1 (+contact)"}`) and sent only by the AJAX fetcher (category_index.py:115).
- **Why it matters:** Inconsistent client identity: the main HTML scraper sends the default `python-requests/x` UA (more likely to be blocked/rate-limited by the origin) while only the pagination endpoint identifies itself; politeness configuration is split across modules.
- **Suggested fix:** Hoist `DEFAULT_HEADERS` into a shared http util (alongside retry/backoff helpers) and send it from both request paths.

---

## Verification appendix (Critical/High)

| ID | Re-checked citation | Outcome |
|----|---------------------|---------|
| PIP-001 | `builder.py:95-98` enumerate + positional `surah_id`/`SURAH_NAMES[i-1]`; gapped input confirmed reachable via `main.py:132-133` (existence-only set) and `main.py:156-162` (loads only files that exist) | Verified: yes |
| PIP-002 | `main.py:41-45` returns `[]` on fetch failure; `main.py:74-99` proceeds to save + return data; `main.py:144-148` counts non-None data as success; resume skips existing files | Verified: yes |
| PIP-003 | `main.py:87-88` drop branch with no else/log; `lesson_parser.py:37,42` `range(start, end+1)` yields `[]` on reversed ranges; fallback `return []` at lesson_parser.py:61 | Verified: yes |
| PIP-004 | `scraper.py:70-73` bare `except Exception: return None`; sole caller `main.py:83-84` `continue`s on falsy result with no logging | Verified: yes |
| PIP-005 | `builder.py:71-77` midpoint distance with no cap; inherited branch at `builder.py:32-35`; no provenance field in output dict (`builder.py:42-48`) | Verified: yes |

No Critical findings. False positives investigated and dropped during review: rate-limiter bypass on retry (disproven — backoff waits via `wait_if_needed`, scraper.py:31-32); path traversal in cache/output writes (filenames are sha256 hexdigests / int-guarded); hardcoded secrets (none found); Arabic-Indic digit parsing failure (Python `\d` matches Unicode digits); off-by-one in surah loops (`range(1, SURAH_COUNT + 1)` and `-1` indexing consistent throughout).
