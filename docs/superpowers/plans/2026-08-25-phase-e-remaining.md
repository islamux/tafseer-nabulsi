# Phase E: Remaining a11y + pipeline hardening

Branch: `fix/phase-e-remaining`
Created: 2026-08-25

## Tasks

### 1. A11Y-004 | Route focus management + document.title
**File:** `web/src/App.jsx`
**Problem:** SPA route changes reset focus to body, no title change. Screen readers lose position.
**Fix:** Add route-level effect that sets `document.title` per page and moves focus to the h1, or render a visually-hidden router announcer live region.

### 2. A11Y-005 | Search progress live region
**File:** `web/src/components/SearchBar.jsx`
**Problem:** Index build progress, results count, empty/error states not announced to screen readers.
**Fix:** Wrap progress block in `role="status" aria-live="polite"`, error paragraphs with `role="alert"`.

### 3. WEB-009 | Parallel fetch for loadAllSurahs
**File:** `web/src/api/data.js`
**Problem:** 114 sequential fetches = sum of all RTTs. 
**Fix:** Batch 8 concurrent fetches with `Promise.all`, preserve order, keep `onProgress` callback.

### 4. PIP-009 | Pagination safety bounds in category_index
**File:** `pipeline/src/tafsir/category_index.py`
**Problem:** Unbounded pagination loop, no retry, single failure aborts whole surah.
**Fix:** Add `max_pages=50` safety bound, wrap per-page fetch in try/except, log and return collected stories on failure.

### 5. PIP-007 | Cache TTL for HTTP responses
**File:** `pipeline/src/utils/cache.py`
**Problem:** Pickle cache has no expiry — stale/errored bodies reused forever.
**Fix:** Add `fetched_at` timestamp, expire after 30 days. Skip caching empty/short bodies.

### 6. WRK-008 | Worker route table refactor
**File:** `workers/tafsir-api/src/index.js`
**Problem:** 5 near-identical copy-pasted route blocks.
**Fix:** Declarative route table with shared handler helpers.

### 7. TST-009 | Integration test coverage
**File:** `web/src/App.integration.test.jsx`
**Problem:** Only happy-path surah list tested. No error, navigation, or search route tests.
**Add:** Tests for fetch failure → error UI, navigation to /surah/1, navigation to /search, unknown route → NotFound.
