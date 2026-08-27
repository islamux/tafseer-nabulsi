# Phase D: Performance + remaining tests

Branch: `fix/phase-d-perf-tests`
Created: 2026-08-25

## Tasks

### 1. PRF-001 + WEB-010 | Split DataContext — extract ProgressContext
**Files:** `web/src/contexts/DataContext.jsx`, `web/src/contexts/ProgressContext.jsx` (new), `web/src/App.jsx`, consumers
**Problem:** DataContext mixes index loading + progress sync + passthrough. Progress writes re-render all consumers including SurahList/SurahView index readers.
**Fix:** Extract `ProgressContext` (readingProgress + saveReadingProgress + mount sync). DataContext keeps only index + fetchSurah. Update consumers.

### 2. PRF-002 | Memoize AyahCard
**File:** `web/src/components/AyahCard.jsx`
**Problem:** Unmemoized — all ~286 cards re-render on any parent state change.
**Fix:** Wrap in `React.memo`. Gate `parseTafsir` behind `expanded`. `useMemo` for `splitAyahSegments`.

### 3. TST-007 | FavoritesProvider tests
**File:** `web/src/contexts/FavoritesContext.test.js`
**Problem:** Only `mergeFavorites` tested; Provider never rendered.
**Fix:** Test Provider renders children, toggleFavorite adds/removes, mount effect fetches and merges.

### 4. TST-008 | ThemeProvider tests
**File:** `web/src/contexts/ThemeContext.test.js`
**Problem:** Only theme-cycle pure function tested.
**Fix:** Test Provider sets data-theme, toggleTheme cycles, readStoredTheme fallback.

### 5. TST-010 | SearchBar component tests
**File:** `web/src/components/SearchBar.test.jsx` (new)
**Problem:** SearchBar has loading, error, empty, and result states — none tested.
**Fix:** Test renders input, typing + search triggers results, Enter key works, empty query no-op, error state.

### 6. WEB-013 | Validate stored theme
**File:** `web/src/contexts/ThemeContext.jsx`
**Problem:** Tampered localStorage value silently breaks styling.
**Fix:** Validate against THEMES array, fallback to 'light'.

### 7. WEB-011 | Fix scroll restoration race
**File:** `web/src/components/SurahView.jsx`
**Problem:** Scroll restoration runs once on `[surah]`, missing late-arriving progress.
**Fix:** Add `restoredForRef` guard, re-run on `[surah, readingProgress]`.
