# Junior Onboarding Docs Design Spec — Tafsir Nabulsi

**Date:** 2026-07-16
**Scope:** A guided learning-path documentation set that onboards a brand-new developer (new to programming *and* React) onto the Tafsir Nabulsi project.
**Approach:** Concept-per-feature hybrid — organize the path around the app's real features; teach only the concepts each feature needs; concepts accumulate by difficulty.

---

## Audience

A **brand-new developer**: does not yet know programming fundamentals, web basics, or React. The docs must teach prerequisite JavaScript/programming concepts *where needed* (e.g. arrays before `.map()`, promises before `async`) while staying anchored to the project's real files.

## Decisions (locked during brainstorming)

| Decision | Choice |
|----------|--------|
| Scope | Deep-dive the React **web app**; brief overview of `pipeline/` + `supabase/` |
| Audience level | Brand-new to everything (programming + web + React) |
| Format | **Guided learning path** (ordered docs, increasing difficulty) |
| Structure approach | **C — Concept-per-feature** (real features drive the sections) |
| Language | English |
| Interactivity | Reading + **guided exercises** in the real codebase |
| Setup/install | **None** — no Node/npm/clone/setup steps anywhere (plan or docs) |

---

## Where the docs live

A new self-contained folder under `docs/`:

```
docs/onboarding/
├── README.md                      ← Index: how to use the guide + learning-path map + glossary
├── 00-big-picture.md              ← What the project is; the 3 parts; how a web app runs in a browser
├── 01-the-surah-list.md           ← Concepts: component, JSX, props, .map(), consuming context
├── 02-reading-a-surah.md          ← Concepts: composition, conditional render, async + loading states, pure functions
├── 03-themes.md                   ← Concepts: useState, events, building a Context provider, localStorage, CSS vars
├── 04-favorites.md                ← Concepts: state w/ Set/Map, derived state, reinforcing context
├── 05-search.md                   ← Concepts: controlled inputs, useEffect, async/await, the search engine
├── 06-how-it-all-fits.md          ← Concepts: react-router, nested providers, ErrorBoundary (capstone wiring)
├── 07-pipeline-and-backend.md     ← Brief: where public/data/*.json comes from (Python) + Supabase schema
└── 08-tests-and-first-change.md   ← Concepts: vitest, conventions; ends with a capstone exercise
```

---

## Concept progression (why this order)

Each step teaches *only* what that feature needs, in rising difficulty. Read context *before* building a provider; meet `props` before `useState`; `useState` before `useEffect`.

| Step | Real feature | Concepts introduced | Real files walked |
|------|-------------|---------------------|-------------------|
| 00 | — | big picture, browser/DOM basics | repo overview, `main.jsx` skeleton shown (not deep) |
| 01 | Home: 114 surahs | component, JSX, props, `.map()`, `useContext` as *consumer* | `SurahList.jsx`, `Layout.jsx`, `_index.json` |
| 02 | Read a surah | parent→child props, conditional render, async + loading, pure functions | `SurahView.jsx`, `AyahCard.jsx`, `Spinner.jsx`, `utils/tafsir.js` |
| 03 | Theme toggle | `useState`, onClick, building a Context *provider*, localStorage, CSS vars | `ThemeContext.jsx`, `ThemeToggle.jsx`, `index.css` |
| 04 | Favorites | `Set`/`Map` in state, derived state (`isFavorite`) | `FavoritesContext.jsx`, heart icon in `AyahCard.jsx` |
| 05 | Search | controlled input, `useEffect`, async/await, search index + ranking | `SearchContext.jsx`, `SearchBar.jsx`, `api/search.js`, `api/data.js` |
| 06 | Whole app | react-router (`Routes`/`Route`/`NavLink`), nested providers, `ErrorBoundary` | `App.jsx`, routing |
| 07 | Data source | (overview only) scraping → JSON; Supabase tables | `pipeline/`, `supabase/` |
| 08 | Quality | testing, conventions | `*.test.js`, `docs/clean-code-summary.md` |

---

## Per-doc template (consistent across all numbered docs)

Every numbered doc follows the same shape so the reader always knows what to expect:

1. **What you'll learn** — the concepts + prerequisite JS (if any)
2. **The feature** — what it does in the app (point at the running screen)
3. **Read the code** — guided walk-through of the real files with `file:line` references
4. **Concept boxes** — short, plain-English deep-dives on each new concept
5. **Exercise** — one small, concrete change in the real codebase
6. **Checkpoint** — "you should now understand X, Y, Z"

---

## Example exercises (all in the real repo; no setup steps)

- **01:** Add a new piece of info to each surah card in `SurahList`.
- **02:** Make `AyahCard`'s tafsir expanded by default instead of collapsed.
- **03:** Change the teal accent color, or add a 4th theme.
- **04:** Add a "Clear all favorites" button.
- **05:** Change the search result cap or add a field to search.
- **06:** Add a new route (e.g. `/about`).
- **08 (capstone):** Add a small real feature end-to-end.

---

## Explicitly OUT of scope

- **No setup/installation steps** anywhere (no Node/npm/clone/env instructions).
- Not a generic React course — every concept is anchored to this project's real files.
- No deep-dive on Python or SQL (step 07 is overview-only).

---

## Real codebase reference (grounding)

The path walks these actual files in `web/src/`:

```
web/src/
├── main.jsx                 ← entry (step 00, 06)
├── App.jsx                  ← providers + router (step 06)
├── index.css                ← Tailwind + theme CSS vars (step 03)
├── api/
│   ├── data.js              ← fetch/load surah + index (step 05)
│   └── search.js            ← search engine (step 05)
├── contexts/
│   ├── DataContext.jsx      ← index + surah cache (steps 01, 02, 06)
│   ├── ThemeContext.jsx     ← theme provider (step 03)
│   ├── FavoritesContext.jsx ← favorites provider (step 04)
│   └── SearchContext.jsx    ← search provider (step 05)
├── components/
│   ├── Layout.jsx           ← header + nav (step 01)
│   ├── SurahList.jsx        ← home (step 01)
│   ├── SurahView.jsx        ← ayah list (step 02)
│   ├── AyahCard.jsx         ← single ayah + tafsir + favorite (steps 02, 04)
│   ├── SearchBar.jsx        ← search (step 05)
│   ├── ThemeToggle.jsx      ← theme switch (step 03)
│   ├── Spinner.jsx          ← loading (step 02)
│   ├── StateMessage.jsx     ← not-found/error (step 02)
│   ├── ErrorBoundary.jsx    ← (step 06)
│   └── NotFound.jsx         ← (step 06)
└── utils/
    ├── arabic.js            ← toArabicNum (step 02)
    └── tafsir.js            ← parseTafsir (step 02)
```
