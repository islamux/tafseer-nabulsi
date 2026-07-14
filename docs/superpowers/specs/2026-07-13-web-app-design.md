# Web App Design Spec — Tafsir Nabulsi

**Date:** 2026-07-13
**Scope:** Phase B — React web application (MVP)
**Depends on:** Phase A (Python pipeline + JSON output)

---

## Overview

A single-page Quran Tafsir web application built with React + Vite + Tailwind CSS. Loads Quran text and Dr. Nabulsi's tafsir from local JSON files. Supports search, favorites (localStorage), and Dark/Sepia/Light themes.

### MVP Features
1. **Core reading** — Browse 114 surahs, read ayahs with tafsir text
2. **Search** — Search across Quran text + tafsir content
3. **Favorites** — Save ayahs locally (localStorage)
4. **Theme switching** — Dark / Sepia / Light modes

### Not in MVP (future)
- Audio/video playback
- Reading progress tracking
- Supabase auth + sync
- Offline support (service worker)

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18+ | UI framework |
| Vite | Build tool + dev server |
| Tailwind CSS | Utility-first styling |
| react-router-dom | Client-side routing |
| Noto Naskh Arabic | Quran text font |
| Inter | UI text font |

No state management library — React Context + hooks only.

---

## Project Structure

```
web/
├── public/
│   └── data/              ← Copied from pipeline/output/
│       ├── _index.json    ← Surah list
│       ├── 1.json         ← Al-Fatiha
│       └── ...114.json
├── src/
│   ├── main.jsx
│   ├── App.jsx            ← Router + context providers
│   ├── api/
│   │   └── data.js        ← loadIndex(), loadSurah(), searchQuery()
│   ├── hooks/
│   │   ├── useSurah.js    ← Lazy-load + cache single surah
│   │   ├── useFavorites.js ← localStorage CRUD
│   │   └── useTheme.js    ← Dark/Sepia/Light toggle
│   ├── contexts/
│   │   ├── ThemeContext.jsx
│   │   ├── FavoritesContext.jsx
│   │   └── DataContext.jsx
│   ├── components/
│   │   ├── Layout.jsx     ← Header + nav + main
│   │   ├── SurahList.jsx  ← Home: 114 surahs grid
│   │   ├── SurahView.jsx  ← Ayah list with tafsir
│   │   ├── AyahCard.jsx   ← Single ayah + tafsir + favorite
│   │   ├── SearchBar.jsx  ← Search input + results
│   │   └── ThemeToggle.jsx
│   └── index.css          ← Tailwind directives + theme vars
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Routing

Three routes via `react-router-dom`:

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | SurahList | Home — browse 114 surahs |
| `/surah/:id` | SurahView | Read ayahs + tafsir |
| `/search` | SearchBar + results | Search Quran + tafsir |

Navigation flow:
1. Home → tap surah → `/surah/2` → read ayahs
2. Home → search icon → `/search` → type query → tap result → `/surah/N`

No deep-linking to specific ayahs in MVP.

---

## Data Layer

### api/data.js

```js
loadIndex()
  → fetch /data/_index.json once, cache in memory
  → Returns: [{surah_id, name, ayah_count, has_tafsir}, ...]

loadSurah(id)
  → fetch /data/{id}.json, cache in Map<id, data>
  → Returns: {surah_id, name, ayahs: [{number, text, tafsir_short, tafsir_long, media}]}

searchQuery(query)
  → client-side across all loaded surahs
  → Searches: ayah text + tafsir_long + tafsir_short
  → Returns: [{surah_id, surah_name, ayah_number, text, match_in}]
```

### Data Loading Strategy (Approach B: Lazy Load)

1. `_index.json` loads once at startup for the surah list
2. Each `N.json` loads on-demand when user opens that surah
3. Loaded surahs cached in a `Map<id, data>` in DataContext
4. First search triggers bulk load of all 114 JSONs (one-time)

### Search Logic

- On first search: fetch all 114 JSONs, build flat index
- Simple `query` against `text + tafsir_short + tafsir_long`
- Filter + sort: ayah text match > tafsir match
- Results show surah name, ayah number, snippet with highlight

---

## State Management

Three React Contexts — no external state library.

### ThemeContext
```js
{
  theme: "light" | "dark" | "sepia",
  toggleTheme()
}
```
- Persisted to `localStorage` key `tafsir-theme`
- Sets `data-theme` attribute on `<html>`

### FavoritesContext
```js
{
  favorites: Map<surahId, Set<ayahNumber>>,
  toggleFavorite(surahId, ayahNumber),
  isFavorite(surahId, ayahNumber)
}
```
- Persisted to `localStorage` key `tafsir-favorites`
- Stored as JSON: `{ "1": [1, 2, 3], "2": [5] }`

### DataContext
```js
{
  index: SurahMeta[],
  surahCache: Map<id, SurahData>,
  loadSurah(id) → SurahData,
  search(query) → SearchResult[]
}
```
- `index` loaded once on mount
- `surahCache` grows as user navigates
- `search()` triggers bulk load if not already done

---

## Styling & Theming

### Theme System

CSS custom properties in `index.css`:

```css
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #00897b;        /* Teal primary */
}

[data-theme="dark"] {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #4db6ac;
}

[data-theme="sepia"] {
  --bg-primary: #f4ecd8;
  --bg-secondary: #e8dcc8;
  --text-primary: #3e2723;
  --text-secondary: #6d4c41;
  --accent: #00796b;
}
```

### Typography

- Quran text: `Noto Naskh Arabic` (Google Fonts)
- UI text: `Inter` (Google Fonts)
- Scale: heading (24px), subheading (18px), body (16px), caption (13px)

### Material Design 3 Influence

- Rounded corners: 12px cards
- Elevation: subtle box-shadows
- Color: single primary (teal) with tonal variants
- Responsive: single column mobile, two-column desktop

### Responsive Breakpoints

- Mobile: < 768px (single column)
- Desktop: ≥ 768px (two-column: surah list + reading pane)

---

## Components

### Layout
- Sticky header: app name (left) + search icon + theme toggle (right)
- Main content area below

### SurahList (Home)
- Grid of 114 surah cards
- Each card: surah number, Arabic name, ayah count, tafsir badge
- Tap to navigate to `/surah/:id`

### SurahView
- Header: surah name + number
- Scrollable ayah list
- Each ayah rendered as AyahCard

### AyahCard
- Ayah number + Arabic text (large, readable)
- Tafsir short summary (if available)
- Expandable tafsir long text (tap to expand)
- Heart icon to toggle favorite

### SearchBar
- Input field with instant results
- Results: surah name, ayah number, matched snippet with highlight
- Loading spinner while JSONs load on first search

### ThemeToggle
- Three-state button: Light / Dark / Sepia
- Icon changes based on current theme
- Persisted to localStorage

---

## Data Copy

The `pipeline/output/` JSON files must be copied to `web/public/data/` before build. This can be done via:
- Manual copy
- npm script: `"copy-data": "cp ../pipeline/output/*.json public/data/"`
- Post-build hook

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1s |
| Surah load time | < 200ms (cached) |
| Search latency | < 500ms (after initial load) |
| Bundle size | < 200KB gzipped |

---

## Future Enhancements

1. **Audio/video playback** — HTML5 `<audio>`/`<video>` with custom controls
2. **Reading progress** — Track last read ayah per surah
3. **Supabase sync** — Auth + cross-device favorites/progress
4. **Offline support** — Service worker + IndexedDB
5. **Ayah deep-linking** — `/surah/2#ayah=255`
6. **Share ayahs** — Web Share API
