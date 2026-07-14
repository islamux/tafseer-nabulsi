# Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React SPA for reading Quran tafsir with search, favorites, and theme switching.

**Architecture:** Lazy-load per-surah JSON files, client-side search across all surahs, localStorage for favorites/themes, React Context for state management.

**Tech Stack:** React 18, Vite, Tailwind CSS, react-router-dom, Noto Naskh Arabic font

---

## File Map

| File | Purpose |
|------|---------|
| `web/package.json` | Dependencies + scripts |
| `web/vite.config.js` | Vite config |
| `web/tailwind.config.js` | Tailwind config + theme colors |
| `web/postcss.config.js` | PostCSS for Tailwind |
| `web/index.html` | Entry HTML |
| `web/src/index.css` | Tailwind directives + CSS theme vars |
| `web/src/main.jsx` | React entry point |
| `web/src/App.jsx` | Router + context providers |
| `web/src/api/data.js` | loadIndex(), loadSurah(), searchQuery() |
| `web/src/contexts/ThemeContext.jsx` | Theme state + localStorage |
| `web/src/contexts/FavoritesContext.jsx` | Favorites state + localStorage |
| `web/src/contexts/DataContext.jsx` | Surah data cache + search |
| `web/src/components/Layout.jsx` | Header + main wrapper |
| `web/src/components/SurahList.jsx` | Home: 114 surah cards |
| `web/src/components/SurahView.jsx` | Ayah list + tafsir |
| `web/src/components/AyahCard.jsx` | Single ayah display |
| `web/src/components/SearchBar.jsx` | Search input + results |
| `web/src/components/ThemeToggle.jsx` | Light/Dark/Sepia switch |
| `web/public/data/_index.json` | Copied from pipeline output |
| `web/public/data/*.json` | Copied from pipeline output |

---

