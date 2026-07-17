# 05 — Search

This is the most feature-rich screen in the app, and it pulls together almost everything you've learned so far — components, context, async loading, state — plus two big new ideas: **controlled inputs** and **`async`/`await`**. It also shows why we keep heavy logic in the `api/` layer instead of the component.

---

## What you'll learn

- **Controlled inputs** — letting React own the input's value.
- **`async`/`await`** — cleaner syntax for promises.
- **`useEffect`** (deeper use, recapped in context).
- **Building a search index** — loading all surahs once and searching fast.
- The **search algorithm** itself (`filter` + `some` + `slice`).
- **Separating concerns** — why the engine lives in `api/search.js`, not the component.

**Prerequisite JavaScript:** promises (lesson 02), string methods, and `.includes()`.

## The feature

Open the search page (the search icon in the header). Type a word and press Enter. The app searches every ayah's text *and* its tafsir, then lists matches with a snippet. The **first** search takes a moment — that's the app building an index by loading all 114 surahs (a progress bar shows how far along it is). Searches after that are instant, because the index is cached.

This screen is split across four files:
- `SearchBar.jsx` — the UI (input, button, results list).
- `SearchContext.jsx` — the orchestrator (decides when to build the index, caches it).
- `api/search.js` — the engine (how matches are found).
- `api/data.js` — loads surah data from disk.

## Read the code

### `web/src/components/SearchBar.jsx` — the UI

**Controlled input (lines 37–44):**
```jsx
<input
  type="text"
  placeholder="ابحث في النص أو التفسير..."
  value={query}
  onChange={e => setQuery(e.target.value)}
  onKeyDown={handleKeyDown}
/>
```
This is a **controlled input**. Two things work together: `value={query}` (React *sets* what's shown) and `onChange` (React *reads* what the user typed and stores it in `query`). React now "owns" the input — the input and `query` are always in sync. See the concept box.

**The async search handler (lines 13–24):**
```jsx
const handleSearch = useCallback(async () => {
  if (!query.trim()) return
  setSearched(true)
  setSearchError(null)
  try {
    const searchResults = await search(query.trim())
    setResults(searchResults)
  } catch (err) {
    setSearchError(err.message)
    setResults([])
  }
}, [query, search])
```
Notice `async` and `await`. `search(query.trim())` returns a promise (it may need to build the index first — slow). `await` pauses here until it's done, then `searchResults` holds the real list. `try/catch` handles failures. This is far cleaner than the `.then().catch()` chain from lesson 02.

**Rendering the four states (lines 54–102):** building the index, error, no results, and results list. Same conditional-rendering patterns from lesson 02, now with four branches instead of three.

### `web/src/contexts/SearchContext.jsx` — the orchestrator

```jsx
const search = useCallback(async (query) => {
  if (!query) return []
  let idx = searchIndex
  if (!idx) {                                  // first search — build the index
    setIsBuildingIndex(true)
    try {
      idx = await buildSearchIndex((done, total) => {
        setSearchProgress(Math.round((done / total) * 100))
      })
      setSearchIndex(idx)                      // cache it
    } finally {
      setIsBuildingIndex(false)
    }
  }
  return searchLocal(query, idx)
}, [searchIndex])
```
The logic: "if we don't have an index yet, build one (reporting progress as we go), cache it for next time, then search it." `isBuildingIndex` and `searchProgress` drive the UI's loading state. After the first search, `idx` is already cached so it's instant.

### `web/src/api/search.js` — the engine

**Constants (lines 3–4):**
```jsx
const SEARCH_FIELDS = ['text', 'tafsir_short', 'tafsir_long']
const MAX_RESULTS = 50
```
Which fields to search, and a cap on results. Pulling these into named constants makes the code self-documenting (a clean-code habit).

**Building the index (lines 8–24):**
```jsx
export async function buildSearchIndex(onProgress) {
  if (searchIndexCache) return searchIndexCache
  const allSurahs = await loadAllSurahs(onProgress)

  searchIndexCache = allSurahs.flatMap(surah =>
    surah.ayahs.map(ayah => ({
      surah_id: surah.surah_id,
      surah_name: surah.name,
      ayah_number: ayah.number,
      ...Object.fromEntries(
        SEARCH_FIELDS.map(field => [field, ayah[field] || ''])
      ),
    }))
  )
  return searchIndexCache
}
```
Instead of a nested structure (surahs → ayahs), we **flatten** everything into one big flat array — one entry per ayah, carrying its surah info along. Flattening makes searching trivial (one `.filter` over a flat list). `searchIndexCache` is module-level — it survives across searches within the same page session.

**The search itself (lines 26–31):**
```jsx
export function searchLocal(query, searchIndex) {
  if (!query || !searchIndex) return []
  const q = query.toLowerCase()
  return searchIndex.filter(entry =>
    SEARCH_FIELDS.some(field => entry[field]?.toLowerCase().includes(q))
  ).slice(0, MAX_RESULTS)
}
```
Walk this line by line:
1. Lowercase the query so search is case-insensitive.
2. `.filter(...)` — keep entries where…
3. `.some(field => ...)` — **at least one** of the three fields…
4. `.toLowerCase().includes(q)` — contains the query (case-insensitive).
5. `.slice(0, 50)` — cap to 50 results.

That's the whole engine. It's short because the data was prepared (flattened) up front.

### `web/src/api/data.js` — the loader

```jsx
export async function loadAllSurahs(onProgress) {
  const surahIndex = await loadIndex()
  const loaded = []
  for (let i = 0; i < surahIndex.length; i++) {
    const surahData = await loadSurah(surahIndex[i].surah_id)
    loaded.push(surahData)
    if (onProgress) onProgress(i + 1, surahIndex.length)
  }
  return loaded
}
```
Loads every surah one by one, reporting progress (`onProgress(done, total)`) — that's what feeds the progress bar. Each loaded surah is cached by `loadSurah`, so navigating to a surah later is instant.

---

## Concept boxes

### 🧱 Controlled inputs

A plain HTML input manages its own value. A **controlled** input lets React manage it:
```jsx
const [query, setQuery] = useState('')
<input value={query} onChange={e => setQuery(e.target.value)} />
```
Now `query` is the single source of truth. You can read it, validate it, or transform it before display. Almost every input in React is controlled.

### 🧱 `async` / `await`

`async` marks a function that uses `await`. `await` pauses until a promise resolves, then gives you its value — no `.then()` chains:
```js
// promises (lesson 02)
fetchSurah(id).then(data => render(data))

// async/await (here)
const data = await fetchSurah(id)
render(data)
```
They're the same thing underneath; `async`/`await` just reads top-to-bottom like normal code. Wrap in `try/catch` for errors.

### 🧱 `useEffect` recap

You've now seen `useEffect` for two jobs: persistence (lessons 03/04) and data loading (lesson 02's `SurahView`). Here, `SearchContext` uses **state + caching** instead of an effect — it builds the index lazily, only when first needed. Both are valid; the lesson is to pick the right tool.

