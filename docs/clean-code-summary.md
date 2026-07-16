# Clean Code Refactor Summary

Applied DRY, KISS, YAGNI, SOLID, and testing principles across the web codebase using the `clean-code-guard` skill.

## Phase 1: Critical Bug Fixes

| Fix | File | Change |
|-----|------|--------|
| C1: Index load failure → infinite spinner | `DataContext.jsx` | Added `indexError` state, `.catch(setIndexError)`, error + retry UI in SurahList |
| C2: search() stuck loading forever | `DataContext.jsx` (→ `SearchContext.jsx`) | Wrapped in `try/finally` |
| C3: Unhandled search rejection | `SearchBar.jsx` | Added `try/catch` + `searchError` state |
| C4: Unguarded favorites write | `FavoritesContext.jsx` | Wrapped `saveFavorites` in `try/catch` |

## Phase 3: YAGNI Cleanup

| Deleted | File |
|---------|------|
| `cacheTick` dead state | `DataContext.jsx` |
| `colors.primary` unused Tailwind config | `tailwind.config.js` |
| `.card-bg` unused CSS class | `index.css` |
| `export` on internal `loadAllSurahs` | `api/data.js` |
| `favorites` raw state from provider value | `FavoritesContext.jsx` |
| `test_mapper.py` empty stub (0 tests) | `pipeline/tests/` |

## Phase 2: DRY Sweep

**Added semantic CSS classes** (`index.css @layer components`):
- `.text-primary`, `.text-secondary`, `.text-accent` — replace ~32 inline `style={{ color: ... }}` objects
- `.badge-accent` — replaces 7 inline accent badge styles
- `.input-style` — replaces 3 inline input styles
- `.surah-row:hover` — replaces JS `onMouseEnter/Leave` handler

**Extracted components:**
- `<Spinner />` — replaces 3 duplicated loading spinners
- `<StateMessage />` — replaces NotFound + ErrorBoundary template duplication

**Other:**
- `<Link>` + `useLocation` → `<NavLink>` with `isActive` in Layout
- Standardized all `font-arabic` → `.arabic-text` class usage
- JS hover handler → CSS `:hover` rule

## Phase 4: SOLID Refactor

| Principle | Change |
|-----------|--------|
| SRP | Split `DataContext` → `DataContext` (index + surah) + `SearchContext` (search state) |
| SRP | Split `api/data.js` → `api/data.js` (fetch) + `api/search.js` (search engine) |
| SRP | Extracted `parseTafsir()` from inline IIFE in AyahCard → `utils/tafsir.js` |
| DRY | Extracted `SEARCH_FIELDS` + `MAX_RESULTS` constants in `search.js` |
| KISS | Removed dual surah cache (ref in context + Map in API) — single cache in API layer |

## Phase 5: Naming Cleanup

| Old | New |
|-----|-----|
| `r`, `i` | `result`, `idx` |
| `s` | `surah` |
| `fav` | `isFav` |
| `body` | `tafsirBody` |
| `data` (in `.then`) | `surahData` |
| `res` | `searchResults` |
| `searchLoading` | `isBuildingIndex` |
| `getSurah` | `fetchSurah` |

## Phase 6: Testing

**Setup:** vitest + jsdom + @testing-library/react + @testing-library/jest-dom

**16 tests across 5 files:**
- `utils/arabic.test.js` (4 tests) — `toArabicNum`: digits, multi-digit, embedded strings, no-digit passthrough
- `utils/tafsir.test.js` (3 tests) — `parseTafsir`: date extraction, no-date, empty string
- `api/search.test.js` (6 tests) — `searchLocal`: empty query/index, field matching, 50-result cap
- `contexts/FavoritesContext.test.js` (2 tests) — Set↔Array serialization, corrupt JSON fallback
- `contexts/ThemeContext.test.js` (1 test) — light→dark→sepia→light cycle

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| JS bundle | 248 KB | 246 KB |
| CSS | 10.4 KB | 10.7 KB |
| Modules | 54 | 59 (+5 new files) |
| Inline `style={{}}` objects | ~45 | ~3 (only structural: borders, tafsir tint) |
| Test files | 0 | 5 (16 tests) |
| Context files | 3 | 4 (+SearchContext) |
| API files | 1 | 2 (+search.js) |
| Utils files | 1 | 2 (+tafsir.js) |

## New Files Created

- `web/src/components/Spinner.jsx`
- `web/src/components/StateMessage.jsx`
- `web/src/contexts/SearchContext.jsx`
- `web/src/api/search.js`
- `web/src/utils/tafsir.js`
- `web/src/test-setup.js`
- `web/src/utils/arabic.test.js`
- `web/src/utils/tafsir.test.js`
- `web/src/api/search.test.js`
- `web/src/contexts/FavoritesContext.test.js`
- `web/src/contexts/ThemeContext.test.js`
- `docs/clean-code-plan.md`
