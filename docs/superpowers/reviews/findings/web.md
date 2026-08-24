# Web Subsystem Findings (`web/src/`)

Deep read-only review of the React app under `web/src/` (~1,550 LOC across 33 files).
Recorded: 2026-08-24 · Branch: `audit/full-project-review` · HEAD: `65346df`
Reviewer method: every file under `web/src/` read in full; data-shape claims cross-checked against pipeline sources (`pipeline/src/quran/parser.py`, `pipeline/src/merge/builder.py`) since `web/public/data/` is not populated locally.

Severity: Critical = crash/data loss/security hole · High = user-visible incorrectness · Medium = maintainability · Low = polish.
Effort: S < 1h · M = hours · L = days.

**Totals:** 0 Critical · 1 High · 7 Medium · 5 Low.

No off-by-one issues found in surah/ayah indexing (`isValidSurahId` 1–114 correct; ayah numbers flow from `numberInSurah` consistently). No RTL string-handling bug found in `utils/arabic.js`; `stripLeadingBasmala` correctly skips tashkeel and normalizes alef variants while walking.

### WEB-003 | High | bugs | M
- **Location:** `web/src/api/search.js:29`
- **Evidence:**
  ```js
  const q = query.toLowerCase()
  return searchIndex.filter(entry =>
    SEARCH_FIELDS.some(field => entry[field]?.toLowerCase().includes(q))
  ).slice(0, MAX_RESULTS)
  ```
- **Why it matters:** Full-text search does raw substring matching with no Arabic normalization, but the indexed Quran text is fully vocalized (pipeline stores AlQuran.cloud text verbatim — see `pipeline/src/quran/parser.py:61` and the vocalized fixtures in `arabic.test.js`, e.g. `'أَوَّلٌۖ'`). A user typing plain "الحمد لله" will not match "ٱلْحَمْدُ لِلَّهِ": every diacritic breaks the match, and even a fully-vocalized query fails on alef-wasla (`ٱ` U+0671) vs plain alef (`ا`). The core search feature over Quran text effectively returns nothing for normal input; `search.test.js` masks this because its mock index is undiacritized. The normalization machinery already exists (`ALEF_VARIANTS` in `web/src/utils/arabic.js:21`) but is only used by `stripLeadingBasmala`.
- **Suggested fix:** Add an Arabic normalizer (strip `\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e8\u0640`, fold `[\u0622\u0623\u0625\u0671]→ا`, optionally unify `ة/ه`, `ى/ي`) in `utils/arabic.js`; apply it to both the query and each indexed field (either normalize once when building the search index in `buildSearchIndex`, storing a parallel normalized field, or normalize inside `searchLocal` on both sides).
- **Verified:** yes

### WEB-004 | Medium | solid | S
- **Location:** `web/src/contexts/FavoritesContext.jsx:96`
- **Evidence:**
  ```js
  setFavorites(prev => {
    ...
    if (deviceId) {
      if (adding) {
        addBookmark(deviceId, surahId, ayahNumber)
      } else {
        removeBookmark(deviceId, surahId, ayahNumber)
      }
    }
    return { ...prev, [key]: next }
  })
  ```
- **Why it matters:** Network side effects are performed inside a `setState` updater, violating React's purity contract for updaters. Under `<React.StrictMode>` (`main.jsx:7`) dev builds invoke updaters twice, firing duplicate POST/DELETE calls; any future concurrent-rendering replay would do the same in production. The mount-time sync effect (lines 64–77) is similarly non-idempotent and re-runs its fire-and-forget `addBookmark` loop on StrictMode remount. The provider also mixes three concerns in one module: localStorage serialization, remote sync/merge policy, and toggle logic.
- **Suggested fix:** Make updaters pure: compute next state only, then issue the API call from the event-handler scope or a dedicated effect that diffs previous/current favorites. Extract `loadFavorites`/`saveFavorites` into `api/favoritesStorage.js` and the merge/sync logic into a plain module so the context only wires React state.
- **Verified:** no

### WEB-005 | Medium | improvements | M
- **Location:** `web/src/contexts/FavoritesContext.jsx:49`
- **Evidence:**
  ```js
  merged[key] = new Set([...(local[key] || []), ...(remote[key] || [])])
  ```
  plus the re-push loop at lines 69–76:
  ```js
  if (!remoteSet || !remoteSet.has(ayah)) {
    addBookmark(did, Number(key), ayah)
  }
  ```
- **Why it matters:** Sync is union-only with no tombstones: deleting a bookmark on device B removes it server-side, but device A still has it in localStorage, so on A's next mount the merge keeps it locally *and* the loop re-adds it to the server. Deletions can never propagate between devices — removed bookmarks resurrect.
- **Suggested fix:** Track deletions (tombstone list or `deleted_at` timestamps via the Worker API) and subtract tombstoned entries during merge instead of blind union; alternatively last-write-wins per bookmark with sync timestamps.
- **Verified:** no

