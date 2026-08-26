# Junior Onboarding Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a guided, concept-per-feature onboarding doc set (`docs/onboarding/`) that teaches a brand-new developer programming + web + React fundamentals by walking the Tafsir Nabulsi web app's real code.

**Architecture:** 10 ordered Markdown docs in `docs/onboarding/`. Each follows one consistent 6-part template. Concepts are introduced per-feature in rising difficulty. Every concept is anchored to a real file in `web/src/`.

**Tech Stack:** Markdown (GitHub-flavored). Source code referenced: React 19 + Vite + Tailwind + react-router-dom.

## Global Constraints

- **NO setup/installation steps anywhere** — no Node, npm, clone, env, or run-the-app instructions in any doc.
- **Language: English only** (UI strings/code stay as-is; Arabic UI text may be quoted but explained in English).
- **Audience: brand-new developer** — teach prerequisite JS (arrays, functions, promises, objects) wherever a concept needs it.
- **Every concept anchored to a real file** with `path:line` references — read the file first; line numbers must be accurate at write time.
- **Follow the 6-part template** in every numbered doc (00–08): What you'll learn → The feature → Read the code → Concept boxes → Exercise → Checkpoint.
- **No placeholders** — each doc is complete prose, not "TBD".
- **Commits omitted** per project policy — only commit when the user explicitly asks.

**Reference spec:** `docs/superpowers/specs/2026-07-16-onboarding-docs-design.md`

---

## File Structure

```
docs/onboarding/
├── README.md                   ← Task 1: index + learning-path map + glossary
├── 00-big-picture.md           ← Task 2
├── 01-the-surah-list.md        ← Task 3
├── 02-reading-a-surah.md       ← Task 4
├── 03-themes.md                ← Task 5
├── 04-favorites.md             ← Task 6
├── 05-search.md                ← Task 7
├── 06-how-it-all-fits.md       ← Task 8
├── 07-pipeline-and-backend.md  ← Task 9
└── 08-tests-and-first-change.md ← Task 10
```

Each file has one clear responsibility: teach one step of the learning path. No file does double duty.

---

## Verification Checklist (the "test" for every doc task)

Each numbered doc (Tasks 2–10) MUST pass this checklist before the task is done:

- [ ] Opens with **What you'll learn** (lists concepts + prerequisite JS if any)
- [ ] Has **The feature** section (what it does in the running app)
- [ ] Has **Read the code** walking the real files, with accurate `path:line` refs
- [ ] Has **Concept boxes** teaching each new concept in plain English
- [ ] Has one concrete **Exercise** in the real codebase
- [ ] Ends with a **Checkpoint** ("you should now understand …")
- [ ] Contains **zero** setup/installation steps
- [ ] English only
- [ ] No "TBD"/placeholder text

---

### Task 1: README index + learning-path map + glossary

**Files:**
- Create: `docs/onboarding/README.md`

**Produces:** The entry point readers land on. Explains how to use the guide, shows the ordered path, and defines a glossary of terms used across all docs.

- [ ] **Step 1: Write the README with these sections**

Sections (in order):
1. **Title + one-line purpose** — "Onboarding Guide — Tafsir Nabulsi Web App. A step-by-step path for developers brand-new to programming and React."
2. **Who this is for** — brand-new to everything; we teach JS + web + React as we go.
3. **How to use this guide** — read docs in numbered order (00 → 08); each builds on the last; do the exercise at the end of each; keep the app open to follow along.
4. **The learning path** — a numbered table (copy the concept-progression table from the spec: Step | Feature | Concepts | Files). 10 rows (00–08 + this README is the start).
5. **Glossary** — short definitions, each 1 sentence: component, JSX, props, state, hook (`useState`/`useEffect`), context (provider/consumer), async/await, promise, localStorage, route, Vite, Tailwind, tafsir, surah, ayah.
6. **What's NOT covered** — no setup/install steps; not a generic React course.

- [ ] **Step 2: Verify** — all 6 sections present; path table matches spec; glossary has all 14 terms; no setup steps.

---

### Task 2: 00-big-picture.md

**Files:**
- Create: `docs/onboarding/00-big-picture.md`
- Read for accuracy: `web/src/main.jsx`, repo top-level dirs (`pipeline/`, `supabase/`, `web/`)

**Concepts:** what the project is; client-side vs server-side; how a browser loads a SPA; what React/Vite/Tailwind are (one line each); the entry point skeleton.

