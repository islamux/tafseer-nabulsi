# Performance Findings (cross-cutting)

Read-only performance audit of the web app's data-loading and rendering strategy against the ~388MB R2-hosted tafsir dataset.
Recorded: 2026-08-24 · Branch: `audit/full-project-review` · HEAD: `d775d24`

**Totals:** 6 findings — 0 Critical · 0 High · 4 Medium · 2 Low.
Plus 5 cross-references to existing findings in `findings/web.md` (not re-filed; see bottom section).

**Environment note (quantification basis):** neither `web/public/data/` nor `pipeline/output/` exists locally, so per-file dataset sizes could not be measured; corpus size is stated **from AGENTS.md (~388MB total)** per the audit fallback rule. Bundle numbers are cited from `docs/superpowers/reviews/phase0-baseline.md` (main chunk 245.40 kB raw / 79.05 kB gzip; JS total ≈253.59 kB raw / 82.83 kB gzip) rather than re-measured. Ayah counts grounded in-repo: 6,236 total (`docs/todo.md:8`), Al-Baqarah = 286 (`docs/interview-questions.md:149,161`). Jank/CPU magnitudes are code-derived estimates labeled as such — no profiling was run.

**Answers to the brief's six questions, in brief:**
1. **What loads when** — `_index.json` eagerly at app mount (`DataContext.jsx:12-14`); one `{id}.json` per surah on route change (`data.js:40-45`, `SurahView.jsx:28-46`); **the entire 114-file corpus on the first search** (`search.js:8-24` via `loadAllSurahs`, `data.js:47-62`).
2. **Caching/dedup** — module-level `indexCache` + `surahCache` Map dedupe within a session and survive remounts (`data.js:24-25`); no cross-session persistence, no service worker; no in-flight promise dedup.
3. **Render** — SurahList (114 rows, no virtualization) is fine at that scale; SurahView mounts all ayah cards unvirtualized with zero memoization and recomputes derived text per render; context values are unmemoized objects.
4. **HTTP caching** — R2 serves `max-age=86400, s-maxage=31536000, swr=604800` (AGENTS.md:79); client adds nothing beyond in-memory Maps; offline impossible.
5. **Bundle** — route-level splitting already present (`App.jsx:12-14`); main chunk healthy per phase0 baseline. No bundle finding filed.
6. **Fonts** — Google Fonts css2, `display=swap` + preconnect present; over-requests unused weight 600; third-party render-blocking CSS (Low).

### PRF-001 | Medium | performance | S
- **Location:** `web/src/contexts/DataContext.jsx:40`
- **Evidence:**
  ```jsx
  <DataContext.Provider value={{ index, indexError, fetchSurah, readingProgress, saveReadingProgress }}>
    {children}
  </DataContext.Provider>
  ```
  fed by `saveReadingProgress` (lines 33–37):
  ```js
  const saveReadingProgress = useCallback((surahId, ayahNumber) => {
    setReadingProgress(prev => ({ ...prev, [surahId]: ayahNumber }))
  ```
