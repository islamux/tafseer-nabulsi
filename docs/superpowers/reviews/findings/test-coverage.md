# Test Coverage Gap Analysis (`test-coverage`)

Scope: read-only inventory and gap analysis of all test suites (`web/src/**/*.test.*`, `pipeline/tests/**`, `workers/tafsir-api/`) against all source modules. Branch: `audit/full-project-review`. Recorded: 2026-08-24.

Severity: Critical = no tests on data-integrity / auth / sync code · High = no tests on complex core logic with failure modes · Medium = weak/happy-path-only suites · Low = minor coverage gaps. Effort: S < 1h · M = hours · L = days.

---

## Inventory

### web/src/ — Tested vs Untested

| Module | Has test? | Test quality |
|--------|-----------|-------------|
| `utils/arabic.js` | `arabic.test.js` | Good — edge cases, diacritics, null/empty |
| `utils/tafsir.js` | `tafsir.test.js` | Good — empty, meta markers, splitting |
| `utils/quran.js` | None (10 LOC, 2 pure functions) | Low risk, trivial |
| `api/search.js` | `search.test.js` | Moderate — but uses undiacritized mocks (see WEB-003) |
| `api/data.js` | **None** | Untested: fetch timeout, caching, normalizeSurah |
| `api/worker.js` | **None** | Untested: device ID, all CRUD wrappers |
| `contexts/DataContext.jsx` | **None** | Untested: index load, progress sync, error state |
| `contexts/SearchContext.jsx` | **None** | Untested: lazy index build, dedup |
| `contexts/FavoritesContext.jsx` | `FavoritesContext.test.js` | Partial — `mergeFavorites` + serialization only; Provider/sync/effects untested |
| `contexts/ThemeContext.jsx` | `ThemeContext.test.js` | Weak — pure cycle function only; Provider/effects untested |
| `components/SurahView.jsx` | `SurahView.test.jsx` | Moderate — happy path only, mocks all contexts |
| `components/ErrorBoundary.jsx` | **None** | No tests for error boundary behavior |
| `components/SearchBar.jsx` | **None** | No tests for error/loading/empty states |
| `components/AyahCard.jsx` | None (presentational) | Low risk |
| `components/SurahList.jsx` | None (presentational) | Low risk |
| `components/Layout.jsx` | None (presentational) | Low risk |
| `components/ThemeToggle.jsx` | None (presentational) | Low risk |
| `components/TafsirText.jsx` | None (presentational) | Low risk |
| `components/NotFound.jsx` | None (presentational) | Low risk |
| `components/BismillahHeader.jsx` | None (presentational) | Low risk |
| `components/StateMessage.jsx` | None (presentational) | Low risk |
| `components/Spinner.jsx` | None (presentational) | Low risk |
| `App.jsx` | `App.integration.test.jsx`, `App.routing.test.jsx` | Moderate — happy path only |

### pipeline/tests/ — Tested vs Untested

| Module | Has test? | Test quality |
|--------|-----------|-------------|
| `merge/builder.py` | `test_builder.py` | Good — range inheritance, gaps, report |
| `tafsir/category_index.py` | `test_category_index.py` | Good — pagination, dedup, tafsir filter |
| `tafsir/lesson_parser.py` | `test_lesson_parser.py` | Good — edge cases, Arabic separators |
| `config.py` (parse_category_urls_from_sitemap) | `test_sitemap_parsing.py` | Good — mojibake regression |
| `tafsir/content_extractor.py` | **None** | Only `TafsirEntry` dataclass imported; `process_lesson`, `_extract_theme`, `_clean_text` untested |
| `tafsir/scraper.py` | **None** | Untested: HTML extraction, retry logic, fallback selectors |
| `tafsir/surah_index.py` | **None** | Untested: sitemap fallback logic |
| `media/mapper.py` | **None** | Untested: CSV parsing, malformed rows |
| `quran/parser.py` | **None** | Untested: JSON parsing, `get_surah_by_index` |
| `quran/fetcher.py` | **None** | Untested (network I/O, low testability) |
| `utils/rate_limit.py` | **None** | Untested |
| `utils/cache.py` | **None** | Untested |
| `utils/logging_setup.py` | **None** | Untested |
| `main.py` | **None** | Integration-level; untested |