### WEB-006 | Medium | bugs | S
- **Location:** `web/src/contexts/FavoritesContext.jsx:31`
- **Evidence:**
  ```js
  } catch (e) {
    console.error('Failed to save favorites to localStorage:', e)
  }
  ```
- **Why it matters:** When persistence fails (Safari private mode before user interaction, quota exceeded), favorites keep working in-memory for the session and then silently vanish on reload — data loss from the user's perspective, with only a console message. Same pattern in `loadFavorites` (lines 18–21). No UI surface ever learns about the failure.
- **Suggested fix:** Surface storage failure in state (e.g. a `storageUnavailable` flag on the context) and show a one-time banner ("المفضلة لن تُحفظ على هذا الجهاز") when writes fail.
- **Verified:** no

### WEB-007 | Medium | improvements | S
- **Location:** `web/src/components/SearchBar.jsx:84`
- **Evidence:**
  ```js
  to={`/surah/${result.surah_id}`}
  ```
- **Why it matters:** Search results promise a specific ayah ("سورة البقرة — آية ٢٥٥") but the link lands at the top of the surah; the user must re-find the ayah manually. `SurahView` already renders `data-ayah={ayah.number}` nodes (line 127), so the target anchor exists — only the wiring is missing.
- **Suggested fix:** Link to `/surah/${result.surah_id}#ayah-${result.ayah_number}`, give each wrapper div a matching `id={`ayah-${ayah.number}`}` in `SurahView.jsx:125`, and let the existing scroll logic handle positioning.
- **Verified:** no

### WEB-008 | Medium | improvements | L
- **Location:** `web/src/api/search.js:12`
- **Evidence:**
  ```js
  searchIndexCache = allSurahs.flatMap(surah =>
    surah.ayahs.map(ayah => ({ ... })))
  ```
  built on `loadAllSurahs()` (`web/src/api/data.js:47-60`)
- **Why it matters:** The first search triggers fetching all 114 surah files — the entire corpus including full `tafsir_long` for every ayah (dataset ~388MB total) — over the network into memory, then scans it linearly per query. On mobile this means heavy bandwidth, multi-second-to-minute wait (acknowledged by the progress UI in `SearchBar.jsx:55-62`), and a large retained heap. It also makes search unusable offline-first and couples UX latency to total dataset size.
- **Suggested fix:** Precompute a sharded, normalized, minified search index at pipeline time (e.g. one `_search/{a-z}.json` shard with only `surah_id/ayah_number/tokens`), fetch shards lazily per query prefix; or move search behind the Worker/D1. Short term: drop `tafsir_long` full text from the in-memory copy after indexing.
- **Verified:** no

### WEB-009 | Medium | improvements | S
- **Location:** `web/src/api/data.js:52`
- **Evidence:**
  ```js
  for (let i = 0; i < total; i++) {
    const surahId = surahIndex[i].surah_id
    const surahData = await loadSurah(surahId)
    loaded.push(surahId)
  ```
  (loop awaits each fetch sequentially)
- **Why it matters:** Index build time equals the sum of 114 sequential RTTs plus transfer time. Batched concurrency (e.g. 6–8 parallel fetches) would cut wall-clock time roughly by the batch factor with trivial code change; per-surah caching in `loadSurah` already makes this safe.
- **Suggested fix:** Replace the serial loop with a small worker-pool map (e.g. chunks of 8 `Promise.all`), preserving ordered output and the `onProgress(done, total)` callback.
- **Verified:** no

### WEB-010 | Medium | solid | S
- **Location:** `web/src/contexts/DataContext.jsx:16`
- **Evidence:**
  ```js
  useEffect(() => {
    const did = getDeviceId()
    if (!did) return
    fetchProgress(did).then(rows => { ... setReadingProgress(map) })
  }, [])
  ```
  alongside index loading (lines 12–14) and `fetchSurah` passthrough (lines 29–31)
- **Why it matters:** DataProvider mixes three unrelated responsibilities: Quran index loading/caching, remote reading-progress sync, and exposing a zero-value passthrough wrapper around `loadSurah` (the `useCallback` adds nothing). Progress syncing belongs with the same domain as bookmarks (both Worker-backed per-device state) and duplicates the sync pattern that `FavoritesContext` implements separately.
- **Suggested fix:** Split into `IndexContext` (index + `fetchSurah`) and a `ProgressContext` mirroring `FavoritesContext`'s structure, or extract shared per-device sync hooks (`useRemoteSync(fetcher, mapper)`).
- **Verified:** no