### 🧱 Building an index

Searching 6,000+ ayahs *by re-fetching* on every keystroke would be painfully slow. So we load everything **once**, flatten it into one array, and keep it in memory. The first search pays the cost; every later search is a fast in-memory `.filter`. This "prepare once, query many times" pattern is everywhere in real apps.

### 🧱 The algorithm: `filter` + `some` + `includes`

- `.some(fn)` returns `true` if **any** element passes — perfect for "does any field match?"
- `.includes(q)` returns `true` if a string contains `q`.
- `.toLowerCase()` on both sides = case-insensitive matching.
- `.slice(0, 50)` caps results for performance.

### 🧱 Separating concerns (the `api/` layer)

Notice the engine (`searchLocal`, `buildSearchIndex`) lives in `api/search.js`, **not** inside `SearchBar`. Components render; `api/` knows data. This separation means the search logic is testable on its own (lesson 08) and reusable. It's the **Single Responsibility Principle** in action — see `docs/clean-code-summary.md` for more.

---

## Exercise

Change the result cap from 50 to 20. Open `web/src/api/search.js` and change:

```jsx
const MAX_RESULTS = 50
```
to `20`. Save, run a search that matches lots of ayahs (e.g. a common word), and confirm you now see at most 20 results. This one-line change ripples through the whole engine — proof that a well-named constant is worth its weight in gold.

**Stretch:** Add the surah id to each result's display in `SearchBar.jsx` (it's already in the data as `result.surah_id`), so users can see which surah number matched.

## Checkpoint

You should now understand:

- ✅ Controlled inputs — React owns the value.
- ✅ `async`/`await` as a cleaner way to handle promises.
- ✅ How and why we build a flat search index once, then reuse it.
- ✅ The `filter` + `some` + `includes` algorithm.
- ✅ Why data logic lives in `api/`, not in components.

Next up: **[06 — How it all fits](./06-how-it-all-fits.md)** — routing, nested providers, and finally understanding `App.jsx` top to bottom.