### workers/tafsir-api/

| Module | Has test? |
|--------|-----------|
| `src/index.js` | **None** — zero test files exist in `workers/` |

---

## Findings

### TST-001 | Critical | test-coverage | S

- **Location:** `web/src/api/data.js`
- **Evidence:** No test file imports from `api/data.js`. The module implements `fetchJson` with abort timeout (`FETCH_TIMEOUT_MS = 10_000`), in-memory caching (`indexCache`, `surahCache`), and `normalizeSurah` which strips leading basmala for 112 of 114 surahs. None of these code paths are exercised by any test.
- **Why it matters:** A timeout regression or cache corruption bug would silently break surah loading for all users. The `normalizeSurah` logic (applying `stripLeadingBasmala` only when `hasSeparateBismillah(id)` is true) is a conditional that could silently double-strip or skip stripping, corrupting displayed Quran text — undetectable without tests.
- **Suggested fix:** Test `fetchJson` timeout behavior (mock `fetch` that never resolves → assert error message); test `fetchJson` on non-ok responses; test `loadIndex`/`loadSurah` caching (second call returns cached, not re-fetched); test `normalizeSurah` applies basmala strip only for non-Fatiha/non-Tawbah surahs.
- **Verified:** yes — grep confirms no test imports `api/data.js`.

### TST-002 | Critical | test-coverage | S

- **Location:** `web/src/api/worker.js`
- **Evidence:** No test file imports from `api/worker.js`. The module provides `getDeviceId` (localStorage + `crypto.randomUUID`), `fetchBookmarks`, `addBookmark`, `removeBookmark`, `fetchProgress`, `saveProgress` — six exported functions, all with network I/O and error handling (catch → `return null`). Zero are tested.
- **Why it matters:** `getDeviceId` returns `null` when `API_BASE` is empty or localStorage throws — callers (`DataContext`, `FavoritesContext`) silently disable remote sync. A regression in the null-return logic would silently break bookmark/progress sync for all users. The `api()` helper swallows all errors and returns `null`, masking 4xx/5xx responses; no test verifies the error path or the `body.error` fallback.
- **Suggested fix:** Test `getDeviceId` returns `null` when `API_BASE` is unset; test it returns a valid UUID string when localStorage is available; test it returns `null` when `localStorage.getItem` throws (simulating private browsing). Test `api()` on non-ok response (assert `null` return and `console.error` called); test on network error (assert `null` return). Test each CRUD function sends correct method/path/body.
- **Verified:** yes — grep confirms no test imports `api/worker.js`.

### TST-003 | Critical | test-coverage | M

- **Location:** `web/src/contexts/DataContext.jsx`
- **Evidence:** No test imports or exercises the `DataProvider` component or `useData` hook. The context manages three state variables (`index`, `indexError`, `readingProgress`) and two `useEffect` side effects: (1) index fetch with `.catch(err => setIndexError(err.message))` (line 13), and (2) remote progress sync that maps server rows to a local map (lines 19–26). `SurahView.test.jsx` mocks the entire context, never exercising its real logic.
- **Why it matters:** The index-load error path (network failure → `indexError` state → `SurahList` retry UI) is completely untested. The progress sync path (server rows → `readingProgress` map) has no tests. A regression in either would silently break the app's primary data loading or reading-progress restoration, affecting all users.
- **Suggested fix:** Test `DataProvider` renders children; test `useData` returns populated index after mock fetch resolves; test `useData` returns `indexError` string when `loadIndex` rejects; test `readingProgress` populated from mock `fetchProgress` response; test `saveReadingProgress` updates state; test `useData` throws outside provider.
- **Verified:** yes — grep confirms no test imports `DataContext.jsx` (SurahView.test mocks it).

### TST-004 | High | test-coverage | M

