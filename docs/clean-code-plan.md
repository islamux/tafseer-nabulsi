# Clean Code Plan — Tafsir Nabulsi

Audit performed with `clean-code-guard` skill. Execution order: **Phase 1 → 3 → 2 → 4 → 5 → 6** (delete dead code first, add new patterns on clean base, restructure, rename, test).

---

## Phase 1: Critical Bug Fixes

Error handling failures that cause broken UX states.

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| C1 | Index load failure → infinite spinner. `loadIndex()` rejects, error swallowed by `console.error`, `index` stays `[]`, spinner forever | `DataContext.jsx:15` + `SurahList.jsx:15` | Add `indexError` state, `.catch(setIndexError)`, expose error; show error + retry in SurahList |
| C2 | `search()` leaves `searchLoading` stuck `true` on failure. No `try/finally` | `DataContext.jsx:30-35` | Wrap in `try/finally`, always `setSearchLoading(false)` |
| C3 | `search()` rejection unhandled by consumer | `SearchBar.jsx:15` | Add `try/catch` to `handleSearch` |
| C4 | `saveFavorites` unguarded `localStorage.setItem` — can throw on quota/private mode | `FavoritesContext.jsx:23-29` | Wrap in `try/catch` |

---

## Phase 3: YAGNI Cleanup

Dead code, unused exports, unused config.

| ID | What | File | Action |
|----|------|------|--------|
| Y1 | `cacheTick` state — incremented, never consumed | `DataContext.jsx:11,22` | Delete state + increment |
| Y2 | `colors.primary` Tailwind scale — never referenced | `tailwind.config.js:11-17` | Delete block |
| Y3 | `.card-bg` CSS class — never used | `index.css:9-12` | Delete |
| Y4 | `loadAllSurahs` exported but only called internally | `data.js:24` | Remove `export` keyword |
| Y5 | `favorites` raw state in provider value — never consumed | `FavoritesContext.jsx:58` | Remove from value |
| Y6 | `test_mapper.py` — 0 tests, just imports stub | `pipeline/tests/test_mapper.py` | Delete file |

---

## Phase 2: DRY Sweep

Systemic inline-style repetition (~45 instances) + component extraction.

### New CSS classes (`index.css @layer components`)

```css
.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-accent { color: var(--accent); }
.badge-accent { background-color: var(--accent); color: var(--text-on-accent); }
.input-style { background-color: var(--bg-secondary); color: var(--text-primary); }
```

### Inline style sweep

| Pattern | Occurrences | Replacement |
|---------|-------------|-------------|
| `color: var(--text-primary)` | 11× | `.text-primary` |
| `color: var(--text-secondary)` | 11× | `.text-secondary` |
| `color: var(--accent)` | 10× | `.text-accent` |
| `backgroundColor: var(--accent) + color: var(--text-on-accent)` | 7× | `.badge-accent` |
| Input `bg-secondary + text-primary` | 3× | `.input-style` |

### Extract components

| Component | Replaces | Files affected |
|-----------|----------|----------------|
| `<Spinner />` | 3× duplicated loading spinner | SurahList, SurahView, SearchBar |
| `<StateMessage emoji title body action />` | NotFound + ErrorBoundary template | NotFound, ErrorBoundary |

### Other DRY fixes

| ID | Issue | Fix |
|----|-------|-----|
| D8 | JS `onMouseEnter/Leave` hover handler | CSS `:hover` rule using `--hover-bg` |
| D9 | `<Link>` + `useLocation` for active nav styling | `<NavLink>` with built-in `isActive` |
| D10 | `arabic-text` vs `font-arabic` inconsistent | Standardize on `.arabic-text` everywhere |

---

## Phase 4: SOLID Refactor

| ID | Issue | Fix |
|----|-------|-----|
| S1 | DataContext conflates 3 concerns (index + surah cache + search) | Split: DataContext (index + surah) + SearchContext (search state) |
| S2 | Dual surah caches (module Map in data.js + ref in DataContext) | Remove `surahCacheRef` from DataContext, single cache in API layer |
| S3 | AyahCard inline IIFE parsing date in JSX | Extract `parseTafsir()` to `utils/tafsir.js` returning `{ year, body }` |
| S4 | `api/data.js` mixes data access + search engine | Split: `api/data.js` (fetch) + `api/search.js` (search engine) |
| S5 | Search fields hardcoded in two places | Single `SEARCH_FIELDS` constant shared by build + search |

---

## Phase 5: Naming Cleanup

| Current | Renamed | Files |
|---------|---------|-------|
| `r` | `result` | SearchBar |
| `s` | `surah` | SurahList, SurahView |
| `fav` | `isFav` | AyahCard |
| `body` | `tafsirBody` | AyahCard |
| `data` (in `.then`) | `surahData` | SurahView |
| `res` | `results` | SearchBar |
| `searchLoading` | `isBuildingIndex` | DataContext, SearchBar |
| `getSurah` | `fetchSurah` | DataContext, SurahView |

---

## Phase 6: Testing

### Setup

- Add devDeps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Add scripts: `"test": "vitest"`, `"test:run": "vitest run"`
- Configure `vite.config.js` with `test: { environment: 'jsdom' }`

### Test files

| File | Tests | Coverage |
|------|-------|----------|
| `utils/arabic.test.js` | `toArabicNum` | Digits, 0, multi-digit, string with embedded numbers |
| `api/search.test.js` | `searchLocal` | Empty query, empty index, match across fields, 50-result cap |
| `contexts/FavoritesContext.test.jsx` | Serialization | Set↔Array round-trip, corrupt JSON fallback |
| `contexts/ThemeContext.test.jsx` | Theme cycle | light→dark→sepia→light wraparound |
| `utils/tafsir.test.js` | `parseTafsir` | Date extraction, no-date fallback, body slicing |

---

## Verification

Run `pnpm build` after each phase. All phases must pass before deploying.