- [ ] **Step 1: Read `web/src/main.jsx`** to cite real lines (`createRoot`, `getElementById('root')`, `StrictMode`).

- [ ] **Step 2: Write the doc using the 6-part template**

Content guidance:
- **The feature:** none (orientation). Describe the app: browse 114 surahs, read ayahs + Dr. Nabulsi's tafsir, search, favorites, themes.
- **Read the code:** the 3 project parts (`pipeline/` → JSON, `supabase/` → future user data, `web/` → the app). Show `main.jsx` (10 lines) and explain it's the *entry point* but say "we won't explain every line yet — each piece has its own lesson."
- **Concept boxes:**
  - Web app basics: browser loads `index.html` → runs JS → JS draws the page (the DOM). Plain-English, no jargon.
  - What's a "SPA" (single-page app) — one page, JS swaps content.
  - What React is (a library for building UI from "components"), Vite (the tool that bundles/serves), Tailwind (utility CSS classes) — one paragraph each, beginner-level.
- **Exercise:** Find `index.html` in `web/`, locate the `<div id="root">`. Explain in a sentence why the app needs that empty div (answer in a `<details>` tag).
- **Checkpoint:** you understand the 3 parts, what an SPA is, and where the app starts.

- [ ] **Step 3: Verify** against the checklist. Ensure `main.jsx` line refs are accurate.

---

### Task 3: 01-the-surah-list.md

**Files:**
- Create: `docs/onboarding/01-the-surah-list.md`
- Read for accuracy: `web/src/components/SurahList.jsx`, `web/src/components/Layout.jsx`, `web/src/contexts/DataContext.jsx`, `web/src/utils/arabic.js`, sample of `web/public/data/_index.json`

