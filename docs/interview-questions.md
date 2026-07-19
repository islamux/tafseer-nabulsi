# Senior Engineering Interview: Tafsir Nabulsi Project

> **Format:** 4 rounds × 25+ questions = 100+ total
> **Target:** Junior→Mid candidate
> **Style:** FAANG/Big Tech — architectural depth, system design, debugging, and coding
> **Project:** Arabic React 19 SPA (Vite + Tailwind) for Quran + Dr. Nabulsi's tafsir, fed by a Python scraping pipeline, with a staged Supabase backend

---

## Round 1: Architecture & System Design (25 questions)

*Tests: system thinking, trade-off awareness, big-picture understanding*

### Q1. Why a Vite SPA instead of Next.js SSG/SSR for this project?

**A:** The app is a highly interactive reading experience — lazy-loaded surah data, client-side search across 6,000+ ayahs, expandable tafsir, favorites in localStorage, three themes. A Vite SPA keeps everything client-side with zero server cost: there's no Node process to run. SSG (like the sister Asma project) shines for mostly-static content pages, but here the search engine builds an in-memory index and filters on every keystroke — that's inherently a client workload. SSR would add a server for no benefit since all data ships as static JSON. The trade-off: weaker SEO and no per-route pre-rendering, which is acceptable for this app.

### Q2. Why client-side data loading from static JSON instead of a backend API?

**A:** The content is immutable — the Quran text and tafsir don't change between pipeline runs. The 114 static JSON files are served from Cloudflare R2 (production) or local disk (dev), so the "API" is just a static file server with CDN caching — effectively free and infinitely scalable. A backend API would add latency, hosting cost, and a failure surface for data that never changes dynamically. The only dynamic data (favorites, future bookmarks) is per-user and either lives in localStorage now or will live in Supabase later. Static files for content + Supabase for user data is the right split.

### Q3. Walk me through the full data pipeline from source to browser.

**A:** Two upstream sources feed the Python `pipeline/`: Quran text (Uthmani XML from Tanzil.net, fetched + disk-cached by `quran/fetcher.py`, parsed by `quran/parser.py`) and tafsir lessons (scraped from nabulsi.com by `tafsir/scraper.py`, with `tafsir/lesson_parser.py` using Arabic regex to map lesson titles like "الآيات 1-5" → ayah ranges, and `content_extractor.py` cleaning the HTML body). `merge/builder.py` joins Quran + tafsir + optional `media/mapper.py` links into one minified JSON per surah. Output (`output/1.json`…`114.json` + `_index.json` + `_report.json`) is pushed to Cloudflare R2 by `scripts/upload_to_r2.py` (under the `data/` prefix). At runtime the SPA `fetch()`es these files on demand via `VITE_DATA_BASE` (R2 in prod, `/data` in local dev after `pnpm copy-data`).

### Q4. Why host the data on Cloudflare R2 instead of baking it into `web/public/data/`?

**A:** The dataset is ~388MB — too large to commit to git (bloats every clone, breaks gh-pages deploy limits) and too rarely updated to deserve a per-build copy. R2 hosts the JSON under `data/*.json`; the web app reads `import.meta.env.VITE_DATA_BASE` and falls back to `/data` for local dev (where `pnpm copy-data` populates `web/public/data/` from `pipeline/output/`). `copy-data` stays as the local-dev bridge because the dev server reads from disk — no round-trip to R2 needed while iterating. The trade-off: prod builds must set `VITE_DATA_BASE` at build time (Vite inlines env vars into the bundle), and R2 needs CORS configured for the gh-pages origin. Worth it for free, CDN-cached, git-clean data delivery.

### Q5. Why four React Contexts (Theme, Favorites, Data, Search) instead of Redux or Zustand?

**A:** Each context owns one concern with a tiny surface: Theme (`theme`, `toggleTheme`), Favorites (`toggleFavorite`, `isFavorite`), Data (`index`, `indexError`, `fetchSurah`), Search (`search`, `isBuildingIndex`, `searchProgress`). Redux would be ~10× the boilerplate for this. The "Context re-renders all consumers" problem is negligible — there are only a handful of consumers each. Splitting into four (rather than one mega-context) is SRP: a search status change doesn't re-render the theme toggle. YAGNI wins; if cross-cutting global state grows (auth, real-time sync), then reach for Zustand.

### Q6. How does the app handle RTL layout? What could break if someone ignored RTL?

**A:** `index.css` sets `html, body { direction: rtl; text-align: right; }`, and the whole UI is Arabic. Tailwind utility classes are mostly direction-agnostic (flex, gap, padding), so mirroring "just works" for the common cases. The risk area is asymmetric styling: anything using explicit left/right instead of logical properties (`margin-inline-start`, `padding-inline-end`) would render on the wrong side. Icons and the back-arrow direction also need RTL-aware placement. Because the app is Arabic-only, there's no `dir="ltr"` fallback path today — adding English would require logical properties throughout.

### Q7. Favorites live in localStorage. What are the limitations of this choice?

**A:** localStorage is per-browser, not per-user: favorites don't sync across devices, are lost if the user clears site data, and are capped at ~5MB per origin (fine for ayah references, but unbounded growth would eventually throw). There's no backup, export, or share. The `FavoritesContext` already wraps all access in try/catch so it degrades gracefully (empty favorites) when storage is full or blocked (incognito). The staged Supabase `bookmarks` table is the planned upgrade for cross-device sync once auth is wired.

### Q8. The Supabase schema (`profiles`, `bookmarks`, `reading_progress`) exists but isn't connected to the web app. Why stage it this way?

**A:** It's forward architecture: define the data model and security (RLS policies, triggers) before building the UI that consumes it. This lets the schema be reviewed, tested in isolation, and deployed to Supabase independently. The web app still works fully without it (favorites in localStorage). When auth lands, the migration is additive — swap localStorage reads/writes for Supabase calls, keeping the same `FavoritesContext` interface. The risk of staging early is schema drift if requirements change, but for a solo/small project that risk is low.

### Q9. What happens if a user visits `/surah/999` (an invalid surah id)?

**A:** `useParams()` gives `id = "999"`, `parseInt` → `999`. `SurahView` calls `fetchSurah(999)` → `loadSurah` does `fetch('/data/999.json')`, which 404s. The promise rejects, the `.catch` sets `error`, and the component renders the error branch: an Arabic "خطأ" message with a link back to `/`. There's no upfront validation that `surahId` is in 1–114 — the failure surfaces as a fetch error. A defensive improvement would be to check `index.find(s => s.surah_id === surahId)` first and short-circuit to a not-found state before fetching.

### Q10. How does the three-theme system work? Is there a flash of the wrong theme on load?

**A:** `ThemeContext` lazily initializes `useState(() => localStorage.getItem('tafsir-theme') || 'light')`, and a `useEffect` sets `document.documentElement.setAttribute('data-theme', theme)` + persists to localStorage on every change. CSS defines `:root` (light) and `[data-theme="dark"]` / `[data-theme="sepia"]` blocks overriding CSS variables (`--accent`, `--bg-primary`, etc.). Because the theme is applied in a `useEffect` (after first paint) rather than before, there **is** a brief flash of the default light theme if the user prefers dark/sepia. A production fix is an inline `<script>` in `index.html` that reads localStorage and sets `data-theme` synchronously before paint.

### Q11. Why lazy-load each surah on demand instead of bundling all 114 JSONs into the JS?

**A:** Bundling ~50MB of JSON into the JavaScript bundle would catastrophic for first load. Instead `_index.json` (tiny surah list) loads once at startup, and each `N.json` is `fetch`ed only when the user opens that surah, then cached in a `Map` in `api/data.js`. The cost is a per-surah network request on first open (mitigated by caching). The one exception is search, which must load all 114 to build its index — but that's deferred until the user actually searches, with a progress indicator.

### Q12. The search builds its index on the *first* search, not at app startup. Why?

**A:** Building the index means loading all 114 surah files (~50MB) — expensive. Most users browse a few surahs and never search. Deferring index construction to first search avoids penalizing everyone at startup. `SearchContext.search()` checks if `searchIndex` is null; if so it sets `isBuildingIndex`, streams progress via `onProgress`, caches the result in both React state and a module-level `searchIndexCache`, then runs the query. Subsequent searches reuse the cached index and are instant.

### Q13. Why a separate `api/` layer (`data.js`, `search.js`) instead of `fetch` calls inside components?