- **Location:** `workers/tafsir-api/src/index.js`
- **Evidence:** Zero test files exist under `workers/`. The Worker handles 5 routes (GET/POST/DELETE bookmarks, GET/PUT progress) with input validation (`isValidSurah`, `isValidAyah`), D1 SQL operations, CORS handling, and error responses. None of this is tested. Cross-referenced with WRK-001 through WRK-013 findings which document security and correctness gaps that tests would catch.
- **Why it matters:** Input validation regressions (e.g. allowing `device_id` of type `object` — WRK-003) would silently corrupt D1 data. CORS misconfiguration would break the frontend in production. The 500 error leak (WRK-002) would go undetected. Without tests, every deploy is a guessing game.
- **Suggested fix:** Add Vitest tests using Miniflare's D1 mock: test each route returns correct status/body for valid input; test missing `device_id` returns 400; test invalid `surah_id` (0, 115, string) returns 400; test POST creates row (verify via SELECT); test DELETE removes row; test PUT upserts; test 404 for unknown paths; test CORS headers for allowed/disallowed origins.
- **Verified:** yes — glob confirms no test files under `workers/`.

### TST-005 | High | test-coverage | M

- **Location:** `pipeline/src/tafsir/content_extractor.py`
- **Evidence:** `test_builder.py` imports only `TafsirEntry` (the dataclass), not `process_lesson`, `_extract_theme`, or `_clean_text`. The `process_lesson` function (lines 16–34) combines `parse_ayah_range`, `_extract_theme`, and `_clean_text` — three untested transformations. `_extract_theme` (lines 37–53) has two branching strategies (comma-split vs dash-split) with no tests. `_clean_text` (lines 56–61) has dead-code regex (second pattern unreachable — see PIP-008).
- **Why it matters:** `_extract_theme` returning wrong values means every ayah's `tafsir_short` (the preview snippet shown in the UI) is incorrect. `_clean_text` destroying paragraph breaks (PIP-008) produces single-line tafsir blobs. Neither failure is caught by existing tests because they're only exercised indirectly through `builder.py` tests which use pre-constructed `TafsirEntry` objects.
- **Suggested fix:** Test `process_lesson` end-to-end with realistic title+body strings; test `_extract_theme` with comma-separated titles, dash-separated titles, titles with no separator; test `_clean_text` normalizes whitespace while preserving paragraph structure; test `process_lesson` with empty title returns empty ayah_numbers.
- **Verified:** yes — grep confirms `test_builder.py` imports only `TafsirEntry`, not the functions.

### TST-006 | High | test-coverage | M

- **Location:** `pipeline/src/tafsir/scraper.py`
- **Evidence:** No test file imports from `tafsir/scraper.py`. The module provides `fetch_page` (with retry/backoff, disk cache, rate limiting), `extract_story_links_from_category` (HTML → deduplicated story list), `fetch_story_page` (extract title/body/category from story HTML with fallback selectors), and `extract_lesson_links` / `extract_lesson_content` (dead code per PIP-012). The tested `category_index.py` duplicates some of this logic but doesn't exercise scraper's fallback selectors or retry behavior.
- **Why it matters:** `fetch_story_page`'s fallback selector chain (`sg-post-content` → `article` → `.story-content` → `.article-body` → `.entry-content` → largest-div heuristic) is completely untested. A CSS selector change on the origin site would silently produce empty bodies. The retry/backoff logic in `fetch_page` is untested — a regression could bypass retries or misapply backoff timing.
- **Suggested fix:** Test `extract_story_links_from_category` with HTML containing `/story/` links (dedup, urljoin, empty href); test `fetch_story_page` extracts title/body/category from realistic HTML; test `fetch_story_page` falls back to secondary selectors when primary is missing; test `fetch_story_page` returns `None` on fetch failure; test `extract_lesson_content` returns largest-div text.
- **Verified:** yes — grep confirms no test imports `scraper.py`.

### TST-007 | Medium | test-coverage | S

