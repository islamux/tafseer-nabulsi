# Phase C: Medium-severity fixes

Branch: `fix/phase-c-medium`
Created: 2026-08-25

## Tasks

### 1. PIP-008 | Fix whitespace collapse in content_extractor
**File:** `pipeline/src/tafsir/content_extractor.py`
**Problem:** `re.sub(r"\s+", " ", text)` collapses newlines, destroying paragraph structure. The second regex (`\n\s*\n`) is dead code.
**Fix:** Replace with `[^\S\n]+` to collapse only horizontal whitespace, then squeeze 3+ newlines to 2.
**Test:** Add test in `test_content_extractor.py` verifying paragraph breaks are preserved.

### 2. WEB-007 | Search results scroll to ayah
**Files:** `web/src/components/SearchBar.jsx`, `web/src/components/SurahView.jsx`
**Problem:** Search result links go to `/surah/:id` but don't anchor to the specific ayah.
**Fix:** Link to `/surah/:id#ayah-N`, add `id={`ayah-${ayah.number}`}` to the wrapper div in SurahView.

### 3. A11Y-003 | Add aria-label to search nav link
**File:** `web/src/components/Layout.jsx`
**Problem:** Mobile search nav icon has no accessible name.
**Fix:** Add `aria-label="بحث"` to NavLink, `aria-hidden="true"` to emoji span.

### 4. A11Y-008 | Wrap error messages in bidi isolate
**File:** `web/src/components/SurahView.jsx`
**Problem:** LTR error strings in RTL context render scrambled.
**Fix:** Wrap error text in `<span dir="ltr" style={{unicodeBidi:'isolate'}}>`.

### 5. PIP-013 | Atomic file writes in builder
**File:** `pipeline/src/merge/builder.py`
**Problem:** Non-atomic writes leave truncated JSON on crash; resume treats file presence as success.
**Fix:** Write to temp file, then `os.replace()` atomically.

### 6. PIP-010 | Graceful CSV row parsing in mapper
**File:** `pipeline/src/media/mapper.py`
**Problem:** One bad CSV row crashes the entire surah build.
**Fix:** Wrap row parse in try/except, log-and-skip invalid rows.

### 7. A11Y-006 | Add aria-pressed/aria-expanded to interactive controls
**File:** `web/src/components/AyahCard.jsx`
**Problem:** Favorite toggle and tafsir disclosure don't convey state to screen readers.
**Fix:** Add `aria-pressed={isFav}` to heart button, `aria-expanded={expanded}` to tafsir toggle.

### 8. A11Y-007 | Semantic list for SurahList
**File:** `web/src/components/SurahList.jsx`
**Problem:** 114 links in a bare `<div>` — no list semantics for assistive tech.
**Fix:** Wrap in `<ul>` with `<li>` items, replace `<h2>` with styled `<span>`.

## Deferred (not in Phase C)
- PIP-006/007: pickle→JSON migration, cache TTL (requires design)
- PIP-009/011: Pagination bounds, config refactor (too invasive)
- WEB-004/005/006/010: FavoritesContext refactor, tombstones, storage failure, DataContext split
- WRK-004/008/012/013: Rate limiting, route table, pagination, batch endpoint
- SEC-001: CSP headers (hosting change)
- PRF-001/002/003/004: Performance (too invasive)
- TST-007/008/009/010/011: Additional test coverage
