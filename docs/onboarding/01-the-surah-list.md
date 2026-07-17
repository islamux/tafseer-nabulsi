# 01 — The Surah List

Now let's read real code. This lesson walks the **Home page** — the list of 114 surahs you see when you open the app. It's the best place to meet your first React ideas.

---

## What you'll learn

- What a **component** is.
- **JSX** — writing HTML-like markup inside JavaScript.
- **Props** — passing data into a component.
- **Importing and exporting** code between files.
- Rendering a **list** with `.map()`.
- **Consuming context** — reading shared data the easy way.

**Prerequisite JavaScript:** arrays, `.filter()`, and `.map()`. We'll cover these in a concept box — don't worry if they're new.

## The feature

Open the app and you land on the Home page: a heading, a search/filter box, and a scrollable list of all 114 surahs. Each row shows the surah's number, its Arabic name, its ayah count, and a small "تفسير" (tafsir) badge if tafsir is available. Type in the box and the list filters instantly. Click a surah to open it.

That entire screen is one component: `SurahList`.

## Read the code

Open `web/src/components/SurahList.jsx`. We'll walk it top to bottom.

### Imports (lines 1–5)

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { toArabicNum } from '../utils/arabic'
import Spinner from './Spinner'
```

Each `import` brings in something this file needs:
- `useState` — a React tool we'll use soon (covered fully in [lesson 03](./03-themes.md)).
- `Link` — lets us make clickable navigation without reloading the page.
- `useData` — gives us access to the shared surah list (context — explained below).
- `toArabicNum` — a helper that turns `1` into `١` (Arabic numerals).
- `Spinner` — the loading animation.

> The `{ braces }` in `import { useState }` vs no braces in `import Spinner` matters: braces grab a *specific named* export; no braces grabs the *default* export. We'll revisit this in the exporting concept box.

### The component (lines 7–9)

```jsx
export default function SurahList() {
  const { index, indexError } = useData()
  const [filter, setFilter] = useState('')
```

This is the heart of it. `SurahList` is **a function that returns UI** — that's all a component is. It's marked `export default` so other files can import it.

- `useData()` reaches into a shared "data store" (a React **context**) and pulls out `index` (the list of surahs) and `indexError` (an error message if loading failed). For now, think of context as a global variable someone else set up — we're just *reading* it. (We'll build our own context from scratch in [lesson 03](./03-themes.md).)
- `useState('')` creates a tiny piece of memory called `filter` — what the user typed in the box. It starts empty.

### Filtering the list (lines 11–14)

```jsx
const filtered = index.filter(s =>
  s.name.includes(filter) ||
  String(s.surah_id).includes(filter)
)
```

From the full `index`, keep only the surahs whose name or number contains what the user typed. See the concept box on `.filter()` below.

### The three branches: error, loading, normal (lines 16–35)

```jsx
if (indexError) { return ( /* error screen with a retry button */ ) }
if (index.length === 0) { return <Spinner /> }
```

A good component always thinks about *what could go wrong*: if loading failed, show an error; if data hasn't arrived yet (`index` is empty), show a spinner. Only when data is ready do we render the real list. (We go deeper on loading states in [lesson 02](./02-reading-a-surah.md).)

### Rendering the list (lines 55–81)

```jsx
{filtered.map(surah => (
  <Link
    key={surah.surah_id}
    to={`/surah/${surah.surah_id}`}
    className="surah-row ..."
  >
    <span className="...">{toArabicNum(surah.surah_id)}</span>
    <h2 className="...">{surah.name}</h2>
    <p className="...">{toArabicNum(surah.ayah_count)} آية</p>
    {surah.has_tafsir && <span className="...">تفسير</span>}
  </Link>
))}
```

This is the most important pattern in React. We take the `filtered` array and `.map()` each surah into a `<Link>` element. React then draws one row per surah. Notice:

- `key={surah.surah_id}` — React needs a unique id for each item in a list so it can track them.
- `to={`/surah/${surah.surah_id}`}` — backticks let us embed a variable into a string. This is where the click navigates.
- `{surah.has_tafsir && <span>...</span>}` — only show the badge *if* the surah has tafsir. This is **conditional rendering** (more in [lesson 02](./02-reading-a-surah.md)).

---

## Concept boxes

### 🧱 Prerequisite JS: arrays, `.filter()`, and `.map()`

An **array** is an ordered list of values:
```js
const nums = [1, 2, 3]
const surahs = [{ surah_id: 1, name: 'الفاتحة' }, { surah_id: 2, name: 'البقرة' }]
```

**`.filter()`** returns a *new* array with only the items that pass a test:
```js
const big = [1, 2, 3, 4].filter(n => n > 2)   // [3, 4]
```
The function `n => n > 2` is called for each item; items where it returns `true` are kept.

**`.map()`** returns a *new* array where each item has been *transformed*:
```js
const doubled = [1, 2, 3].map(n => n * 2)      // [2, 4, 6]
```

In React, instead of mapping numbers to numbers, we map data items to **JSX elements** — that's how a list of data becomes a list of on-screen rows.

### 🧱 What a component is

A component is a **function that returns UI** (specifically, JSX). That's the whole mental model:
```jsx
function Greeting() {
  return <h1>Hello</h1>
}
```
Components let you split a UI into reusable pieces. Big screens are just many small components composed together.

### 🧱 JSX

JSX looks like HTML but it's JavaScript. A few rules differ from HTML:
- `class` becomes `className` (because `class` is a reserved word in JS).
- You embed JavaScript expressions with `{ }` — e.g. `{surah.name}` or `{toArabicNum(surah.surah_id)}`.
- A component must return a **single parent element** (or use a fragment `<>...</>`).

### 🧱 Props

Props are data passed **into** a component by its parent — like arguments to a function. In this file, `SurahList` doesn't receive props, but we *pass* props to `<Link>`:
```jsx
<Link to="/surah/2" className="surah-row">...</Link>
```
Here `to` and `className` are props. We'll see a component *receive* props as `{ ayah, surahId }` in [lesson 02](./02-reading-a-surah.md).

### 🧱 Imports & exports

Files share code via `import` / `export`:
- `export default function SurahList()` — this file's main export. Imported as `import SurahList from './SurahList'` (no braces).
- `export function useData()` — a *named* export. Imported as `import { useData } from '../contexts/DataContext'` (braces).

Rule of thumb: one default export per file; any number of named exports.

### 🧱 Consuming context

```jsx
const { index, indexError } = useData()
```
`DataContext` is a shared store that holds the surah list. `useData()` is a tiny helper that reads it. The `{ index, indexError }` syntax is **destructuring** — it pulls two named fields out of the returned object. You don't need to know *how* the store works yet — just that `useData()` hands you the data. We'll build our own store in [lesson 03](./03-themes.md).

---

## Exercise

Add a small caption under each surah's name showing its number, like `رقم السورة: ١`.

**Where:** In `SurahList.jsx`, inside the `<div>` block around lines 67–72 (right under the `<h2>` with the surah name). Use the `toArabicNum` helper that's already imported.

**Hint:** Something like:
```jsx
<p className="text-xs mt-0.5 arabic-text text-secondary">
  رقم السورة: {toArabicNum(surah.surah_id)}
</p>
```
Save the file and check the Home page — every row should now show its number.

## Checkpoint

You should now understand:

- ✅ A component is a function that returns JSX.
- ✅ How to read JSX and why `className`/`{ }` are used.
- ✅ Props are data passed into a component.
- ✅ How `.map()` turns a data array into a list of elements.
- ✅ How to import/export between files.
- ✅ How `useData()` reads shared data from context.

Next up: **[02 — Reading a Surah](./02-reading-a-surah.md)** — components composed together, async data loading, and conditional rendering.