- **Location:** `web/src/contexts/FavoritesContext.test.js:1-59`
- **Evidence:** The test file imports only `mergeFavorites` from `FavoritesContext` and tests serialization + merge. The `FavoritesProvider` component (lines 54–117) — which handles localStorage persistence, mount-time remote sync with merge, and `toggleFavorite` with remote API calls — is never rendered or exercised. The test verifies `mergeFavorites({ '2': new Set([5, 6]) }, { '2': new Set([6, 7]) })` works but never verifies the Provider context actually exposes `toggleFavorite`/`isFavorite` correctly, or that the sync effect runs.
- **Why it matters:** The `mergeFavorites` function is well-tested, but the integration that calls it (mount-time sync) is not. The private-browsing crash fix (commit dfd4fac: "prevent app crash on theme save in private browsing") and the sync-merge fix (commit 2e8c7e5: "merge favorites on sync instead of overwriting") both modified this module, but no regression test covers the scenarios that caused those bugs. `saveFavorites` catching localStorage errors (lines 24–34) is untested.
- **Suggested fix:** Test `FavoritesProvider` renders children and exposes context; test `toggleFavorite` adds/removes from context state; test `isFavorite` reflects toggled state; test mount effect calls `fetchBookmarks` and merges result; test `saveFavorites` is called on state change; test localStorage failure (mock `localStorage.setItem` to throw) does not crash Provider.
- **Verified:** yes — test file only imports `mergeFavorites`, not the Provider.

### TST-008 | Medium | test-coverage | S

- **Location:** `web/src/contexts/ThemeContext.test.js:1-12`
- **Evidence:** The test file tests only the theme-cycle pure function (light→dark→sepia→light). It does not import or render `ThemeProvider`, `useTheme`, `readStoredTheme`, or exercise `toggleTheme`. The `ThemeProvider` component (lines 16–40) applies `data-theme` attribute to `<html>`, persists to localStorage with try/catch, and reads stored theme on mount — none tested. The commit dfd4fac ("prevent app crash on theme save in private browsing") fixed a crash in `localStorage.setItem` inside the theme effect — no regression test covers this scenario.
- **Why it matters:** A `localStorage.setItem` failure (private browsing) crashing the Provider would be invisible to this test suite. A regression in `readStoredTheme` returning an invalid theme string (e.g. from tampered localStorage) causing silent CSS degradation (WEB-013) would go undetected.
- **Suggested fix:** Test `ThemeProvider` sets `data-theme` attribute on mount; test `toggleTheme` cycles and updates attribute; test `readStoredTheme` returns 'light' when localStorage throws; test `readStoredTheme` returns 'light' for unrecognized stored value; test `ThemeProvider` catches `localStorage.setItem` failure without crashing.
- **Verified:** yes — test file only tests the pure cycle function.

### TST-009 | Medium | test-coverage | M

- **Location:** `web/src/App.integration.test.jsx`
- **Evidence:** The integration test (`App.integration.test.jsx`) mocks `globalThis.fetch` to return a valid index (line 12–15) and tests only the happy path: surah list renders at `/tafseer-nabulsi/`. `App.routing.test.jsx` separately covers basename routing behavior, so routing is not the gap here. What remains untested is the full-provider stack under navigation: (1) fetch failure → error state in SurahList, (2) navigating to `/surah/:id` → SurahView renders inside DataProvider/FavoritesProvider, (3) navigating to `/search` → SearchBar renders inside SearchProvider, (4) lazy-load fallback `<Suspense>` behavior. The integration test uses `vi.spyOn(globalThis, 'fetch')` but never exercises the real DataContext, SearchContext, or FavoritesContext wiring that App.jsx composes around Routes.
- **Why it matters:** A provider-wiring regression (e.g. missing SearchProvider around SearchBar route, or DataContext error state not propagating to SurahList) would not be caught. The integration test covers a single page with a single mock; it does not verify that the full provider tree works end-to-end across routes.
- **Suggested fix:** Add integration tests for: fetch rejection → error UI shown; navigation to `/surah/1` → SurahView renders with ayah data via real DataContext; navigation to `/search` → SearchBar renders inside real SearchProvider; navigation to `/unknown` → NotFound renders; Suspense fallback shown during lazy load.
- **Verified:** yes — test file contains only one `it()` block testing the happy path.

### TST-010 | Medium | test-coverage | S