**Concepts:** what a component is; JSX; props; rendering a list with `.map()`; importing; `useContext` as a *consumer* (read DataContext's value, defer "how to build a provider" to step 03).

- [ ] **Step 1: Read** the files above. Note real lines: `SurahList.jsx` `export default function SurahList()` (component), `useData()` (consuming context), `.filter(...).map(...)` (list rendering), `toArabicNum` import (utility import).

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature:** the Home page — a list of 114 surahs with a filter box.
- **Read the code:** walk `SurahList.jsx` top-to-bottom: the `import` lines, the function component, `useData()` pulling `index` + `indexError`, the `filter` state, `.map(surah => <Link ...>)`, the `key` prop, the error/empty/loading branches.
- **Concept boxes:**
  - **Prereq JS — arrays & `.map()`/`.filter()`:** what an array is; `.filter` returns matching items; `.map` transforms each item into something new (here, into JSX). Small non-React example: `[1,2,3].map(n => n*2)`.
  - **What a component is:** a function that returns UI. `function SurahList() { return (...) }`.
  - **JSX:** HTML-like syntax inside JS. Rules: one parent, `{}` for JS expressions, `className` not `class`.
  - **Props:** data passed into a component (note: `SurahList` takes none here, but `Link`'s `to=` and the `key` are props — use them as the first example).
  - **Imports / exports:** `import { useData } from '...'` / `export default`.
  - **Consuming context:** `const { index } = useData()` — "DataContext hands us the surah list from a shared place; we'll build our own context in lesson 03."
- **Exercise:** Add a new line under each surah's name showing its `surah_id` as a small caption (e.g. `رقم السورة: {toArabicNum(surah.surah_id)}`). Hint: inside the `<div>` at `SurahList.jsx` around line 67.
- **Checkpoint:** you can read a component, understand JSX, and render a list from data.

- [ ] **Step 3: Verify** against the checklist.

---

### Task 4: 02-reading-a-surah.md

**Files:**
- Create: `docs/onboarding/02-reading-a-surah.md`
- Read for accuracy: `web/src/components/SurahView.jsx`, `web/src/components/AyahCard.jsx`, `web/src/components/Spinner.jsx`, `web/src/components/StateMessage.jsx`, `web/src/utils/tafsir.js`, `web/src/contexts/DataContext.jsx` (the `fetchSurah` + `loadSurah` flow)

**Concepts:** component composition (parent renders children); passing props parent→child; conditional rendering (`&&`, ternary); async data loading + loading/error states; pure helper functions.

- [ ] **Step 1: Read** the files above. Note real lines: `SurahView.jsx` `useParams()` → `surahId`, `useEffect` with `fetchSurah(...).then(...)`, `cancelled` flag, `loading`/`error` branches; `AyahCard.jsx` `function AyahCard({ ayah, surahId })` (props), `expanded` state, `ayah.tafsir_short && (...)`; `utils/tafsir.js` `parseTafsir` (pure function).

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature:** tap a surah → see its ayahs, each with tafsir you can expand.
- **Read the code:** `SurahView` (loads one surah by URL id, shows Spinner while loading, maps `ayahs` → `<AyahCard>`), then `AyahCard` (the ayah text, optional short tafsir, expand button, favorite heart). Point at `Spinner.jsx` as a tiny reusable component.
- **Concept boxes:**
  - **Prereq JS — async, promises, `.then()`:** fetching takes time; a promise is "a value that arrives later"; `.then(data => ...)` runs when ready. Tie to `fetchSurah(...).then(...)`.
  - **Component composition:** `SurahView` renders many `AyahCard`s; big UIs are built from small pieces.
  - **Props parent→child:** `<AyahCard ayah={ayah} surahId={surahId} />` — `SurahView` passes data down; `AyahCard` receives it as `{ ayah, surahId }`.
  - **Conditional rendering:** `{ayah.tafsir_short && <p>...</p>}` shows UI only when data exists. Ternary `expanded ? ... : ...`.
  - **Loading & error states:** why we need `loading`/`error` (the user stares at a blank screen otherwise); the `cancelled` flag prevents setting state after leaving the page.
  - **Pure functions:** `parseTafsir` in `utils/tafsir.js` — same input → same output, no side effects; why we extract logic into utils.
- **Exercise:** In `AyahCard.jsx`, make the long tafsir **expanded by default** instead of collapsed (change the `useState(false)` initial value, around line 7). Test by opening a surah.
- **Checkpoint:** you understand props, composition, conditional rendering, and async loading.

- [ ] **Step 3: Verify** against the checklist.

---

### Task 5: 03-themes.md

**Files:**
- Create: `docs/onboarding/03-themes.md`
- Read for accuracy: `web/src/contexts/ThemeContext.jsx`, `web/src/components/ThemeToggle.jsx`, `web/src/index.css` (the `:root` + `[data-theme="..."]` variable blocks)

**Concepts:** `useState`; event handlers (`onClick`); building a Context **provider**; `useEffect`; `localStorage` persistence; CSS custom properties.

- [ ] **Step 1: Read** the files above. Note real lines: `ThemeContext.jsx` `createContext()`, `ThemeProvider`, `useState(() => localStorage.getItem('tafsir-theme') || 'light')`, `useEffect` setting `data-theme` + saving to localStorage, `toggleTheme` cycling `['light','dark','sepia']`, the `useTheme()` consumer hook.

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature:** the theme toggle cycles Light → Dark → Sepia; your choice is remembered next visit.
- **Read the code:** `ThemeToggle.jsx` (the button calling `toggleTheme`), then `ThemeContext.jsx` (the *provider* — where theme state lives), then `index.css` (CSS variables per theme).
- **Concept boxes:**
  - **`useState`:** component memory. `const [theme, setTheme] = useState('light')` — `theme` is the value, `setTheme` changes it, the UI re-renders. Explain the "lazy initializer" form `useState(() => ...)` runs once.
  - **Event handlers:** `onClick={() => ...}` runs when the user clicks.
  - **Building a Context provider:** `createContext()` creates the channel; `<ThemeContext.Provider value={...}>` is the sender; `useContext` (in `useTheme`) is the receiver. Contrast with lesson 01 where we only *consumed*. Walk the provider→consumer loop.
  - **`useEffect`:** "run this side-effect after render." Here: whenever `theme` changes, update `<html data-theme>` + write localStorage. Explain the `[theme]` dependency array.
  - **`localStorage`:** the browser's tiny key/value store; survives refresh.
  - **CSS custom properties:** `--bg-primary` etc. change per `[data-theme]`, so swapping one attribute re-themes everything.
- **Exercise:** Change the accent color — edit the `--accent` value in each of the 3 theme blocks in `index.css` and watch the whole app recolor. (Stretch: add a 4th theme by adding a new value to `THEMES` + a new `[data-theme]` block.)
- **Checkpoint:** you can build a provider, manage state, handle events, and persist data.

- [ ] **Step 3: Verify** against the checklist.

---

### Task 6: 04-favorites.md

**Files:**
- Create: `docs/onboarding/04-favorites.md`
- Read for accuracy: `web/src/contexts/FavoritesContext.jsx`, the heart button in `web/src/components/AyahCard.jsx` (lines ~59-68)

**Concepts:** storing structured data in state (`Set` inside a plain object keyed by surahId); derived state (`isFavorite`); reinforcing the provider/consumer pattern; serialization to/from JSON for localStorage.

- [ ] **Step 1: Read** `FavoritesContext.jsx`. Note real lines: `loadFavorites()` (JSON → object of `Set`s), `saveFavorites()` (`Set` → array → JSON), `useState(loadFavorites)` (lazy init from localStorage), `toggleFavorite` (immutable update: copy the object + copy the `Set`), `isFavorite` (reads current state), the provider exposes only `{ toggleFavorite, isFavorite }`.

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature:** tap the heart on any ayah to favorite it; hearts persist across refresh; tap again to unfavorite.
- **Read the code:** `AyahCard.jsx` heart button (`toggleFavorite(surahId, ayah.number)`, `isFav ? '❤️' : '🤍'`), then `FavoritesContext.jsx` end-to-end.
- **Concept boxes:**
  - **Prereq JS — objects, `Set`, spreading:** a plain object `{ "1": Set(1,2,3) }`; why `Set` (no duplicates, fast `.has()`); `{ ...prev }` shallow-copies; `new Set(current)` copies a set.
  - **Structured state:** favorites is an object-of-Sets keyed by surah; contrast with lesson 03's single string.
  - **Immutable updates:** we never mutate `prev` — we build a new object so React detects the change. Walk the `toggleFavorite` copy logic line-by-line.
  - **Derived values:** `isFavorite(surahId, n)` computes an answer from current state rather than storing it twice (DRY).
  - **Serialization:** `Set` can't go in JSON directly, so `loadFavorites`/`saveFavorites` convert Set↔array. Explain `JSON.stringify`/`JSON.parse` + the try/catch for corrupt data.
- **Exercise:** Add a "Clear all favorites" button to `Layout.jsx` header that calls a new `clearFavorites` function. (Implement `clearFavorites` in `FavoritesContext` using `setFavorites({})`, expose it in the provider value, and wire a button in `Layout`.)
- **Checkpoint:** you can model non-trivial state, update it immutably, and persist it.

- [ ] **Step 3: Verify** against the checklist.

---

### Task 7: 05-search.md

**Files:**
- Create: `docs/onboarding/05-search.md`
- Read for accuracy: `web/src/components/SearchBar.jsx`, `web/src/contexts/SearchContext.jsx`, `web/src/api/search.js`, `web/src/api/data.js`

**Concepts:** controlled inputs; `useEffect` (deeper use); async/await + promises; building a search index; the search algorithm (filter + cap); loading/progress state; when to split logic out of a component (the `api/` layer).

- [ ] **Step 1: Read** the files above. Note real lines: `search.js` `SEARCH_FIELDS`/`MAX_RESULTS` constants, `buildSearchIndex` (`flatMap` flattening all surahs' ayahs into one array, with `onProgress`), `searchLocal` (`filter` + `some` + `slice`); `SearchContext.jsx` lazy-builds the index on first search, caches it, tracks `isBuildingIndex` + `searchProgress`; `SearchBar.jsx` controlled input + results.

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature:** type a query → it searches every ayah's text + tafsir and lists matches; the first search builds an index (shows progress).
- **Read the code:** `SearchBar.jsx` (the input + results list), `SearchContext.jsx` (orchestrates), `api/search.js` (the engine), `api/data.js` (`loadAllSurahs`).
- **Concept boxes:**
  - **Controlled inputs:** `value={query}` + `onChange={e => setQuery(e.target.value)}` — React owns the input's value. Contrast with a plain HTML input.
  - **Prereq JS — `async`/`await`:** nicer syntax for promises; `await` pauses until the promise resolves; `try/finally` ensures cleanup. Tie to `async (query) => { ... await buildSearchIndex(...) ... }`.
  - **Building an index:** why we load all 114 surahs once into a flat array (`flatMap`) rather than re-fetching per query. Explain `flatMap` (map + flatten) and `Object.fromEntries`.
  - **The algorithm:** `searchLocal` lowercases, `filter`s entries where `some` field `includes` the query, `slice(0, 50)` to cap. Walk each line.
  - **Caching + lazy work:** `searchIndexCache` (module-level) and `searchIndex` (state) mean we build the index only once.
  - **Separating concerns:** the search *engine* lives in `api/search.js`, not in the component — components render, `api/` knows data. (Reinforces SRP from `docs/clean-code-summary.md`.)
- **Exercise:** Change the result cap from 50 to 20 (edit `MAX_RESULTS` in `search.js`) OR add `tafsir_short` is already searched — instead, make the match case-insensitive for Arabic too / add showing which field matched. Pick the `MAX_RESULTS` one as primary (simplest, verifiable).
- **Checkpoint:** you understand controlled inputs, async/await, and how to structure data logic outside components.

- [ ] **Step 3: Verify** against the checklist.

---

### Task 8: 06-how-it-all-fits.md

**Files:**
- Create: `docs/onboarding/06-how-it-all-fits.md`
- Read for accuracy: `web/src/App.jsx`, `web/src/main.jsx`, `web/src/components/Layout.jsx`, `web/src/components/ErrorBoundary.jsx`, `web/src/components/NotFound.jsx`

**Concepts:** react-router (`BrowserRouter`, `Routes`, `Route`, `Link`/`NavLink`, `useParams`); nested Context providers and *why* the order matters; `ErrorBoundary`; the full component tree from root to leaf. This is the capstone that revisits `App.jsx` (previewed in lesson 00).

- [ ] **Step 1: Read** the files above. Note real lines: `App.jsx` provider nesting `ErrorBoundary > ThemeProvider > FavoritesProvider > DataProvider > SearchProvider > BrowserRouter > Layout > Routes`, the 4 `<Route>` entries.

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature:** the whole app — every screen, tied together by routing and shared providers.
- **Read the code:** `App.jsx` top-to-bottom (now that every provider has been taught). Map each `<Route path>` to its component.
- **Concept boxes:**
  - **Routing:** `BrowserRouter` enables URL navigation without full reloads; `<Routes>` picks one `<Route>` by URL; `:id` is a URL param read with `useParams()` (recall lesson 02). `<Link to="...">` navigates without reloading.
  - **Why nested providers:** order = "who needs whom." Explain that `DataProvider` must wrap `SurahView` so `useData()` works; providers can be nested because each is just a component. Give the one rule: a consumer must sit *inside* its provider.
  - **ErrorBoundary:** catches render errors so one crash doesn't blank the whole app (like a `try/catch` for components).
  - **The big picture tree:** a small ASCII diagram: `main.jsx → App → (providers) → Router → Layout → (SurahList | SurahView | SearchBar)`.
- **Exercise:** Add a new `/about` route — create a tiny `About.jsx` component, add `<Route path="/about" element={<About />} />` in `App.jsx`, and a `<Link to="/about">` in `Layout.jsx`.
- **Checkpoint:** you understand routing, provider nesting, and how the whole app composes.

- [ ] **Step 3: Verify** against the checklist.

---

### Task 9: 07-pipeline-and-backend.md

**Files:**
- Create: `docs/onboarding/07-pipeline-and-backend.md`
- Read for accuracy: `pipeline/README.md`, `pipeline/src/` structure, `supabase/README.md`, the Supabase schema in `docs/superpowers/specs/2026-07-13-foundation-design.md` (Part 2), one sample `web/public/data/1.json`

**Concepts (overview only — NOT deep):** where `web/public/data/*.json` comes from; the Python pipeline at a glance (scrape → merge → JSON); the Supabase schema (tables + RLS) and that it's for *future* cross-device features (not yet wired into the web app).

> **Note:** This doc deliberately does NOT teach Python or SQL. It's "where the data comes from" context so the junior isn't confused that `web/` has no backend.

- [ ] **Step 1: Read** the files above + open `web/public/data/1.json` to show the actual JSON shape the web app consumes.

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature (context):** the web app loads local JSON — but who *makes* that JSON? Two sources: the Python pipeline (content) and Supabase (future user data).
- **Read the code (overview):**
  - Show the JSON shape from `1.json` (`surah_id`, `name`, `ayahs[].{number,text,tafsir_short,tafsir_long}`). This is the contract the web app depends on.
  - Pipeline: `pipeline/` scrapes Quran text (Tanzil) + tafsir (nabulsi.com), merges → writes `pipeline/output/*.json`, which get copied to `web/public/data/`. Point at `pipeline/src/` modules (fetcher, parser, scraper, builder) at a glance — name + one-line job each. No Python teaching.
  - Supabase: `supabase/` defines tables (`profiles`, `bookmarks`, `reading_progress`) with RLS (row-level security = users only see their own rows). State clearly this is **not yet connected** to the web app — it's staged for future auth + sync. No SQL teaching beyond naming the tables.
- **Concept boxes:**
  - **Data pipeline (concept):** a script that gathers/transforms data and writes files — run separately, output consumed by the app.
  - **Where the line is:** the junior works in `web/`; if `1.json` is missing a field, the fix is in the *pipeline*, not the web app. This boundary matters.
- **Exercise:** Open `web/public/data/1.json`. Find the `tafsir_long` of ayah 1. Notice the leading date (`YYYY-MM-DD`) — recall `parseTafsir` from lesson 02 strips it. Confirm by eye that the field exists.
- **Checkpoint:** you know where the app's data comes from and where the backend lives.

- [ ] **Step 3: Verify** against the checklist. Ensure NO Python/SQL tutorials sneak in.

---

### Task 10: 08-tests-and-first-change.md

**Files:**
- Create: `docs/onboarding/08-tests-and-first-change.md`
- Read for accuracy: `web/src/utils/tafsir.test.js`, `web/src/utils/arabic.test.js`, `web/src/api/search.test.js`, `web/src/contexts/FavoritesContext.test.js`, `web/src/contexts/ThemeContext.test.js`, `web/package.json` (the `test` script), `docs/clean-code-summary.md`

**Concepts:** what automated tests are and why; reading a vitest test (`test`/`expect`/`toBe`); the project's conventions (naming, file structure, the clean-code principles); a capstone exercise tying everything together.

- [ ] **Step 1: Read** the test files above + `docs/clean-code-summary.md`. Note the `npm test` script in `package.json` (vitest).

- [ ] **Step 2: Write the doc (6-part template)**

Content guidance:
- **The feature (practice):** how we keep the app correct as it grows, plus your first real change.
- **Read the code:** one test file end-to-end (e.g. `tafsir.test.js` — tiny and clear), then a glance at the others. Show `test('name', () => { expect(fn(input)).toBe(expected) })`.
- **Concept boxes:**
  - **What's a test:** a function that checks another function returns the right thing; if you change code and break it, the test fails loudly.
  - **vitest basics:** `test()`/`it()` defines a case; `expect(x).toBe(y)` asserts. Show the `npm test` command (this is a *how-to-run-the-tests* mention, NOT an app setup step — allowed).
  - **Conventions:** components are PascalCase `.jsx`; contexts/hooks/utils are camelCase `.js`; tests sit next to the file as `*.test.js`; pure logic lives in `utils/`/`api/`, not in components. Summarize the DRY/KISS/YAGNI/SOLID points from `clean-code-summary.md` in 4 bullets.
- **Exercise (capstone):** Add a "reading time" caption to `SurahView` — show the ayah count as `{toArabicNum(surah.ayahs.length)} آية` (it already exists) → instead: add a small "last surah visited" note. **Pick the simpler, verifiable capstone:** add a new pure util `web/src/utils/pluralize.js` (or similar trivial helper) + a `pluralize.test.js` with one passing test, then use it. (Keep it small; the goal is touching utils + a test + a component.) — *Implementer: choose the smallest end-to-end change that edits a util, a test, and a component.*
- **Checkpoint:** you can read/write a test, follow conventions, and make a full-stack-of-layers change.

- [ ] **Step 3: Verify** against the checklist.

---

## Self-Review (completed during authoring)

**1. Spec coverage:** Every doc in the spec's file set has a task (README + 00–08 = 10 tasks). Every concept in the progression table is assigned to a task. Exercises map 1:1. The "no setup/install" and "English" constraints are in Global Constraints + the checklist. ✔

**2. Placeholder scan:** No "TBD"/"implement later" in any task — each specifies exact files, concepts, and an exercise. The capstone exercise in Task 10 intentionally leaves the *smallest* choice to the implementer, which is a bounded decision, not a placeholder. ✔

**3. Consistency:** Hook ordering across docs is consistent (`useContext` consumer in 01 → `useState`+provider in 03 → `useEffect` deeper in 05). File paths all use `web/src/...`. The 6-part template is identical across Tasks 2–10. ✔

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-16-onboarding-docs-implementation.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per doc task (10 docs), review between tasks. Best for parallelism + keeping each doc's context clean.

**2. Inline Execution** — write docs in this session, batched with checkpoints.

Which approach?