## Task 1: Scaffold Vite + React project

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/tailwind.config.js`
- Create: `web/postcss.config.js`
- Create: `web/index.html`
- Create: `web/src/main.jsx`
- Create: `web/src/index.css`

- [ ] **Step 1: Create web directory and package.json**

```bash
mkdir -p web/src web/public/data
```

```json
// web/package.json
{
  "name": "tafsir-nabulsi-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "copy-data": "cp ../pipeline/output/*.json public/data/"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39",
    "tailwindcss": "^3.4.6",
    "vite": "^5.3.4"
  }
}
```

- [ ] **Step 2: Create vite.config.js**

```js
// web/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

- [ ] **Step 3: Create tailwind.config.js**

```js
// web/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['"Noto Naskh Arabic"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          light: '#00897b',
          dark: '#4db6ac',
          sepia: '#00796b',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: Create postcss.config.js**

```js
// web/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Create index.html**

```html
<!-- web/index.html -->
<!DOCTYPE html>
<html lang="ar" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>تفسير النابلسي</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
```

- [ ] **Step 6: Create src/index.css**

```css
/* web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --accent: #00897b;
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

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color 0.2s, color 0.2s;
}
```

- [ ] **Step 7: Create src/main.jsx**

```jsx
// web/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 8: Install dependencies**

```bash
cd web && npm install
```

- [ ] **Step 9: Verify dev server starts**

```bash
cd web && npm run dev
```

Expected: Server starts on http://localhost:5173

- [ ] **Step 10: Commit**

```bash
git add web/
git commit -m "feat: scaffold Vite + React + Tailwind project"
```

---

## Task 2: Theme Context + Toggle

**Files:**
- Create: `web/src/contexts/ThemeContext.jsx`
- Create: `web/src/components/ThemeToggle.jsx`

- [ ] **Step 1: Create ThemeContext**

```jsx
// web/src/contexts/ThemeContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

const THEMES = ['light', 'dark', 'sepia']

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tafsir-theme') || 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('tafsir-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => {
      const idx = THEMES.indexOf(prev)
      return THEMES[(idx + 1) % THEMES.length]
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

- [ ] **Step 2: Create ThemeToggle component**

```jsx
// web/src/components/ThemeToggle.jsx
import { useTheme } from '../contexts/ThemeContext'

const ICONS = {
  light: '☀️',
  dark: '🌙',
  sepia: '📜',
}

const LABELS = {
  light: 'Light',
  dark: 'Dark',
  sepia: 'Sepia',
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
      }}
      title={`Current: ${LABELS[theme]}. Click to switch.`}
    >
      <span>{ICONS[theme]}</span>
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  )
}
```

- [ ] **Step 3: Wire ThemeProvider into App.jsx**

```jsx
// web/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'

function Home() {
  return <div className="p-8 text-center" style={{ color: 'var(--text-primary)' }}>Home - SurahList coming soon</div>
}

function SurahView() {
  return <div className="p-8 text-center" style={{ color: 'var(--text-primary)' }}>SurahView coming soon</div>
}

function Search() {
  return <div className="p-8 text-center" style={{ color: 'var(--text-primary)' }}>Search coming soon</div>
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/surah/:id" element={<SurahView />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}
```

- [ ] **Step 4: Add ThemeToggle to a temporary layout to test**

Replace the `Home` component in App.jsx temporarily:

```jsx
function Home() {
  const { theme } = useTheme()
  return (
    <div className="p-8 text-center" style={{ color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)' }}>
      <p>Current theme: {theme}</p>
      <ThemeToggle />
    </div>
  )
}
```

- [ ] **Step 5: Verify theme switching works**

Run `npm run dev`, open browser, click toggle. Background and text should change.

- [ ] **Step 6: Commit**

```bash
git add src/contexts/ThemeContext.jsx src/components/ThemeToggle.jsx src/App.jsx
git commit -m "feat: add theme context with dark/sepia/light modes"
```

---

## Task 3: Favorites Context

**Files:**
- Create: `web/src/contexts/FavoritesContext.jsx`

- [ ] **Step 1: Create FavoritesContext**

```jsx
// web/src/contexts/FavoritesContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const FavoritesContext = createContext()

const STORAGE_KEY = 'tafsir-favorites'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    // Convert arrays to Sets
    const result = {}
    for (const [surahId, ayahs] of Object.entries(parsed)) {
      result[surahId] = new Set(ayahs)
    }
    return result
  } catch {
    return {}
  }
}

function saveFavorites(favorites) {
  const obj = {}
  for (const [surahId, ayahSet] of Object.entries(favorites)) {
    obj[surahId] = [...ayahSet]
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadFavorites)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const toggleFavorite = useCallback((surahId, ayahNumber) => {
    setFavorites(prev => {
      const key = String(surahId)
      const current = prev[key] || new Set()
      const next = new Set(current)
      if (next.has(ayahNumber)) {
        next.delete(ayahNumber)
      } else {
        next.add(ayahNumber)
      }
      return { ...prev, [key]: next }
    })
  }, [])

  const isFavorite = useCallback((surahId, ayahNumber) => {
    const key = String(surahId)
    return favorites[key]?.has(ayahNumber) || false
  }, [favorites])

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
```

- [ ] **Step 2: Wire FavoritesProvider into App.jsx**

```jsx
// web/src/App.jsx
import { ThemeProvider } from './contexts/ThemeContext'
import { FavoritesProvider } from './contexts/FavoritesContext'

// ... in App component:
<ThemeProvider>
  <FavoritesProvider>
    <BrowserRouter>
      {/* routes */}
    </BrowserRouter>
  </FavoritesProvider>
</ThemeProvider>
```

- [ ] **Step 3: Commit**

```bash
git add src/contexts/FavoritesContext.jsx src/App.jsx
git commit -m "feat: add favorites context with localStorage persistence"
```

---

## Task 4: Data API + DataContext

**Files:**
- Create: `web/src/api/data.js`
- Create: `web/src/contexts/DataContext.jsx`

- [ ] **Step 1: Create data API module**

```js
// web/src/api/data.js
const DATA_BASE = '/data'

let indexCache = null
let surahCache = new Map()
let searchIndexCache = null

export async function loadIndex() {
  if (indexCache) return indexCache
  const resp = await fetch(`${DATA_BASE}/_index.json`)
  if (!resp.ok) throw new Error(`Failed to load index: ${resp.status}`)
  indexCache = await resp.json()
  return indexCache
}

export async function loadSurah(id) {
  if (surahCache.has(id)) return surahCache.get(id)
  const resp = await fetch(`${DATA_BASE}/${id}.json`)
  if (!resp.ok) throw new Error(`Failed to load surah ${id}: ${resp.status}`)
  const data = await resp.json()
  surahCache.set(id, data)
  return data
}