- **Location:** `web/src/components/SearchBar.jsx`
- **Evidence:** `SearchBar` has three distinct UI states (loading with progress %, error message, empty results) and one interactive path (Enter key triggers search). None are tested. The `search.test.js` tests only `searchLocal` the pure function, not the component that renders results, handles errors, or shows loading state.
- **Why it matters:** Search is the app's second most important feature. A regression in the error-handling path (e.g. `search` throwing → `setSearchError` → error message rendered) or the loading state (index building progress display) would go undetected. The `handleKeyDown` Enter-to-search binding is untested.
- **Suggested fix:** Test SearchBar renders search input and button; test typing query + clicking search triggers search and displays results; test Enter key triggers search; test empty query does not trigger search; test error state renders error message when search throws; test loading state shows spinner during index build.
- **Verified:** yes — no test file exists for SearchBar.

### TST-011 | Medium | test-coverage | S

- **Location:** `web/src/components/SurahView.test.jsx`
- **Evidence:** The single test (line 36) verifies ayahs render with `data-ayah` attributes after mock fetch. It does not test: loading state (Spinner shown while fetch is in-progress), error state (fetch failure), or the reading-progress scroll restoration effect. The test mocks `readingProgress: {}`, so the scroll-to-position logic (SurahView.jsx:48-56) is never exercised.
- **Why it matters:** SurahView is the most complex component (loading state, error handling, scroll restoration, favorite toggling, tafsir expansion). A regression in any of these behaviors would go undetected. The scroll restoration bug (WEB-011: missing deps on readingProgress) specifically needs a regression test.
- **Suggested fix:** Test loading state (Spinner visible before fetch resolves); test error state (error message on fetch rejection); test `data-ayah` nodes rendered (already covered); test expand/collapse tafsir button toggles tafsir text visibility; test favorite button calls `toggleFavorite`.
- **Verified:** yes — test file contains one `it()` block testing only the render-after-load happy path.

### TST-012 | Low | test-coverage | S

- **Location:** `web/src/components/ErrorBoundary.jsx`
- **Evidence:** No test exercises the `ErrorBoundary` class component. The component catches errors via `getDerivedStateFromError` (line 8) and renders a fallback UI with error message and "return to home" link.
- **Why it matters:** ErrorBoundary is the app's last line of defense against uncaught render errors. If `getDerivedStateFromError` were broken or the fallback UI failed to render, the app would show a blank page instead of a recovery option. Low risk because the component is 32 LOC with trivial logic.
- **Suggested fix:** Test ErrorBoundary renders children when no error; test ErrorBoundary renders fallback UI when child throws; test error message is displayed; test "return to home" link is present.
- **Verified:** yes — no test file exists for ErrorBoundary.

### TST-013 | Low | test-coverage | S

- **Location:** `web/src/contexts/SearchContext.jsx`
- **Evidence:** No test exercises the `SearchProvider` or `useSearch` hook. The context manages `searchIndex`, `isBuildingIndex`, `searchProgress` state and implements lazy index building with `inflightRef` dedup (preventing concurrent `buildSearchIndex` calls).
- **Why it matters:** The `inflightRef` dedup logic (lines 16–27) prevents duplicate network-heavy index builds. A regression here could cause multiple concurrent 114-surah fetches. Low risk because the logic is straightforward and the underlying `buildSearchIndex` already handles caching.
- **Suggested fix:** Test `SearchProvider` exposes `search`, `isBuildingIndex`, `searchProgress`; test `search` with empty query returns `[]`; test `search` triggers index build on first call; test concurrent calls share same build (dedup).
- **Verified:** yes — no test file exists for SearchContext.

### TST-014 | Low | test-coverage | S

- **Location:** `pipeline/src/media/mapper.py`
- **Evidence:** No test imports `media/mapper.py`. The `load_media_csv` function (lines 17–46) parses a CSV file with row validation (`isdigit()` check, minimum column count) and `map_media_links` does a dict lookup. A malformed CSV row raises `ValueError` on `int()` conversion (flagged as PIP-010).
- **Why it matters:** CSV parsing with `int()` conversion and row-skip logic needs edge-case coverage (non-numeric data, empty rows, missing columns). Low risk because the CSV is hand-maintained and the failure mode (exception propagation) is loud.
- **Suggested fix:** Test `load_media_csv` with valid CSV; test skips non-numeric rows; test skips rows with < 3 columns; test returns empty dict for missing file; test `map_media_links` returns empty dict for unknown ayah.
- **Verified:** yes — no test file imports `mapper.py`.