- **Why it matters:** The context value is a fresh object literal on every `DataProvider` render, so all `useData()` consumers re-render on *any* provider state change. During normal reading, the IntersectionObserver pipeline fires a debounced save roughly every 1.5s while the reader advances (`SurahView.jsx:68`: `setTimeout(() => saveReadingProgress(surahId, num), 1500)`), each bumping `readingProgress` → new value object → `SurahView` (the consumer at `SurahView.jsx:17`) re-renders its entire card list. That is a full reconciliation cycle of up to 286 `AyahCard`s (Al-Baqarah) approximately every 1.5 seconds of active scrolling — repeated avoidable main-thread work on the app's single most common interaction, compounded by PRF-002/PRF-003. (Estimated magnitude; not profiled.)
- **Suggested fix:** Split reading progress into its own `ProgressContext` (mirroring `FavoritesContext`'s isolation) so index/`fetchSurah` consumers don't re-render on progress writes; a bare `useMemo` here cannot help since `readingProgress` is a genuine dependency of the value. Pair with PRF-002's `React.memo` so progress updates stop cascading into cards.

### PRF-002 | Medium | performance | S
- **Location:** `web/src/components/AyahCard.jsx:10`
- **Evidence:**
  ```jsx
  export default function AyahCard({ ayah, surahId }) {
    const [expanded, setExpanded] = useState(false)
    const { toggleFavorite, isFavorite } = useFavorites()
    ...
    const { year, body: tafsirBody } = parseTafsir(ayah.tafsir_long || '')   // line 15
    const segments = splitAyahSegments(ayah.text)                            // line 18
  ```
- **Why it matters:** Plain (non-memoized) component whose derived data is recomputed on *every* render: `parseTafsir` runs even though `tafsirBody` is consumed only when `expanded` (line 59), and `splitAyahSegments` regex-splits the vocalized verse text (with waqf-mark handling, `utils/arabic.js:8-18`) each time. With PRF-001, all ~286 Al-Baqarah cards redo this work plus reconciliation every ~1.5s of scrolling; a favorites toggle re-renders every card too (`FavoritesContext.jsx:113` recreates its value object per provider render). Wasted CPU scales with surah length — plausibly frame-dropping on low-end mobile during the core reading flow (estimate; not profiled). Caveat verified end-to-end: `React.memo(AyahCard)` alone stops the progress path (cards don't subscribe to DataContext) but **not** the favorites path, because `AyahCard` itself calls `useFavorites()` and context changes bypass `memo`.
- **Suggested fix:** Wrap in `React.memo` (props are stable: cached ayah object identity from `surahCache` + numeric `surahId`); gate `parseTafsir` behind `expanded`; `useMemo` the `splitAyahSegments` result on `[ayah.text]`. To also kill the favorites-toggle cascade, pass `isFavorite(surahId, ayah.number)` down as a prop from a memo-aware parent or subscribe cards to a granular favorite-state store instead of the whole context.

### PRF-003 | Medium | performance | M
- **Location:** `web/src/components/SurahView.jsx:124`
- **Evidence:**
  ```jsx
  {surah?.ayahs?.map(ayah => (
    <div key={ayah.number} data-ayah={ayah.number}
      ref={el => { ayahEls.current[ayah.number] = el }}>
      <AyahCard ayah={ayah} surahId={surahId} />
    </div>
  ))}
  ```
- **Why it matters:** No windowing/incremental rendering: opening Al-Baqarah synchronously mounts all 286 ayah cards — roughly 6–9k DOM nodes including segment spans, badges, tafsir toggle buttons and footers (estimate) — immediately after `resp.json()` parses a multi-MB response on the main thread (`data.js:13`; avg file ≈3.4MB raw at ~388MB/114 files, Al-Baqarah above average). First meaningful paint of long surahs is delayed by the parse-plus-mount sequence, estimated in the hundreds of ms on mid-range devices (not profiled), and the whole tree stays alive while scrolling a document the user traverses linearly. Note: the audit brief's premise "Al-Baqarah ≈ 6k ayahs" is incorrect — Al-Baqarah has 286 ayahs; 6,236 is the entire Quran (`docs/todo.md:8`). Existing scroll-restoration and progress logic already key off `data-ayah` refs (`SurahView.jsx:51,64,75-77`), so chunked rendering composes cleanly with them.
- **Suggested fix:** Virtualize the list (`@tanstack/react-virtual` / `react-window`) or render incrementally (first ~30 cards + IntersectionObserver sentinel appending further chunks), keeping `key={ayah.number}` and the `data-ayah`/ref contract intact; combine with `React.memo(AyahCard)` (PRF-002) so appended renders stay cheap.

### PRF-004 | Medium | performance | M
- **Location:** `web/src/api/data.js:24`
- **Evidence:**
  ```js
  let indexCache = null
  const surahCache = new Map()
  ```
  No service worker exists anywhere (`serviceWorker|workbox|sw.js` grep over `web/` returns nothing); R2 objects ship `max-age=86400, s-maxage=31536000, stale-while-revalidate=604800` (AGENTS.md:79).
- **Why it matters:** All client-side caching is module-scope memory wiped on every page load, so caching across sessions rests entirely on HTTP semantics: each new visit refetches `_index.json` and re-downloads (or at best conditionally revalidates) every viewed surah file; once past the 24h `max-age` — or after aggressive mobile browser cache eviction — transfers are full MB-scale bodies again. For an app whose entire payload is static, immutable-per-build JSON, this is recurring measurable bandwidth/latency waste on every returning visit, and the app is unusable offline by construction.
- **Suggested fix:** Add a service worker (vite-plugin-pwa/Workbox) with a stale-while-revalidate or cache-first strategy scoped to `${DATA_BASE}/*.json` plus app-shell precache; alternatively persist fetched surah JSON into Cache Storage/IndexedDB inside `loadSurah` with a dataset version key.

### PRF-005 | Low | performance | S
- **Location:** `web/index.html:18`
- **Evidence:**
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
  ```
- **Why it matters:** Requests 4 weights × 2 families, but the codebase uses only weights 400 (default), 500 (`font-medium`) and 700 (`font-bold`) — no `font-semibold`/600 anywhere in `web/src` (grep-verified). Impact is genuinely small because browsers fetch only faces actually rendered, so the cost is CSS bloat plus occasional speculative loads; the render-blocking third-party stylesheet is partially mitigated by the existing preconnects (lines 16–17) and `display=swap`. Subsetting is handled by Google's automatic unicode-range splits (arabic/latin), so no unsubsetted-font problem exists — the remaining issue is origin dependency and the unused weight.
- **Suggested fix:** Drop `;600` from both families in the css2 URL; optionally self-host arabic+latin woff2 subsets with `<link rel="preload">` to remove the third-party origin chain and CSP carve-outs (`index.html:5`).

### PRF-006 | Low | performance | S
- **Location:** `web/src/api/data.js:40`
- **Evidence:**
  ```js
  export async function loadSurah(id) {
    if (surahCache.has(id)) return surahCache.get(id)
    const surahData = normalizeSurah(await fetchJson(`${DATA_BASE}/${id}.json`), id)
    surahCache.set(id, surahData)
    return surahData
  }
  ```
- **Why it matters:** Dedup happens only *after* resolution — there is no in-flight promise map. Under `<React.StrictMode>` (`main.jsx:7`), dev double-invokes effects, so `SurahView`'s fetch effect (`SurahView.jsx:28-46`) issues two parallel downloads of the same multi-MB surah file on every dev navigation. The race is also reachable in production: while a first search is building the index (minutes-long, sequential `loadAllSurahs`), navigating to `/surah/:id` triggers a second parallel fetch of whichever surah the loop is currently downloading. Waste is bounded (one duplicate MB-scale transfer per occurrence) hence Low, but the fix is trivial.
- **Suggested fix:** Cache the promise, not just the result: keep a `Map<id, Promise>` set synchronously before `await`, delete on rejection; `loadSurah` returns the shared promise for concurrent callers.

---

## Cross-references (already filed elsewhere — not re-filed)

These performance-relevant issues exist in prior findings files and are referenced by ID per the audit's cross-reference rule:

- **WEB-008** (`findings/web.md:86`, Medium/improvements) — **the dominant performance issue in the app**: first search fetches the entire 114-file corpus (~388MB per AGENTS.md; local measurement unavailable) sequentially into memory, retains it indefinitely (`surahCache` + duplicated `searchIndexCache` string copies), then linearly scans it per query. Performance-lens severity assessment: this warrants **High** (major avoidable cost on a common interaction; effectively unusable first search on mobile), an elevation from the filed Medium. Task 9 should weigh the perf-lens rating.
- **WEB-009** (`findings/web.md:98`, Medium) — the sequential `for` loop in `loadAllSurahs` (`web/src/api/data.js:52-57`): index-build wall time equals the sum of 114 serial RTTs + transfers; a concurrency-8 pool cuts it ~8×.
- **WEB-016** (`findings/web.md:186`, Low) — uniform 10s `FETCH_TIMEOUT_MS` (`web/src/api/data.js:5`) applied per file: on slow connections any single multi-MB surah exceeding 10s aborts and fails the *entire* search-index build, compounding WEB-008.
- **WEB-003** (`findings/web.md:15`, High/bugs) — no Arabic normalization in search: correctness failure whose per-query `toLowerCase()`-over-the-whole-corpus scan is also pure wasted CPU; fixing normalization at index-build time (per WEB-003's fix) simultaneously removes the per-query allocation churn.
- **Phase 0 bundle conclusion** (`docs/superpowers/reviews/phase0-baseline.md:55-70`) — route-level code splitting already present (`App.jsx:12-14` lazy imports; separate SurahView/SearchBar/NotFound chunks), main chunk 79.05 kB gzip is healthy for React 19 + router; **no bundle finding filed** (nothing above threshold, no import-graph pathology: `api/search.js` statically importing `data.js` lands in shared code either way).