**A:** Separation of concerns: components render and handle UX; `api/` knows data shapes, caching, and algorithms. `data.js` owns the HTTP cache (`indexCache`, `surahCache` Map); `search.js` owns the index construction and matching algorithm. This makes the logic unit-testable (`search.test.js` tests `searchLocal` with a mock index, no React, no network), reusable, and swappable — if the data source moves to a real API, only `api/data.js` changes. It's the Single Responsibility Principle; see `docs/clean-code-summary.md`.

### Q14. How do the disk cache and 1 req/sec rate limit make the pipeline safe and resumable?

**A:** `utils/rate_limit.py` enforces one request per second to nabulsi.com — polite scraping that avoids hammering their server (and getting IP-banned). `utils/cache.py` writes every HTTP response to disk, so re-runs read from cache instead of re-fetching. Combined with the `--resume` CLI flag (per-surah checkpointing), a failed full build can restart from where it stopped without re-downloading completed surahs. This makes a multi-hour full rebuild robust to network blips and interruptions.

### Q15. Could this app benefit from a PWA / service worker? How would you add it?

**A:** Yes — strongly. The content is static JSON, so a service worker could cache `_index.json`, visited surah JSONs, fonts, CSS, and the JS bundle, enabling offline reading. The search index (~50MB) is the big-ticket item; caching it enables offline search too. Add `vite-plugin-pwa`, register the SW in `main.jsx` (with a mounted guard), and use a runtime cache strategy for `/data/*.json` (stale-while-revalidate). Considerations: SW versioning, cache eviction (50MB × users adds up), and the update-flow UX (notify on new content).

### Q16. How would you add internationalization (English UI) to an Arabic-only RTL app?

**A:** The UI strings are currently hardcoded Arabic in JSX. To i18n: extract all UI strings into locale files (`ar.json`, `en.json`), wrap text in a `t('key')` function (e.g. `react-i18next`), and toggle `<html dir>` and `lang` per locale. The Quran text, tafsir, and surah names stay Arabic regardless of locale. The harder part is layout: switching to `dir="ltr"` for English means auditing every asymmetric style and converting to CSS logical properties (`margin-inline-start`, etc.). The CSS-variable theming is locale-independent, so themes survive the switch.

### Q17. Why a hybrid of Tailwind utility classes *and* CSS custom properties for theming?

**A:** Tailwind handles layout/spacing/typography utilities (fast to write, consistent). CSS custom properties handle theming because they can be overridden per `[data-theme]` selector at runtime — flipping one attribute re-skins the whole app. Tailwind alone can't do dynamic multi-theme switching without regenerating classes; CSS vars alone would lose Tailwind's utility ergonomics. The `@layer components` block in `index.css` bridges them: semantic classes like `.text-accent { color: var(--accent); }` let components use a Tailwind-style class that resolves to a theme-aware variable. Best of both.

### Q18. How does the app handle XSS risk given that tafsir text is scraped from a third-party site?

**A:** The tafsir arrives as plain text (not HTML) in the JSON `tafsir_long` / `tafsir_short` fields, and React renders it via `{ayah.tafsir_long}` (text interpolation), which auto-escapes. So there's no `dangerouslySetInnerHTML` and no script-injection vector in the web layer. The real sanitization responsibility is in the pipeline's `content_extractor.py`, which strips HTML to text during scraping. If a future feature ever rendered tafsir as HTML, you'd need explicit sanitization (strip `<script>`, event handlers, `javascript:` URIs) at build time, never trusting scraped input.

### Q19. This is a client-rendered SPA. How would you add SEO / social sharing (Open Graph)?