### TST-015 | Low | test-coverage | S

- **Location:** `pipeline/src/quran/parser.py`
- **Evidence:** No test imports `quran/parser.py`. The `parse_quran_json` function (lines 44–65) parses AlQuran.cloud JSON format and constructs `Surah`/`Ayah` dataclasses. `get_surah_by_index` (lines 68–72) is a simple linear lookup. `test_builder.py` uses the `Ayah`/`Surah` dataclasses but doesn't test parsing.
- **Why it matters:** The JSON structure dependency (`data["data"]["surahs"]`, `aya["numberInSurah"]`) is a fragile contract with an external API. A response format change would break parsing silently. Low risk because the API is stable and the parsing is straightforward.
- **Suggested fix:** Test `parse_quran_json` with a minimal JSON fixture; test `get_surah_by_index` returns correct surah; test `get_surah_by_index` returns `None` for missing index.
- **Verified:** yes — no test file imports `parser.py`.

---

## Cross-Reference with Existing Findings

| TST ID | Overlaps with | Resolution |
|--------|---------------|------------|
| TST-001 | WEB-009, WEB-016 (data.js design issues) | Complementary — TST-001 covers test gap; WEB-* cover design/robustness |
| TST-002 | WRK-001 through WRK-013 (Worker API gaps) | Complementary — TST-002 covers client-side test gap; WRK-* cover server-side security/correctness |
| TST-003 | WEB-010 (DataContext SOLID) | Complementary — TST-003 covers test gap; WEB-010 covers architecture |
| TST-004 | WRK-001 through WRK-013 | Complementary — TST-004 covers test absence; WRK-* cover specific bugs tests would catch |
| TST-005 | PIP-008 (dead regex in _clean_text) | TST-005 would catch PIP-008's dead code if tests existed |
| TST-006 | PIP-004, PIP-012 (scraper silent failures, dead code) | Complementary — TST-006 covers test gap for the live code paths |
| TST-007 | WEB-004, WEB-005, WEB-006 (FavoritesContext design) | Complementary — TST-007 covers test gap for scenarios that caused historical bugs |
| TST-008 | WEB-013 (invalid localStorage theme) | TST-008's readStoredTheme regression test would catch WEB-013's silent CSS degradation |
| TST-009 | No overlap — App.routing.test.jsx covers routing; TST-009 covers provider wiring under navigation | Distinct scope — routing tests exist but full-provider integration across routes does not |
| TST-010 | No overlap — search.test.js covers `searchLocal` pure function; TST-010 covers SearchBar component states | Distinct scope — pure-function tests exist but component interaction tests do not |
| TST-011 | WEB-011 (scroll restoration missing deps) | TST-011's scroll-restoration regression test would catch WEB-011's late-arrival race condition |
| TST-012 | No overlap — no other finding covers ErrorBoundary | Standalone gap — last-resort error UI has zero coverage |
| TST-013 | No overlap — WEB-008 covers search index memory/perf; TST-013 covers SearchContext dedup logic | Distinct scope — performance concern vs correctness of dedup |
| TST-014 | PIP-010 (mapper.py malformed CSV raises ValueError) | TST-014's CSV edge-case tests would catch PIP-010's unhandled ValueError |
| TST-015 | No overlap — no other finding covers quran/parser.py test gap | Standalone gap — external API JSON contract untested |

---

## Summary

| Severity | Count | IDs |
|----------|-------|-----|
| Critical | 3 | TST-001, TST-002, TST-003 |
| High | 3 | TST-004, TST-005, TST-006 |
| Medium | 5 | TST-007, TST-008, TST-009, TST-010, TST-011 |
| Low | 4 | TST-012, TST-013, TST-014, TST-015 |
| **Total** | **15** | |

Regression-test gaps for historically-bitten bugs:
- **Private browsing crash** (dfd4fac): no regression test → covered by TST-008
- **Favorites sync merge** (2e8c7e5): `mergeFavorites` is tested, but Provider integration is not → covered by TST-007