### WEB-011 | Low | bugs | S
- **Location:** `web/src/components/SurahView.jsx:54`
- **Evidence:**
  ```js
  }, [surah])
  ```
  for the effect reading `readingProgress[surahId]` (line 50)
- **Why it matters:** Scroll restoration runs once when `surah` resolves, using whatever `readingProgress` snapshot exists at that moment. On a cold deep-link where `fetchProgress` resolves after the (possibly multi-MB) surah JSON, progress is still `{}` and no restore happens — deliberately ignoring the exhaustive-deps warning without handling the late-arrival case.
- **Suggested fix:** Keep a `restoredForRef` guard and re-run the effect on `[surah, readingProgress]`, restoring only once per surah when the value first becomes available.
- **Verified:** no

### WEB-012 | Low | bugs | S
- **Location:** `web/src/contexts/DataContext.jsx:25`
- **Evidence:**
  ```js
  fetchProgress(did).then(rows => {
    if (!rows) return
    const map = {}
    for (const r of rows) { map[r.surah_id] = r.last_ayah_number }
    setReadingProgress(map)
  })
  ```
- **Why it matters:** If the server progress fetch resolves slowly (slow edge/network) *after* the user has already scrolled far enough for `saveReadingProgress` to update local state, this handler replaces the whole map with the older server snapshot — clobbering fresher local progress until the next PUT. Narrow window and self-healing server-side, hence Low.
- **Suggested fix:** Use the updater form and take the max per surah (`setReadingProgress(prev => mergeMax(prev, map))`), or ignore responses for sessions where local saves already occurred.
- **Verified:** no

### WEB-013 | Low | clean-code | S
- **Location:** `web/src/contexts/ThemeContext.jsx:10`
- **Evidence:**
  ```js
  return localStorage.getItem(STORAGE_KEY) || 'light'
  ```
- **Why it matters:** The stored value is applied verbatim to `data-theme` with no validation against `THEMES`. A tampered/stale value (e.g. from a removed theme) yields `data-theme="blue"` which matches no CSS block in `index.css` (only light default, `[data-theme="dark"]`, `[data-theme="sepia"]`) — variables silently resolve to nothing and styling degrades until the user cycles the toggle.
- **Suggested fix:** `const t = localStorage.getItem(STORAGE_KEY); return THEMES.includes(t) ? t : 'light'`.
- **Verified:** no

### WEB-014 | Low | clean-code | S
- **Location:** `web/src/components/SurahView.jsx:68`
- **Evidence:**
  ```js
  timer = setTimeout(() => saveReadingProgress(surahId, num), 1500)
  ...
  { rootMargin: '0px 0px -75% 0px', threshold: 0 }
  ```
- **Why it matters:** Two unnamed tuning constants control reading-progress semantics (debounce window; "top quarter of viewport counts as read"). Future readers can't tell debounce-from-delay or adjust the viewport threshold safely; they're also untestable in isolation.
- **Suggested fix:** Hoist to named constants at module top (`PROGRESS_DEBOUNCE_MS = 1500`, `PROGRESS_ROOT_MARGIN = '0px 0px -75% 0px'`) like `TOTAL_SURAHS` already is (line 11).
- **Verified:** no

### WEB-015 | Low | clean-code | S
- **Location:** `web/src/App.jsx:13`
- **Evidence:**
  ```js
  const SearchBar = lazy(() => import('./components/SearchBar'))
  ```
  routed as `<Route path="/search" element={<SearchBar />} />` (line 29)
- **Why it matters:** The component rendered as the full `/search` page — with its own `h1` "البحث في القرآن والتفسير" (`SearchBar.jsx:32`), results list, and error states — is named `SearchBar`, the conventional name for an inline input widget. Misleads readers navigating the codebase.
- **Suggested fix:** Rename file/component to `SearchPage.jsx` (update the lazy import in `App.jsx`).
- **Verified:** no

### WEB-016 | Low | improvements | S
- **Location:** `web/src/api/data.js:5`
- **Evidence:**
  ```js
  const FETCH_TIMEOUT_MS = 10_000
  ```
  applied uniformly in `fetchJson` (line 9)
- **Why it matters:** Every surah file — including large ones (Al-Baqarah with full tafsir is among the biggest in a ~388MB dataset) — must fully download within 10s or the load aborts into the error state. On slow mobile connections legitimate loads of multi-MB files get killed; the user sees "خطأ … timed out" despite nothing being wrong.
- **Suggested fix:** Scale the timeout by response size expectations (e.g. 10s base + Ns per MB via streaming progress), raise the floor for surah files vs `_index.json`, or use `AbortSignal.timeout` with per-resource budgets.
- **Verified:** no