**A:** SPAs are weak at SEO because crawlers see an empty `<div id="root">`. Options: (1) Add static OG/Twitter `<meta>` tags in `web/index.html` for a single canonical preview (simplest). (2) Per-route meta requires either pre-rendering (e.g. `vite-plugin-prerender` or `react-snap`) to emit static HTML per surah, or a serverless OG-image function. (3) For full SEO, migrate to SSG (the sister project's Next.js approach). Given the app's nature, a pragmatic start is static meta tags + a sitemap.xml; full pre-rendering if organic search matters.

### Q20. Why one JSON file per surah (`1.json`…`114.json`) instead of a single big file?

**A:** Per-surah files enable lazy loading — `loadSurah(2)` fetches only `2.json`, not a 50MB blob. They also map cleanly to the pipeline's `--surah N` CLI (build/test one surah independently) and make per-surah rebuilds cheap (a `git diff` touches one file). A single file would force the client to download everything before showing anything. The cost is 114 HTTP requests for a full search-index build — acceptable, and parallelizable. `_index.json` separately holds the lightweight surah list for the home grid.

### Q21. `_report.json` shows 91.7% tafsir coverage with 517 gaps. How would you close them?

**A:** The gaps are listed in `_report.json` as `surah:ayah` pairs (e.g. `1:3`, `2:42`). Closing them is a **pipeline** problem, not a web problem: each gap means the scraper found no lesson covering that ayah. Steps: (1) inspect whether nabulsi.com has a lesson whose Arabic title encodes that ayah range but the regex in `lesson_parser.py` missed it; (2) check if the lesson exists but the surah→category mapping in `surah_index.py` is wrong; (3) some ayahs genuinely have no dedicated lesson (acceptable gaps). Run `--resume` after parser fixes, regenerate `_report.json`, and the web app reflects new coverage automatically.

### Q22. The JSON schema includes a `media` field (`audio_url`, `video_url`). How would you surface audio/video in the UI?

**A:** Add an `<audio>` / `<video>` element inside `AyahCard`, rendered conditionally when `ayah.media?.audio_url` exists. HTML5 media with custom controls, lazy-loaded per ayah (don't preload 6,000 audio files). The pipeline's `media/mapper.py` already merges optional `media.csv` links into the JSON, so the data path is ready. Considerations: file sizes (stream, don't bundle), mobile bandwidth, a single global "now playing" state to prevent overlapping audio, and accessibility (captions/transcripts). The web-app design spec lists audio/video as a future enhancement.

### Q23. What happens if `localStorage` is unavailable (incognito, storage full, disabled)?

**A:** Both contexts guard every access. `FavoritesContext.loadFavorites()` wraps `getItem`/`JSON.parse` in try/catch and returns `{}` on failure; `saveFavorites()` wraps `setItem` in try/catch and logs. `ThemeContext`'s lazy initializer reads localStorage without a guard but falls back to `'light'` via `||`. The app degrades gracefully: favorites appear empty (no crash), theme defaults to light. The only edge: if `setItem` throws *after* state was set, in-memory state and storage diverge — the catch prevents a crash but the next refresh loses that favorite.

### Q24. How would you add analytics to a static SPA with no backend?

**A:** Integrate a privacy-friendly, script-based analytics tool (Plausible, Umami) via a `<script>` tag in `index.html`. Track page views (SPA route changes need manual `track` calls on navigation, since there's no full page reload), search queries (from `SearchBar` on submit), favorite toggles, and theme preference. For SPA route tracking, hook into react-router's location change (a small `useEffect` on `useLocation().pathname`). Avoid Google Analytics if you want cookieless/privacy-first. All of this runs client-side with no server of your own.

### Q25. What would you do differently if you were building this from scratch?

**A:** Three things: (1) Add a small inline script in `index.html` to apply the saved theme before paint (eliminates the theme flash — a known current limitation). (2) Validate the 114 pipeline JSON files against a schema (Zod/Ajv) at build time — today a malformed file fails opaquely. (3) Co-locate TypeScript types from day one (the project is plain JSX); the data shapes (`surah_id`, `ayahs[].number`, etc.) are a stable contract that types would document and protect. The pipeline/web separation and Context architecture I'd keep as-is.

---

## Round 2: React & Client-Side SPA Deep Dive (25 questions)

*Tests: component model, hooks, rendering, router specifics*

### Q26. Explain the provider nesting in `App.jsx`. Why this exact order?

**A:** `ErrorBoundary > ThemeProvider > FavoritesProvider > DataProvider > SearchProvider > BrowserRouter > Layout > Routes`. The rule: a context consumer must sit *inside* its provider. `ThemeProvider` is outermost so even error fallbacks get a theme. `DataProvider` must wrap `SurahView` (which calls `useData()`). The order among the data providers is mostly flexible, but clustering the app-state providers (Theme/Favorites) outside the data providers (Data/Search) is a reasonable convention. `BrowserRouter` is inside the providers so router-driven components can consume them; `Layout` wraps `Routes` so the header chrome persists across route changes.

### Q27. `ErrorBoundary` is a class component when everything else is a function component. Why?

**A:** Error boundaries are the one React feature that still *requires* a class component — there's no hook equivalent for `getDerivedStateFromError` / `componentDidCatch`. Function components can't catch render errors in their subtree. `ErrorBoundary` overrides `getDerivedStateFromError` to flip `hasError`, and `render()` returns a `<StateMessage>` fallback instead of `this.props.children` when an error occurred. It's the only class in the codebase; you'll rarely write another.

### Q28. `SurahView`'s `useEffect` uses a `let cancelled = false` flag with a cleanup function. Why?

**A:** Data loading is async. If the user navigates away before `fetchSurah(id)` resolves, the component unmounts — but the `.then()` still fires later and tries to `setSurah` on an unmounted component (a React warning and potential bug). The `cancelled` flag, flipped to `true` in the cleanup `return () => { cancelled = true }`, makes every `.then`/`.catch`/`.finally` guard with `if (!cancelled)`. So late-arriving results are ignored after unmount. This is the standard "cancel async work on unmount" pattern.

### Q29. How does `useParams()` connect to the `/surah/:id` route?

**A:** `App.jsx` declares `<Route path="/surah/:id" element={<SurahView />} />`. The `:id` is a URL parameter. react-router parses the current URL (`/surah/2`) and `useParams()` inside `SurahView` returns `{ id: "2" }`. The component then `parseInt(id, 10)` → `2` to use as the surah id. Route params are strings, so the parse is necessary before passing to `fetchSurah`. Navigating to `/surah/5` re-renders `SurahView` with a new `id`, re-triggering the effect.

### Q30. What goes wrong if you call `setSurah(data)` without the `cancelled` guard?

**A:** Two things. (1) A React warning: "Can't perform a state update on an unmounted component" — harmless but noisy. (2) More subtly, if the user navigated from surah 2 to surah 5 and surah 2's fetch resolves *after* surah 5's, you'd briefly render surah 2's data on the surah 5 page (a stale-response race). The `cancelled` flag discards the late result of the *previous* effect run, and the `finally` only updates `loading` if still mounted — preventing both issues.

### Q31. `AyahCard` receives `{ ayah, surahId }` as props, but `useFavorites()` from context. Why not get everything from context?

**A:** The ayah data is specific to *this* card — passing it as a prop makes `AyahCard` reusable and explicit about its input (one ayah, one surahId). Favorites, by contrast, are global app state shared across many cards — that's exactly what context is for. The principle: per-instance data → props; shared app state → context. Putting `ayah` in context would force a single "current ayah" global, which makes no sense when rendering 286 cards at once.

### Q32. Both `SearchBar` and `SurahList` have a text input. How do their patterns differ?

**A:** `SurahList`'s filter input is a *controlled* component: `value={filter}` + `onChange={e => setFilter(e.target.value)}`, filtering the already-loaded index instantly on every keystroke (synchronous, in-memory). `SearchBar`'s query is also controlled (`value={query}`), but the actual search runs on Enter (`onKeyDown` → `handleSearch`) and is *async* (`await search(query)`) because it may need to build the index first. So one is instant local filtering; the other is deferred, potentially-expensive search with loading state.

### Q33. `useTheme()`, `useFavorites()`, `useData()`, `useSearch()` all throw if called outside their provider. Why?

**A:** Each custom hook does `const ctx = useContext(XContext); if (!ctx) throw new Error('useX must be used within XProvider'); return ctx`. When a provider isn't in the tree, `useContext` returns the default value (which is `undefined` since `createContext()` was called with no default). Throwing a descriptive error turns a silent "cannot read property of undefined" into an actionable message pointing at the missing provider — a debugging affordance. The fix is always to wrap the component in the right provider higher in the tree.

### Q34. Why is favorites state an object whose values are `Set`s, instead of a flat array of `{surah, ayah}`?

**A:** The two common lookups are "toggle this ayah" and "is this ayah favorited?" — both keyed by `(surahId, ayahNumber)`. An object keyed by surahId with a `Set` of ayah numbers makes `isFavorite` an O(1) `set.has(n)` instead of an O(n) array scan, and prevents duplicates for free. A flat array would need `.some()` on every render of every `AyahCard` — expensive across a 286-ayah surah. The trade-off is serialization complexity (Sets can't go straight to JSON), handled by `loadFavorites`/`saveFavorites`.

### Q35. `toggleFavorite` copies the `Set` *and* the object before mutating. Why not mutate in place?

**A:** React decides whether to re-render by reference equality of state. If you mutate the existing object/set in place (`favorites[key].add(n)`), it's the *same reference*, so React may skip the update. The immutable pattern — `const next = new Set(current); next.add(n); return { ...prev, [key]: next }` — produces new references for both the changed Set and the parent object, guaranteeing React detects the change. Rule of thumb: never mutate state; copy, change the copy, return the copy.

### Q36. Why are `toggleFavorite`, `isFavorite`, and `search` wrapped in `useCallback`?

**A:** `useCallback` memoizes a function so it keeps the same reference across renders. This matters because these functions are passed down via context `value={{...}}` or to child components; without memoization, every provider render would create new function identities, causing all consumers to re-render unnecessarily. `useCallback` with the right dependency array (`[]` for stable fns like `toggleFavorite` that only use the setter; `[favorites]` for `isFavorite` which reads current state) keeps the reference stable while staying correct.

### Q37. What's the difference between `useState(loadFavorites)` and `useState(loadFavorites())`?

**A:** `useState(loadFavorites)` passes the *function* — React calls it once, lazily, on the first render only. `useState(loadFavorites())` calls `loadFavorites()` immediately on *every* render (even though React discards the result after the first), wasting work (reading localStorage + parsing JSON on every render). The function form is the "lazy initializer" — ideal when initial state requires expensive computation or side-effect reads (like localStorage). The value form runs every time.

### Q38. `DataContext` loads the index inside `useEffect`, not via a lazy `useState` initializer. Why?

**A:** `loadIndex()` is async (returns a Promise), but `useState` initializers must be synchronous. You can't `await` in a `useState(() => ...)`. So the pattern is: start with `index = []` (empty), trigger the fetch in `useEffect(() => { loadIndex().then(setIndex).catch(setIndexError) }, [])`, and let the component render a `Spinner` while `index.length === 0`. Async initial state always needs the effect + loading-state dance; sync lazy init is only for synchronous reads (like localStorage).

### Q39. There are two caches for the search index: a module-level `searchIndexCache` in `search.js` and `searchIndex` state in `SearchContext`. Why both?

**A:** They serve different scopes. `searchIndexCache` (module-level in `api/search.js`) survives across `SearchProvider` mount/unmount cycles and across React's reconciliation — it's the durable, shared cache. `searchIndex` (React state in `SearchContext`) is what triggers re-render and is scoped to the provider's lifetime. `buildSearchIndex` checks the module cache first (`if (searchIndexCache) return searchIndexCache`) to avoid rebuilding even if React state was reset. The module cache is the source of truth; the state mirrors it for reactivity.

### Q40. Why was `DataContext` and `SearchContext` split into two separate contexts?

**A:** Single Responsibility. `DataContext` owns the surah *index* and per-surah *fetching*; `SearchContext` owns the *search index* and *query* lifecycle. Before the split (see `docs/clean-code-summary.md`) they were one bloated context, meaning a search status change (`isBuildingIndex`) re-rendered components that only cared about the surah list. Splitting means `SurahList` (uses `useData`) doesn't re-render when search progress updates. Each context changes for one reason — SOLID's SRP applied to state containers.

### Q41. How does `toArabicNum` work, and why is it called in render rather than pre-stored?

**A:** It's `String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d])` — every Western digit is replaced by its Arabic-Indic counterpart via index into a digit string. It's called in render (`{toArabicNum(surah.surah_id)}`) because the source data stores numbers as Western digits and the UI convention is Arabic-Indic numerals; converting at render time keeps the data clean (numbers as numbers) and the display localized. It's a pure function, cheap, so calling it per-render is fine. Storing pre-converted strings in the data would couple display format to storage.

### Q42. Why extract `parseTafsir` into `utils/tafsir.js` instead of inlining it in `AyahCard`?

**A:** Three reasons: (1) Testability — `tafsir.test.js` unit-tests it in isolation, no React needed. (2) Reusability — if another component needs the year/body split, it imports the function. (3) Component clarity — `AyahCard` is already busy with rendering; pulling the date-stripping logic out keeps it focused on presentation. The convention (from `clean-code-summary.md`): "components render; utils compute." Pure logic lives in `utils/`, side-effectful data access in `api/`.

### Q43. How would you prevent `SurahList` from re-rendering when an unrelated context (e.g. favorites) changes?

**A:** `SurahList` consumes only `useData()`, so it already doesn't re-render on favorites changes (separate context). The general tools if it did: (1) `React.memo(SurahList)` to skip re-renders when its props are unchanged (it has none, so effectively skips when parent re-renders for unrelated reasons). (2) Split contexts so each component subscribes only to what it needs. (3) Selective context value (pass a slice, not the whole store). For this app's scale, the four-context split already keeps re-renders minimal — `memo` would be premature.

### Q44. What if `SearchProvider` were placed *outside* `DataProvider` in `App.jsx`?

**A:** It would still work — `SearchContext` doesn't consume `DataContext` via the hook (it imports `loadAllSurahs` from `api/data.js` directly). So the nesting order between `DataProvider` and `SearchProvider` is not load-bearing. What *would* break is putting a consumer outside its provider — e.g., if `SurahView` (uses `useData`) were rendered above `DataProvider` in the tree, you'd get the "useData must be used within DataProvider" error. The current order is conventional (app-state outer, data inner) but only the consumer-inside-provider rule is mandatory.

### Q45. `Layout` uses `<NavLink>` with an `isActive` callback, while `SurahList` rows use `<Link>`. What's the difference?

**A:** `<Link>` is a plain navigation element — renders an `<a>` that changes the route on click, no awareness of the current URL. `<NavLink>` is `Link` plus active-state detection: it receives an `{ isActive }` argument in its `className`/`style`/children, letting you style the link differently when its `to` matches the current route. `Layout` uses `NavLink` for the search button so it highlights when on `/search`. `SurahList` uses `Link` because the rows don't need an active state — the home grid isn't "active" per row.

### Q46. Why does `Layout` receive `{ children }` and where does that come from?

**A:** In `App.jsx`, `<Layout>` wraps `<Routes>...</Routes>`. Whatever the router selects (the matched route's element) becomes `Layout`'s `children`, rendered inside `<main>{children}</main>`. This is the "persistent chrome + routed content" pattern: the header (app name, search link, theme toggle) stays mounted across navigations, while only the `<main>` area swaps. Without it, every screen would have to re-include the header, duplicating markup and losing state in the header components.

### Q47. How would you implement deep-linking to a specific ayah (e.g. `/surah/2#ayah-255`)?

**A:** Two parts. (1) In `AyahCard`, add `id={`ayah-${ayah.number}`}` to the card's wrapper. (2) In `SurahView`, after data loads, scroll to the hash: a `useEffect` reading `useLocation().hash` and calling `document.getElementById(hash)?.scrollIntoView()`. The route `/surah/2` already works; the hash fragment is read client-side. The web-app design spec lists ayah deep-linking as a future enhancement — the building blocks (routing + ids) are all there.

### Q48. `ErrorBoundary` catches render errors but not errors in event handlers or async code. Why?

**A:** React's error boundaries only catch errors thrown during *rendering*, in lifecycle methods, or in constructors of components below them. Errors in `onClick` handlers, `setTimeout` callbacks, or async `.then()`/`await` rejection are *not* caught — they propagate as normal uncaught exceptions. That's why `SurahView` wraps its async `.catch(err => setError(err.message))` explicitly: to capture the fetch failure and route it into state, which *does* trigger a re-render the boundary could catch. Async errors need manual try/catch; boundaries don't cover them.

### Q49. The app has four contexts. How does it avoid prop-drilling without a state library?

**A:** Each context exposes a `use...()` hook (`useTheme`, `useFavorites`, `useData`, `useSearch`). A component deep in the tree (e.g. `AyahCard`) calls `useFavorites()` directly and gets the values — no need to pass `toggleFavorite` down through `SurahView` as props. Context is literally the built-in answer to prop-drilling. The cost is the consumer re-renders when the context value changes, which is why the contexts are split by concern (a single mega-context would re-render everything on any state change).

### Q50. How would you unit-test `FavoritesContext`?

**A:** Two angles (and the project already does both). (1) Test the *serialization* helpers in isolation: feed `loadFavorites`/`saveFavorites` known JSON, assert the Set↔array round-trip, and assert corrupt JSON falls back to `{}`. (2) Test the provider with React Testing Library: render `<FavoritesProvider><TestConsumer/></FavoritesProvider>` where `TestConsumer` calls `useFavorites()`, fire `toggleFavorite`, and assert `isFavorite` flips. The existing `FavoritesContext.test.js` covers the serialization path; a RTL test would cover the React behavior. Mock `localStorage` in jsdom.

---

## Round 3: JavaScript, Data & Python Pipeline (25 questions)

*Tests: language mastery, data layer, build-time vs runtime, the scraping pipeline*

### Q51. The project uses plain JSX with no TypeScript. What are the trade-offs?

**A:** Pros: zero type-config overhead, faster builds, no `.d.ts` friction, simpler onboarding for juniors (the audience of the onboarding guide). Cons: the JSON data contract (`surah_id`, `ayahs[].{number,text,tafsir_short,tafsir_long}`) is undocumented and unchecked — a malformed pipeline output would surface as a runtime `undefined` error rather than a compile error. Refactors are riskier without rename/type safety. The mitigations: runtime validation (Zod) at the data layer, and comprehensive tests. Migrating to TS incrementally (start with `utils/` and `api/`) would be low-risk and high-value.

### Q52. Explain `import { useState } from 'react'` vs `import Spinner from './Spinner'`.

**A:** `useState` is a **named export** — `react` exports many named symbols, and braces pick a specific one. A file can have many named exports. `Spinner` is a **default export** — each module has at most one default, imported without braces under any name you choose (though conventionally the same). `SurahList.jsx` does `export default function SurahList()` (default), while `ThemeContext.jsx` does `export function useTheme()` (named) alongside its default-ish provider. Rule: one default per file (the "main" thing), any number of named exports (helpers).

### Q53. `api/data.js` keeps `indexCache` and a `surahCache` Map at module scope. What are the lifecycle implications?

**A:** Module-level variables persist for the lifetime of the page (until full reload), shared across all callers. This is great for caching — once `loadSurah(2)` resolves, every later `loadSurah(2)` returns the cached promise/value instantly. The risks: (1) memory grows unbounded as the user browses (a Map holding 114 surahs of tafsir is sizeable — acceptable here, problematic at scale); (2) there's no invalidation, so stale data persists until reload (fine for immutable Quran content); (3) it's a hidden global, harder to test/reset. For this app's immutable data, the trade-off is worth it.

### Q54. As the user browses all 114 surahs, the `surahCache` Map grows. When does this become a problem?

**A:** Each cached surah is its full JSON (Quran text + tafsir_long can be large — surah 2's tafsir alone is substantial). 114 surahs cached could reach tens of MB held in memory. On a desktop browser this is fine; on a low-end mobile it could pressure memory and cause eviction/jank. Mitigations if needed: an LRU cap (keep last N surahs), or rely on the HTTP cache + re-fetch on demand. In practice users browse a handful of surahs per session, so the cache rarely fills — the search index (which deliberately loads all) is the bigger memory item.

### Q55. `buildSearchIndex` uses `flatMap`. Why flatten surahs into a flat array of ayahs?

**A:** Searching requires scanning every ayah's text. A flat array (`[{surah_id, surah_name, ayah_number, text, tafsir_*}, ...]`) lets `searchLocal` do one `.filter()` pass over a single list — simple and fast. Keeping the nested surahs→ayahs structure would mean a nested loop (filter surahs, then filter ayahs within each), which is harder to write and reason about. `flatMap` (map each surah to its ayahs, then flatten one level) is the idiomatic "denormalize for querying" transform. The index is built once, queried many times — flattening pays off.

### Q56. `searchLocal` lowercases both the query and each field. Does this affect Arabic search?

**A:** Arabic has no uppercase/lowercase distinction, so `.toLowerCase()` is a no-op for Arabic text — it neither helps nor hurts. For any Latin characters (rare in this data) it makes the search case-insensitive. The real Arabic-search concerns are different: normalization of letter forms (أ/إ/آ, or ي/ى), hamza handling, and diacritic (tashkeel) stripping — none of which the current engine does. So searching for "الرحمن" won't match "الرَّحْمَٰن" if the stored text has diacritics. That's a real gap, addressable with a normalization step in `buildSearchIndex`.

### Q57. What does `Object.fromEntries(SEARCH_FIELDS.map(field => [field, ayah[field] || '']))` accomplish?

**A:** It builds an object dynamically from an array of `[key, value]` pairs. For each field name in `SEARCH_FIELDS` (`['text','tafsir_short','tafsir_long']`), it creates a pair `[fieldName, ayahValue || '']` (defaulting to empty string if missing), then `Object.fromEntries` turns the pairs into `{ text: '...', tafsir_short: '...', tafsir_long: '...' }`. The benefit: if you add a fourth searchable field, you change one constant (`SEARCH_FIELDS`) and both index-building and searching pick it up — DRY. Without it you'd hand-write three property copies.

### Q58. The pipeline is Python while the app is JavaScript. Why split languages?

**A:** Right tool for the job. Python dominates web scraping: `requests` + `beautifulsoup4` + `lxml` are mature, ergonomic, and the ecosystem (rate limiting, caching, regex over Arabic text) is battle-tested. The pipeline runs occasionally (offline, on a developer machine), so its speed matters less than its correctness and library quality. The web app runs in browsers constantly, where JavaScript is mandatory and Vite/React excel. The JSON file is the language-agnostic bridge — each side works in its best language without coupling. This is a textbook separation of concerns across build-time vs runtime.

### Q59. `lesson_parser.py` uses Arabic regex to map lesson titles → ayah ranges (e.g. "الآيات 1-5"). What's the risk?

**A:** The mapping depends on the scraping source (nabulsi.com) consistently titling lessons with patterns like `الآية 24`, `الآيتان 25-26`, `الآيات 1-5`. Risks: (1) titles that deviate from expected phrasing (typos, alternate words like "الأية" without hamza) won't match → coverage gaps; (2) ranges that exceed the surah's ayah count or wrap oddly; (3) Arabic letter normalization (أ vs ا) affecting matches. The 517 gaps in `_report.json` are partly this regex's misses. Improving it (broader patterns, normalization) directly raises coverage.

### Q60. The pipeline rate-limits to 1 request/second. Why, and what's the impact on a full build?

**A:** 1 req/sec is polite scraping — it avoids overloading nabulsi.com's server and triggering IP bans or CAPTCHAs. The impact: a full build touching thousands of lesson pages takes hours (the docs estimate ~5h for a complete fetch), which is why the disk cache + `--resume` are essential — you pay the time cost once, then re-runs are fast. A `--resume` after a network failure continues from the last checkpoint rather than restarting. The trade-off is build time vs being a good scraping citizen; correctness over speed.

### Q61. Why does the pipeline cache every HTTP response to disk?

**A:** Two reasons. (1) **Resumability** — if a 5-hour build dies at hour 4, the cache means re-running picks up where it left off rather than re-fetching 4 hours of pages. (2) **Iteration speed** — when developing/debugging the parser, you re-run constantly; the cache makes those re-runs instant (offline, no network). The trade-off is disk space (cached HTML accumulates) and the risk of serving stale cached content if the source site updates. For immutable lecture content, staleness is a non-issue; the disk cost is acceptable.

### Q62. What failure mode does the `--resume` CLI flag solve?

**A:** A full 114-surah build is long and failure-prone (network drops, a single page 500s, the machine sleeps). Without `--resume`, any mid-build failure means starting over from surah 1. With per-surah checkpointing + the disk cache, `--resume` skips already-completed surahs and retries only the incomplete ones. It turns a fragile "all-or-nothing" multi-hour job into an idempotent, incrementally-completable one. This is essential for any scraping pipeline that touches hundreds of pages.

### Q63. In `merge/builder.py`, what happens to an ayah that has no matching tafsir lesson?

**A:** The ayah still appears in the output JSON (its `text` from Tanzil is preserved), but its `tafsir_short` and `tafsir_long` are empty (or whatever the builder's default is). The web app handles this gracefully: `AyahCard` uses conditional rendering (`{ayah.tafsir_long && ...}`), so an ayah without tafsir simply shows no expand button and no tafsir text — no crash, no broken UI. These empty-tafsir ayahs are exactly the 517 gaps enumerated in `_report.json`. The data layer and UI are both designed to tolerate partial coverage.

### Q64. What's the difference between `_index.json` and `_report.json`, and who consumes each?

**A:** `_index.json` is the **runtime data** — the list of all 114 surahs with metadata (`surah_id`, `name`, `ayah_count`, `has_tafsir`). The web app's `loadIndex()` fetches it to render the home grid. It's small and loaded at startup. `_report.json` is a **build artifact / diagnostic** — coverage stats (`total_ayahs`, `with_tafsir`, `coverage_pct`) and the list of gaps (`["2:42", "2:48", ...]`). No part of the web app reads it; it's for the pipeline operator to assess scraping completeness. Index = product data; report = operations dashboard.

### Q65. The data JSON is currently minified (single-line). Pros and cons vs pretty-printed?

**A:** Pros: smaller files (no indentation whitespace) → faster network transfer and less storage. For 114 files shipped to every client, the savings add up. Cons: unreadable in a text editor or `git diff` — a minified single-line JSON is opaque to review. Notably, the recent data-rebuild commit showed ~54,000 deletions / 106 insertions purely from reformatting pretty → minified, which obscures the *actual* content diff. A middle ground: pretty-print in the repo for reviewability and minify as a build step (`vite` can serve minified assets). Currently the pipeline emits minified directly.

### Q66. `toArabicNum` indexes into a literal digit string `'٠١٢٣٤٥٦٧٨٩'[d]`. Clever or fragile?

**A:** It works and is compact — `d` is a single character `'0'`–`'9'`, and indexing the Arabic-Indic digit string by that character works because `'0'` coerces to index `0`, etc. (string indexing with a numeric-ish char). It's slightly fragile because it relies on char→index coercion; a more explicit version would map via `'0123456789'.indexOf(d)` or a lookup object. But for the constrained input (only `[0-9]` due to the regex), it's correct and fast. The regex guarantees `d` is always one of `0-9`, so the coercion is safe. Acceptable cleverness, well-contained.

### Q67. `parseTafsir`'s regex `/^(\d{4})-\d{2}-\d{2}\s*/` extracts a leading date. What if the tafsir has no date prefix?

**A:** `dateMatch` is `null`, and the function returns `{ year: null, body: tafsirLong }` — the whole string becomes the body, with no year. `AyahCard` renders conditionally on `year` (`{year && <span>{toArabicNum(year)}</span>}`), so a dateless tafsir simply omits the year badge and shows the full text. The function is total — every input (including empty string, which returns `{year: null, body: ''}`) produces a valid output. This is good defensive design: the consumer never has to handle an undefined shape.

### Q68. Why is search a client-side filter instead of a backend search service?

**A:** The content is static and fits in memory (~50MB once loaded). A backend search service would add a server (cost, latency, a failure surface) for data that doesn't change. Client-side search gives instant results after the one-time index build, works offline (once cached), and costs nothing to run. The trade-off is the first-search latency (building the index loads all 114 files) — mitigated by caching and a progress indicator. At this dataset size, client-side is clearly the right call; a backend would only win if the data grew orders of magnitude larger.

### Q69. How would you validate the 114 pipeline JSON files against a schema?

**A:** Add a build-time validation step using a JSON Schema (Ajv) or runtime types (Zod, if ported to a TS build script). Define the contract: top-level `{surah_id: int 1-114, name: string, ayahs: [{number: int, text: string, tafsir_short: string?, tafsir_long: string?}]}`. Run it in the pipeline after `merge/builder.py` (fail the build if any file violates), and optionally in the web app's `loadIndex`/`loadSurah` to catch corrupt files at runtime. Today there's no validation — a malformed file fails opaquely (`JSON.parse` throws or a field reads as `undefined`). Schema validation would be a clear quality win.

### Q70. In the JSON, `surah_id` is a number, but `FavoritesContext` keys its object with `String(surahId)`. Why the conversion?

**A:** Object keys in JavaScript are always coerced to strings — `{ 2: 'x' }` becomes `{ "2": "x" }` implicitly. But `loadFavorites`/`saveFavorites` serialize to JSON and back, and explicit `String(surahId)` makes the key type unambiguous and consistent across the toggle, the check, and serialization. It avoids subtle bugs where a numeric vs string key lookup diverges after a JSON round-trip. Being explicit (`const key = String(surahId)`) is defensive and self-documenting — the key is *always* a string, everywhere.

### Q71. Does fetching the tafsir JSON cause CORS issues? Walk me through when CORS applies and when it doesn't.

**A:** Two cases. **Local dev**: the app and the JSON are both served by Vite from the same origin (`localhost:5173/data/...`) — same-origin, no CORS headers needed. **Production**: the app is on `islamux.github.io` but the JSON is on Cloudflare R2 (`pub-<hash>.r2.dev/data/...`) — cross-origin (different host), so the browser enforces CORS. R2 must be configured with a CORS policy allowing origin `https://islamux.github.io`, methods `GET`/`HEAD`, headers `*`. If CORS is missing or wrong, `fetch()` rejects with a CORS error and the app shows the error state. The base path matters too: Vite's `base: '/tafseer-nabulsi/'` ensures assets resolve under the project subpath, but `VITE_DATA_BASE` is an absolute URL so it's unaffected by `base`.

### Q72. How does the pipeline know which nabulsi.com URL corresponds to each surah (`surah_index.py`)?

**A:** nabulsi.com organizes tafsir lessons by surah under category URLs. `surah_index.py` holds the mapping from each of the 114 surah names to its category URL slug. The scraper fetches that category page, enumerates the lesson (story) links within it, and each lesson's Arabic title is parsed by `lesson_parser.py` into an ayah range. If a surah's mapping is wrong or the site restructured its URLs, that surah gets no tafsir → coverage gaps. This mapping is the bridge between "surah 2" and "the web page listing surah 2's lessons."

### Q73. The `media/mapper.py` + `media.csv` provide optional audio/video links. How are they merged?

**A:** `media.csv` (user-maintained, see `media.csv.example`) rows map `(surah_id, ayah_number)` → `(audio_url, video_url)`. During the merge phase, `mapper.py` loads the CSV into a lookup table, and `builder.py` attaches the matching `media: { audio_url, video_url }` object to each ayah as it assembles the JSON. Ayahs with no CSV entry get empty media fields. It's optional (the CSV can be absent entirely) and additive — the core Quran+tafsir merge doesn't depend on it. This is how audio/video would eventually reach `AyahCard`.

### Q74. Why carry Tanzil.net attribution into `_index.json`?

**A:** Attribution is both an ethical and legal requirement — Tanzil.net provides the Uthmani Quran text for free under terms that ask for credit. Recording the source (and version, e.g. "Uthmani v1.1, Feb 2021") in `_index.json` preserves provenance: anyone inspecting the data knows where the Quran text originated and can comply with the source's license. It's also useful for reproducibility — if a text discrepancy is found, the attribution tells you which source version to check. Good data hygiene; not optional for scraped/imported content.

### Q75. How would you parallelize the pipeline safely without violating the rate limit?

**A:** The 1 req/sec limit is *per target host* (nabulsi.com), meant to be polite. True parallelism to the same host would violate it. Safe options: (1) parallelize the *CPU-bound* parts (parsing, merging) while keeping fetching serial behind the rate limiter — modest win. (2) If two distinct sources exist (Tanzil and nabulsi.com), fetch them concurrently with separate per-host limiters. (3) Cautiously raise the rate (e.g. 2 req/sec with backoff) only if the site tolerates it. The disk cache means you only pay the slow path once, so aggressive parallelism isn't worth the ban risk. Prefer correctness and politeness over raw speed.

---

## Round 4: Problem-Solving, Debugging & System Evolution (25 questions)

*Tests: debugging approach, feature addition, trade-off analysis, code reading*

### Q76. A user reports search returns nothing for a word that clearly exists in the Quran. How do you debug?

**A:** Steps: (1) Network tab — did all 114 `N.json` fetches succeed (200)? A 404 on one breaks index building. (2) Console — any error from `buildSearchIndex`/`searchLocal`? (3) Did `searchProgress` reach 100%, or did index building stall? (4) Inspect the actual query — Arabic text with invisible characters, trailing spaces, or different letter forms (أ vs ا) won't match. (5) Check diacritics: if the stored text is "الرَّحْمَٰن" and the query is "الرحمن" (no diacritics), the current engine won't match — it doesn't strip tashkeel. Likely culprits: diacritics/normalization mismatch, or a silently-failed fetch truncating the index.

### Q77. How would you add a "Random Ayah" button to the home page?

**A:** The challenge: picking a random ayah requires knowing each surah's ayah count (in `_index.json`'s `ayah_count`). Algorithm: pick a random surah weighted/then a random ayah number within `[1, ayah_count]`, then navigate to `/surah/{surahId}`. For deep-linking to the exact ayah, you'd need the hash feature (Q47). A simpler version: random *surah* — pick `index[Math.floor(Math.random() * index.length)]` and `<Link to={`/surah/${id}`}>`. The button is a small client component using `useData()` for the index and `useNavigate()` (or a `<Link>`) for navigation.

### Q78. The first search is slow (loads all 114 files). How would you improve perceived performance?

**A:** The app already shows a progress bar (`searchProgress`) driven by `onProgress(done, total)` during `loadAllSurahs` — that's the right start. Further: (1) parallelize the fetches (Promise pool) to cut wall-clock time, since they're independent. (2) Pre-build the index in the background after first paint (if you expect the user to search), so it's ready before they type. (3) Cache the built index in IndexedDB so returning users skip the rebuild entirely. (4) Show partial results as soon as some surahs are indexed. The current sequential load + progress bar is the baseline; IndexedDB persistence is the highest-leverage upgrade.

### Q79. A surah page shows the spinner forever. What are the likely causes?

**A:** `SurahView` shows `<Spinner />` while `loading` is true, which is only set false in `.finally()`. So forever-spin means the fetch promise never settles — most likely the network request hangs (no response). Causes: (1) the `N.json` file is missing (but that'd 404 quickly → error branch, not spin), (2) the request stalled (flaky network), (3) a bug where `fetchSurah` returns a promise that neither resolves nor rejects. Also check: did the `copy-data` step run, so the file actually exists in `public/data/`? A missing file should 404 → error UI, so true forever-spin points to a hung request or a swallowed rejection. Add a timeout to the fetch for robustness.

### Q80. How would you implement reading progress (last ayah read per surah) — locally and via Supabase?

**A:** Locally: a `useReadingProgress` context mirroring `FavoritesContext` — on ayah view, write `{surahId: lastAyah}` to a localStorage map; show a "continue: surah X, ayah Y" widget on home. This matches the existing localStorage pattern. Via Supabase: the `reading_progress` table (`user_id, surah_id, last_ayah_number, updated_at`) is already defined with an auto-updating `updated_at` trigger. Wire auth, then on ayah view `upsert` into `reading_progress` (RLS ensures users only see their own rows). The context abstraction means the *component* code stays identical; only the storage backend swaps.

### Q81. After deploying to GitHub Pages, the app shows a blank page. What's the most likely cause?

**A:** The Vite `base` path. The app is deployed to `https://islamux.github.io/tafseer-nabulsi/` (a project subpath, not the domain root), so Vite must be configured with `base: '/tafseer-nabulsi/'`. If `base` is `'/'` (the default), the built `index.html` requests `/assets/index.js` and `/data/_index.json` at the domain root, which 404 under the subpath → blank page with console 404s. This is the single most common GitHub-Pages SPA bug. Verify `base` in `vite.config.js`, rebuild, redeploy. The AGENTS.md deploy notes and `docs/how-to-deploy-to-github-pages.md` document this.

### Q82. How would you add keyboard shortcuts (e.g. `/` focuses search, `j`/`k` navigate ayahs)?

**A:** A `useKeyboardShortcuts()` hook mounted once (in `Layout`): a `useEffect` adding a `keydown` listener that checks `e.key` and ignores keypresses when focus is in an input. `/` → focus the search input (query a selector or via a ref/context); `j`/`k` → scroll to next/prev ayah (query `.ayah-card` elements by `offsetTop`). Clean up the listener on unmount. Since the app is a SPA (no page reloads between routes), one global listener suffices, scoped by route if needed (`useLocation`). Keep shortcuts discoverable with a `?` help overlay.

### Q83. The theme flashes light briefly on load even when the user prefers dark. How do you fix it?

**A:** The theme is applied in a `useEffect` (after first paint), so the first paint is always the default light. Fix: add an inline `<script>` in `web/index.html` `<head>` that synchronously reads `localStorage.getItem('tafsir-theme')` and sets `document.documentElement.setAttribute('data-theme', theme)` *before* the React bundle loads and paints. Because this runs before paint, the correct CSS variables apply immediately — no flash. Cost: ~200 bytes of blocking script, negligible. This is the same technique the sister Asma project discusses; it's a known current limitation of this app (noted in the onboarding guide).

### Q84. How would you add a "Copy Ayah" button to `AyahCard`?

**A:** A small client interaction: a button calling `navigator.clipboard.writeText(ayah.text)` with a "copied!" state (`useState` + `setTimeout` to reset after 2s), and a `try/catch` with a `document.execCommand('copy')` fallback for older browsers. Place it next to the favorite heart. The clipboard API requires a user gesture (the click) and secure context (HTTPS — fine on GitHub Pages). Arabic text copies fine. No backend, no context — pure local component state.

### Q85. Someone accidentally committed `web/node_modules/` to git. How do you fix it?

**A:** `git rm -r --cached web/node_modules` (removes from the index, keeps the files on disk), ensure `node_modules/` is in `.gitignore` (it should be), then commit: `git commit -m "chore: stop tracking node_modules"`. If it was already pushed, the history still bloats the repo — a `git filter-repo` or BFG rewrite would purge it, but that rewrites history (coordinate with collaborators). Going forward, `.gitignore` prevents re-adds. Also check that no `dist/` or large data files leaked in the same way.

### Q86. How would you implement per-ayah audio recitation?

**A:** The JSON schema already has `media.audio_url`. In `AyahCard`, conditionally render an `<audio controls src={ayah.media?.audio_url}>` when the URL exists. Lazy-load (only mount the audio element when the user expands/taps play) to avoid 6,000 audio elements. Add a global "now playing" ref in a context so starting one recitation pauses others. Pipeline side: populate `media.csv` with recitation URLs (e.g. from per-ayah recitation APIs) and re-run the merge. Considerations: file size (stream, don't bundle), mobile data, and a fallback if a URL 404s. The data path is ready; it's a UI + data-population task.

### Q87. A user cleared browser data and lost their favorites. Is this expected? How could you prevent it?

**A:** Yes — expected and by design today: favorites live only in localStorage, which clearing site data wipes. There's no backup/export. Prevention options: (1) Add an export/import feature (download favorites JSON, restore from file) — cheap, user-driven. (2) Wire Supabase auth + the `bookmarks` table so favorites sync server-side and survive device wipes — the planned long-term fix. (3) A "merge local + remote on login" strategy so existing localStorage favorites migrate to the cloud on first sign-in. The architecture (FavoritesContext abstraction) is ready for the Supabase swap.

### Q88. How would you add a "Continue Reading" widget on the home page?

**A:** Combine two pieces: (1) a reading-progress store (Q80) holding `{surahId: lastAyah}`, and (2) a small client component on the home page reading that store, showing "سورة {name} — آية {n}" with a link to `/surah/{surahId}`. Since the home (`SurahList`) is already client-rendered and consumes `useData()` for surah names, adding a progress consumer is straightforward. The challenge is only if the home were server-rendered (it isn't). Order the widget by recency (a timestamp alongside the progress) to show the most recent few surahs.

### Q89. The app crashes on Safari iOS. What are likely causes?

**A:** Common iOS Safari gotchas: (1) **localStorage in private mode** — historically Safari threw on `setItem` in private browsing; the try/catch in both contexts should handle it, but verify. (2) **`flatMap`/`Object.fromEntries`** — older Safari versions lacked these; check the Vite `build.target` covers iOS Safari, or add a polyfill. (3) **`navigator.share`/clipboard** — must be called from a user gesture; not currently used but relevant if added. (4) **`backdrop-filter`/sticky header** rendering quirks. (5) **Font loading** — Safari's `font-display: swap` behavior differs, possibly FOIT. Reproduce in Safari + Simulator, read the console error — it's usually a missing API or a localStorage throw.

### Q90. How would you implement a no-flash theme toggle (without the light blink)?

**A:** Inline script in `index.html` `<head>`, running before paint:
```html
<script>
  (function() {
    var t = localStorage.getItem('tafsir-theme') || 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();
</script>
```
This synchronously applies the saved theme before the browser paints, so the first frame is already correct. `ThemeContext`'s existing `useEffect` then keeps it in sync on changes. Optionally honor `prefers-color-scheme` when no stored value exists. Trade-off: ~150 bytes of render-blocking JS, negligible. This single change eliminates the flash entirely.

### Q91. What production monitoring would you add to a static SPA?

**A:** (1) **Analytics** — Plausible/Umami (privacy-first, cookieless) for page views, route changes, search usage, favorite toggles. (2) **Error tracking** — Sentry to capture unhandled promise rejections (fetch failures, JSON parse errors), localStorage quota errors, and render errors caught by the boundary. (3) **Uptime** — a simple ping (UptimeRobot/GitHub Action) hitting the live URL to detect Pages outages. (4) **Build CI** — a GitHub Action running `pnpm build` + `pnpm test` on every PR to catch regressions before deploy. Since there's no server, backend APM doesn't apply — focus on client-side error capture and build gates.

### Q92. `SurahList` filters on every keystroke. At 114 items that's fine — but how would you optimize if it grew to 10,000?

**A:** (1) **Debounce** the filter input (200–300ms) so you don't filter on every keystroke. (2) **Memoize** the filtered list with `useMemo(() => index.filter(...), [index, filter])` to avoid recomputing when unrelated state changes. (3) **Virtualize** the list (`@tanstack/react-virtual`) to render only visible rows — essential past a few hundred items. (4) Move filtering off the main thread (Web Worker) if it blocks. For 114 surahs none of this is needed; the naive `.filter().map()` is instant. The patterns are worth knowing for when scale demands them.

### Q93. How would you convert this static-JSON app to use a backend API?

**A:** Replace `api/data.js`'s `fetch('/data/N.json')` with `fetch('/api/surahs/N')` hitting a real backend (Express/Fastify/Supabase Edge Function), and move the JSON into a database (Postgres). Replace `buildSearchIndex` with a server-side search endpoint (`/api/search?q=...`) using Postgres full-text search or Meilisearch. Trade-offs: you gain dynamic capabilities (auth, sync, real-time updates) but lose zero-cost static hosting and offline friendliness. For this project, static is superior — the content never changes and there's no user-generated content. Only auth/sync (the Supabase piece) justifies a backend, and only for user data, not content.

### Q94. A teammate proposes adding Redux "for better state management." How do you respond?

**A:** Ask: "What problem does Redux solve that the four contexts don't?" Current global state is tiny per context (a theme string, a favorites map, a surah index, a search index). Redux would add a store, reducers, actions, dispatch, middleware, and ~3KB+ of library code, increasing cognitive load for zero benefit at this scale. Context's "re-renders consumers" cost is already mitigated by splitting into four focused contexts. Redux (or Zustand) becomes appropriate only with complex cross-cutting state (auth + real-time sync + inter-dependent slices). Right now, YAGNI applies firmly.

### Q95. The project has 16 vitest tests across 5 files. How would you expand coverage strategically?

**A:** Prioritize by risk-to-effort ratio: (1) **More `api/search.js` tests** — the search algorithm is logic-dense and user-facing; test normalization, edge queries, the 50-cap boundary, empty fields. (2) **`api/data.js` caching** — assert `loadSurah` returns the cached value (mock `fetch`, call twice, expect one fetch). (3) **Context behavior via React Testing Library** — render providers with consumer components, assert `toggleFavorite`/`toggleTheme` effects. (4) **Component smoke tests** — does `SurahList` render the index? Does `AyahCard` show tafsir when expanded? (5) Skip snapshot tests (brittle) and E2E until the unit layer is solid. The existing tests are the right template — extend the dense-logic areas first.

### Q96. What's the migration path to auth + Supabase sync for favorites and reading progress?

**A:** (1) Add Supabase auth (email/OAuth) via `@supabase/supabase-js`. (2) On sign-in, read the user's `bookmarks` and `reading_progress` rows (RLS guarantees isolation). (3) Refactor `FavoritesContext` to write to both localStorage (offline cache) and Supabase (source of truth) — optimistic local update, background sync. (4) On first login, merge existing localStorage favorites into Supabase so nothing's lost. (5) The `reading_progress` trigger auto-maintains `updated_at`. Crucially, the *component* code (`useFavorites()`) stays unchanged — the context abstracts the storage swap. This is exactly why the contexts were designed with clean hooks.

### Q97. How would you implement an "Ayah of the Day" feature with notifications?

**A:** (1) A selection mechanism — deterministic by date (`ayahs[dayOfYear % total]`) so it's stable per day without state. (2) Display on the home page (a highlighted card linking to the ayah). (3) For push notifications: make the app a PWA (service worker + VAPID keys via the Push API), with a serverless cron (GitHub Actions or Supabase Scheduled Function) that picks the day's ayah and sends a push to subscribed users. (4) User opt-in via the browser permission prompt, storing the subscription server-side. Complexity is medium — PWA setup is the prerequisite. Without push, a home-page "ayah of the day" is trivial and needs no backend.

### Q98. You're onboarding a new developer. What's the 5-step guide?

**A:** (1) **Read the onboarding docs** — `docs/onboarding/README.md` through `08` walk the whole app from zero; `AGENTS.md` has commands/conventions. (2) **Run it** — `pnpm install` in `web/`, `pnpm copy-data`, `pnpm dev`. (3) **Trace a surah** — from `web/public/data/2.json` through `api/data.js`'s `loadSurah` → `DataContext` → `SurahView` → `AyahCard`. Understand the lazy-load + cache flow. (4) **Do a guided exercise** — pick one from the onboarding lessons (e.g. change `MAX_RESULTS`, add a route) to touch the real code. (5) **Understand the boundary** — content problems live in `pipeline/` (Python), UI/behavior problems in `web/`. Knowing which side owns what saves hours.

### Q99. The 517 tafsir gaps — is closing them a pipeline fix or a web fix?

**A:** Pipeline. The gaps mean the scraper found no tafsir lesson for those ayahs — the web app faithfully renders what the JSON provides (an ayah with empty tafsir fields, handled gracefully). Closing gaps requires improving `tafsir/lesson_parser.py` (broader Arabic regex), fixing `surah_index.py` mappings, or accepting that some ayahs genuinely lack dedicated lessons. After a pipeline `--resume` + rebuild, the regenerated JSON automatically reflects new coverage in the web app — no web code changes. This is the canonical "is it a web problem or a pipeline problem?" diagnostic from onboarding lesson 07.

### Q100. How would you add cross-device bookmark sync using the existing Supabase RLS setup?

**A:** The `bookmarks` table and its RLS policy (`auth.uid() = user_id`) already exist. Steps: (1) Add Supabase auth to the web app. (2) In `FavoritesContext`, after login, fetch the user's `bookmarks` rows and hydrate the in-memory favorites object. (3) On `toggleFavorite`, optimistically update local state, then `upsert`/`delete` the row in `bookmarks` (the RLS policy ensures a user can only touch their own rows — no extra auth checks in app code). (4) On first login, push any existing localStorage favorites to Supabase. (5) Listen to Postgres changes (Supabase realtime) to sync updates from other devices live. The `FavoritesContext` interface (`toggleFavorite`, `isFavorite`) stays identical — only its internals move from localStorage to Supabase.

---

## Bonus Round: Stretch Questions (5 questions)

*For candidates who finish early or show exceptional depth*

### Q101. The tafsir JSON (~388MB) is minified and no longer committed to git — it's gitignored and served from Cloudflare R2. Walk me through the data flow and why this is the right shape.

**A:** Three layers: (1) `pipeline/` emits one minified JSON per surah into `pipeline/output/` (single-line, `separators=(",", ":")` — no indent, smallest possible byte footprint). (2) `scripts/upload_to_r2.py` pushes every `*.json` to R2 under `data/` with `Content-Type: application/json; charset=utf-8` and a long-lived `Cache-Control: public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800` — browser revalidates daily, CDN caches for a year, serves stale up to a week while revalidating. (3) The web app reads `import.meta.env.VITE_DATA_BASE` (falling back to `/data` for local dev where `pnpm copy-data` populates `web/public/data/`). Why this shape: 388MB doesn't belong in git (bloats clones, breaks gh-pages size limits), the data changes extremely rarely (Quran/tafsir), and R2+CDN gives free, fast, globally cached delivery. Local dev stays self-contained via `pnpm copy-data`. The one gotcha: `VITE_DATA_BASE` is baked at build time, so prod deploys must set it before `pnpm build` — a missing or stale value means the deployed site has no data.

### Q102. How would you make the app fully offline-capable (PWA + IndexedDB)?

**A:** (1) Service worker (via `vite-plugin-pwa`) with a precache for the app shell (HTML/JS/CSS/fonts) and a runtime cache for `/data/*.json` (stale-while-revalidate). (2) IndexedDB to persist surah JSONs and the built search index across sessions — so the 50MB search-index build happens once, ever, not per visit. (3) An "offline-ready" indicator and graceful fallback when a surah isn't cached. (4) SW update flow (notify on new content). The big wins: the search index in IndexedDB eliminates first-search latency on return visits, and cached surahs enable reading offline. The cost: storage management (eviction policy) and SW lifecycle complexity.

### Q103. CSS specificity: a Tailwind class (`text-lg`), a CSS variable (`var(--font-size)`), and an inline style (`style={{fontSize}}`) all set font size. Which wins?

**A:** Inline style wins — inline styles have higher specificity than any selector. Between Tailwind's `text-lg` (a utility class with a concrete value) and a CSS variable consumed by a rule, the one with higher specificity (or later source order, at equal specificity) wins. This matters in `AyahCard`: if it used both a Tailwind size class and an inline style, the inline style would override silently, which can cause confusion. The app mostly avoids this by using semantic classes (`.text-primary`) that read CSS variables, and reserving inline styles for structural values (borders, tints). Consistency beats cleverness here.

### Q104. How would you benchmark the Python pipeline and find its bottleneck?

**A:** (1) `cProfile` the full run: `uv run python -m cProfile -o prof.out -m src.main --all`, then `pstats`/snakeviz to read the flamegraph. (2) Wrap phases with `time.perf_counter()` logs: fetch (network), parse (CPU), merge (CPU), write (I/O). (3) Expected bottleneck: **network I/O** — the 1 req/sec rate limit dominates wall-clock time by design, so "bottleneck" is really "the polite rate limit," not a perf bug. (4) CPU phases (regex over Arabic text, XML parsing) are secondary. (5) For iteration speed, the disk cache already removes network from re-runs, so profile a cached run to see pure CPU. Optimize parsing only if it's meaningfully slow — it likely isn't.

### Q105. `searchLocal` returns `.slice(0, 50)` (hard cap). How would you add pagination/"load more"?

**A:** Two approaches. (1) **Offset pagination** — `searchLocal(query, index, offset, limit)` returns `.slice(offset, offset + limit)`; the UI keeps a `page` state and a "load more" button that increments it. Cheap, but re-runs the filter each time (acceptable at this scale). (2) **Full results + client slice** — `searchLocal` returns *all* matches (or a higher cap like 500), and the UI slices for display, revealing more on demand. This avoids re-filtering but holds more in memory. (3) For relevance, sort matches (e.g. ayah-text matches above tafsir matches) before slicing, so the first 50 are the best. Given the dataset, option 2 (cap higher, paginate client-side) is simplest and fast. The `MAX_RESULTS = 50` constant makes the change a one-line starting point.

---

## Evaluation Criteria

| Area | Junior | Mid | Senior |
|------|--------|-----|--------|
| **Architecture** | Describes what the SPA + pipeline do | Explains SPA vs SSG/SSR trade-offs for this data | Debates static-JSON vs backend, designs the Supabase migration |
| **React** | Reads a component and explains JSX | Identifies provider/consumer ordering, immutable state updates | Redesigns context boundaries, prevents re-render storms |
| **JavaScript/Data** | Traces `loadSurah` → component | Explains the module-level cache trade-offs | Designs schema validation + normalization for Arabic search |
| **Pipeline** | Knows the pipeline produces JSON | Debugs coverage gaps via `lesson_parser` | Improves scraping robustness without violating rate limits |
| **Problem-solving** | Follows debug steps (Q76) | Identifies root cause (e.g. `base` path blank page) | Prevents recurrence (inline theme script, IndexedDB caching) |
| **Security** | Knows React escapes text (no XSS) | Explains why localStorage favorites need RLS for sync | Designs the auth + RLS + optimistic-sync migration |
| **Performance** | Knows lazy loading is fast | Explains the deferred search-index build | Designs offline/PWA + IndexedDB for first-search latency |

---

*End of interview document. 105 questions across 5 rounds.*