export async function loadAllSurahs(onProgress) {
  const index = await loadIndex()
  const total = index.length
  const loaded = []

  for (let i = 0; i < total; i++) {
    const surahId = index[i].surah_id
    const data = await loadSurah(surahId)
    loaded.push(data)
    if (onProgress) onProgress(i + 1, total)
  }

  return loaded
}

export async function buildSearchIndex(onProgress) {
  if (searchIndexCache) return searchIndexCache
  const allSurahs = await loadAllSurahs(onProgress)

  searchIndexCache = allSurahs.flatMap(surah =>
    surah.ayahs.map(ayah => ({
      surah_id: surah.surah_id,
      surah_name: surah.name,
      ayah_number: ayah.number,
      text: ayah.text || '',
      tafsir_short: ayah.tafsir_short || '',
      tafsir_long: ayah.tafsir_long || '',
    }))
  )

  return searchIndexCache
}

export function searchLocal(query, index) {
  if (!query || !index) return []
  const q = query.toLowerCase()
  return index.filter(entry =>
    entry.text.toLowerCase().includes(q) ||
    entry.tafsir_short.toLowerCase().includes(q) ||
    entry.tafsir_long.toLowerCase().includes(q)
  ).slice(0, 50) // limit results
}
```

- [ ] **Step 2: Create DataContext**

```jsx
// web/src/contexts/DataContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loadIndex, loadSurah, buildSearchIndex, searchLocal } from '../api/data'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [index, setIndex] = useState([])
  const [surahCache, setSurahCache] = useState(new Map())
  const [searchIndex, setSearchIndex] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)

  useEffect(() => {
    loadIndex().then(setIndex).catch(console.error)
  }, [])

  const getSurah = useCallback(async (id) => {
    if (surahCache.has(id)) return surahCache.get(id)
    const data = await loadSurah(id)
    setSurahCache(prev => new Map(prev).set(id, data))
    return data
  }, [surahCache])

  const search = useCallback(async (query) => {
    if (!query) return []
    let idx = searchIndex
    if (!idx) {
      setSearchLoading(true)
      idx = await buildSearchIndex((done, total) => {
        setSearchProgress(Math.round((done / total) * 100))
      })
      setSearchIndex(idx)
      setSearchLoading(false)
    }
    return searchLocal(query, idx)
  }, [searchIndex])

  return (
    <DataContext.Provider value={{
      index,
      getSurah,
      search,
      searchLoading,
      searchProgress,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
```

- [ ] **Step 3: Wire DataProvider into App.jsx**

```jsx
// web/src/App.jsx
import { DataProvider } from './contexts/DataContext'

// ... in App:
<ThemeProvider>
  <FavoritesProvider>
    <DataProvider>
      <BrowserRouter>
        {/* routes */}
      </BrowserRouter>
    </DataProvider>
  </FavoritesProvider>
</ThemeProvider>
```

- [ ] **Step 4: Commit**

```bash
git add src/api/data.js src/contexts/DataContext.jsx src/App.jsx
git commit -m "feat: add data API and context with lazy loading + search"
```

---

## Task 5: Copy Data Files

**Files:**
- Create: `web/public/data/` (copy from pipeline/output)

- [ ] **Step 1: Copy JSON files**

```bash
mkdir -p web/public/data
cp pipeline/output/*.json web/public/data/
ls web/public/data/ | head -20
```

Expected: Shows _index.json, 1.json, 2.json, ... 114.json

- [ ] **Step 2: Verify _index.json structure**

```bash
cat web/public/data/_index.json | head -20
```

- [ ] **Step 3: Commit**

```bash
git add web/public/data/
git commit -m "data: copy pipeline output to web public data"
```

---

## Task 6: Layout Component

**Files:**
- Create: `web/src/components/Layout.jsx`

- [ ] **Step 1: Create Layout**

```jsx
// web/src/components/Layout.jsx
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-bold" style={{ color: 'var(--accent)' }}>
            تفسير النابلسي
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/search"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline"
            style={{
              backgroundColor: location.pathname === '/search' ? 'var(--accent)' : 'transparent',
              color: location.pathname === '/search' ? '#fff' : 'var(--text-primary)',
            }}
          >
            <span>🔍</span>
            <span className="hidden sm:inline">Search</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Wire Layout into App.jsx**

Update App.jsx routes to use Layout:

```jsx
import Layout from './components/Layout'

// In Routes:
<Layout>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/surah/:id" element={<SurahView />} />
    <Route path="/search" element={<Search />} />
  </Routes>
</Layout>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Layout.jsx src/App.jsx
git commit -m "feat: add layout with header, search link, and theme toggle"
```

---

## Task 7: SurahList Component (Home)

**Files:**
- Create: `web/src/components/SurahList.jsx`

- [ ] **Step 1: Create SurahList**

```jsx
// web/src/components/SurahList.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'

export default function SurahList() {
  const { index } = useData()
  const [filter, setFilter] = useState('')

  const filtered = index.filter(s =>
    s.name.includes(filter) ||
    String(s.surah_id).includes(filter)
  )

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-4 font-arabic"
        style={{ color: 'var(--text-primary)' }}
      >
        سور القرآن الكريم
      </h1>

      {/* Search filter */}
      <input
        type="text"
        placeholder="ابحث عن سورة..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full mb-6 px-4 py-2.5 rounded-xl text-sm border-0 outline-none font-arabic"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        }}
      />

      {/* Surah grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map(surah => (
          <Link
            key={surah.surah_id}
            to={`/surah/${surah.surah_id}`}
            className="block p-4 rounded-xl transition-shadow hover:shadow-md no-underline"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-60">{surah.surah_id}</span>
              {surah.has_tafsir && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  تفسير
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold font-arabic mt-1">{surah.name}</h2>
            <p className="text-xs opacity-60 mt-1">{surah.ayah_count} آية</p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center opacity-60 mt-8" style={{ color: 'var(--text-secondary)' }}>
          لا توجد نتائج
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire SurahList into App.jsx as Home**

```jsx
import SurahList from './components/SurahList'

// Replace Home function:
// (Remove the temporary Home component, use SurahList directly in route)
<Route path="/" element={<SurahList />} />
```

- [ ] **Step 3: Verify home page shows surah list**

Run dev server, check that 114 surahs display in a grid.

- [ ] **Step 4: Commit**

```bash
git add src/components/SurahList.jsx src/App.jsx
git commit -m "feat: add surah list home page with search filter"
```

---

## Task 8: AyahCard Component

**Files:**
- Create: `web/src/components/AyahCard.jsx`

- [ ] **Step 1: Create AyahCard**

```jsx
// web/src/components/AyahCard.jsx
import { useState } from 'react'
import { useFavorites } from '../contexts/FavoritesContext'

export default function AyahCard({ ayah, surahId }) {
  const [expanded, setExpanded] = useState(false)
  const { toggleFavorite, isFavorite } = useFavorites()
  const fav = isFavorite(surahId, ayah.number)

  return (
    <div
      className="p-4 rounded-xl mb-3 transition-shadow"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Ayah number + text */}
      <div className="flex items-start gap-3">
        <span
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {ayah.number}
        </span>
        <p className="text-lg leading-relaxed font-arabic flex-1" style={{ color: 'var(--text-primary)' }}>
          {ayah.text}
        </p>
      </div>

      {/* Tafsir short */}
      {ayah.tafsir_short && (
        <p className="mt-3 text-sm opacity-80 font-arabic" style={{ color: 'var(--text-secondary)' }}>
          {ayah.tafsir_short}
        </p>
      )}

      {/* Tafsir long (expandable) */}
      {ayah.tafsir_long && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium underline"
            style={{ color: 'var(--accent)' }}
          >
            {expanded ? 'إخفاء التفسير' : 'عرض التفسير الكامل'}
          </button>
          {expanded && (
            <p className="mt-2 text-sm leading-relaxed font-arabic whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
              {ayah.tafsir_long}
            </p>
          )}
        </div>
      )}

      {/* Favorite button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => toggleFavorite(surahId, ayah.number)}
          className="text-xl transition-transform hover:scale-110"
          title={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          {fav ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AyahCard.jsx
git commit -m "feat: add ayah card with tafsir expand and favorite toggle"
```

---

## Task 9: SurahView Component

**Files:**
- Create: `web/src/components/SurahView.jsx`

- [ ] **Step 1: Create SurahView**

```jsx
// web/src/components/SurahView.jsx
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import AyahCard from './AyahCard'

export default function SurahView() {
  const { id } = useParams()
  const surahId = parseInt(id, 10)
  const { getSurah, index } = useData()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const surahMeta = index.find(s => s.surah_id === surahId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getSurah(surahId)
      .then(data => {
        if (!cancelled) setSurah(data)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [surahId, getSurah])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-secondary)' }}>خطأ: {error}</p>
        <Link to="/" className="mt-4 inline-block" style={{ color: 'var(--accent)' }}>العودة للرئيسية</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Back link */}
      <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--accent)' }}>
        ← العودة للسور
      </Link>

      {/* Surah header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-arabic" style={{ color: 'var(--text-primary)' }}>
          سورة {surahMeta?.name || surah?.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {surah?.ayahs?.length || surahMeta?.ayah_count} آية
        </p>
      </div>

      {/* Ayah list */}
      <div>
        {surah?.ayahs?.map(ayah => (
          <AyahCard key={ayah.number} ayah={ayah} surahId={surahId} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire SurahView into App.jsx**

```jsx
import SurahView from './components/SurahView'

// In Routes:
<Route path="/surah/:id" element={<SurahView />} />
```

- [ ] **Step 3: Verify surah view works**

Navigate to `/surah/1`, verify ayahs display with tafsir.

- [ ] **Step 4: Commit**

```bash
git add src/components/SurahView.jsx src/App.jsx
git commit -m "feat: add surah view with ayah list and loading states"
```

---

## Task 10: SearchBar Component

**Files:**
- Create: `web/src/components/SearchBar.jsx`

- [ ] **Step 1: Create SearchBar**

```jsx
// web/src/components/SearchBar.jsx
import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'

export default function SearchBar() {
  const { search, searchLoading, searchProgress } = useData()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearched(true)
    const res = await search(query.trim())
    setResults(res)
  }, [query, search])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 font-arabic" style={{ color: 'var(--text-primary)' }}>
        البحث في القرآن والتفسير
      </h1>

      {/* Search input */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="ابحث في النص أو التفسير..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm border-0 outline-none font-arabic"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searchLoading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {searchLoading ? `جاري التحميل... ${searchProgress}%` : 'بحث'}
        </button>
      </div>

      {/* Loading */}
      {searchLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3" style={{ borderColor: 'var(--accent)' }}></div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            جاري تحميل البيانات... {searchProgress}%
          </p>
        </div>
      )}

      {/* Results */}
      {!searchLoading && searched && results.length === 0 && (
        <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          لا توجد نتائج لـ "{query}"
        </p>
      )}

      {!searchLoading && results.length > 0 && (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {results.length} نتيجة
          </p>
          {results.map((r, i) => (
            <Link
              key={`${r.surah_id}-${r.ayah_number}-${i}`}
              to={`/surah/${r.surah_id}`}
              className="block p-4 rounded-xl mb-3 transition-shadow hover:shadow-md no-underline"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                  سورة {r.surah_name} — آية {r.ayah_number}
                </span>
              </div>
              <p className="text-sm font-arabic line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                {r.text}
              </p>
              {(r.tafsir_short || r.tafsir_long) && (
                <p className="text-xs mt-1 font-arabic line-clamp-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                  {r.tafsir_short || r.tafsir_long.slice(0, 150)}...
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Wire SearchBar into App.jsx**

```jsx
import SearchBar from './components/SearchBar'

// In Routes:
<Route path="/search" element={<SearchBar />} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/SearchBar.jsx src/App.jsx
git commit -m "feat: add search with client-side filtering and loading state"
```

---

## Task 11: Final App.jsx Cleanup

**Files:**
- Modify: `web/src/App.jsx`

- [ ] **Step 1: Final App.jsx**

```jsx
// web/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { DataProvider } from './contexts/DataContext'
import Layout from './components/Layout'
import SurahList from './components/SurahList'
import SurahView from './components/SurahView'
import SearchBar from './components/SearchBar'

export default function App() {
  return (
    <ThemeProvider>
      <FavoritesProvider>
        <DataProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                <Route path="/" element={<SurahList />} />
                <Route path="/surah/:id" element={<SurahView />} />
                <Route path="/search" element={<SearchBar />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </DataProvider>
      </FavoritesProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "chore: finalize App.jsx with all providers and routes"
```

---

## Task 12: Build Verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run dev server and test all features**

```bash
cd web && npm run dev
```

Test manually:
1. Home page shows 114 surahs
2. Click surah → ayahs load with tafsir
3. Expand tafsir long text
4. Toggle favorite heart
5. Search finds results
6. Theme toggle works

- [ ] **Step 2: Run production build**

```bash
cd web && npm run build
```

Expected: No errors, output in `dist/`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: web app MVP complete"
```
