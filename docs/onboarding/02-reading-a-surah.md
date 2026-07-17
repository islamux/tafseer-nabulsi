# 02 — Reading a Surah

In lesson 01 you met a single component. Real apps are built from **many** components working together. This lesson walks the "read a surah" screen — where one component loads data, and renders a bunch of child components, one per ayah.

---

## What you'll learn

- **Composition** — components inside components.
- **Props, parent → child** — how a parent passes data down.
- **Conditional rendering** — showing UI only when data exists.
- **Async data loading** + **loading/error states**.
- **Pure helper functions** — why we pull logic out into `utils/`.

**Prerequisite JavaScript:** functions, objects, and an idea of what "async" means. We'll introduce **promises** and `.then()` in a concept box.

## The feature

Click any surah on the Home page and you arrive here. The screen shows the surah name, then a list of its ayahs. Each ayah shows:
- The verse text in large Arabic.
- An optional short summary.
- A button to expand the **full tafsir**.
- A heart icon to favorite it (we'll cover favorites in [lesson 04](./04-favorites.md)).

While the surah is loading, you see a spinner. If it fails, you see an error with a link home.

This screen is two components working together: `SurahView` (the parent) and `AyahCard` (one per ayah).

## Read the code

### `web/src/components/SurahView.jsx` — the parent

Open it. The interesting parts:

**Reading the URL (lines 9–11):**
```jsx
const { id } = useParams()
const surahId = parseInt(id, 10)
const { fetchSurah, index } = useData()
```
- `useParams()` reads the URL. Remember the route `/surah/:id` from lesson 01's `<Link to={...}>`? Here `:id` becomes `{ id }`. So `/surah/2` gives `id === "2"`.
- `parseInt(id, 10)` turns the string `"2"` into the number `2`.
- `fetchSurah` (from context) loads that surah's data.

**Loading the data (lines 18–35):**
```jsx
useEffect(() => {
  let cancelled = false
  setLoading(true)
  setError(null)

  fetchSurah(surahId)
    .then(surahData => { if (!cancelled) setSurah(surahData) })
    .catch(err => { if (!cancelled) setError(err.message) })
    .finally(() => { if (!cancelled) setLoading(false) })

  return () => { cancelled = true }
}, [surahId, fetchSurah])
```
This is the **async loading** pattern. We ask for the surah; while we wait, `loading` is `true`. When it arrives we store it in `surah`; if it errors we store the error. The `cancelled` flag is a cleanup trick — see the concept box.

**The three states (lines 37–48):**
```jsx
if (loading) { return <Spinner /> }
if (error)   { return <div>...error + link home...</div> }
```
Same idea as lesson 01: handle loading, handle error, *then* render success.

**Rendering the children (lines 65–69):**
```jsx
{surah?.ayahs?.map(ayah => (
  <AyahCard key={ayah.number} ayah={ayah} surahId={surahId} />
))}
```
Here's **composition**: `SurahView` maps over the ayahs and renders an `<AyahCard>` for each one, **passing props down** (`ayah={...}` and `surahId={...}`). The `?.` is optional chaining — it safely returns `undefined` if `surah` or `ayahs` is missing, instead of crashing.

### `web/src/components/AyahCard.jsx` — the child

Open it. Notice the function signature:

```jsx
export default function AyahCard({ ayah, surahId }) {
```
This component **receives props**: `ayah` (the verse data) and `surahId`. That's how the parent→child data flow works — `SurahView` passes them, `AyahCard` receives them by name.

**Conditional rendering (lines 27–31):**
```jsx
{ayah.tafsir_short && (
  <p className="...">{toArabicNum(ayah.tafsir_short)}</p>
)}
```
The `&&` means: "if `ayah.tafsir_short` exists, render the `<p>`; otherwise render nothing." This is how you show optional UI.

**Ternary for the button (lines 36–39):**
```jsx
{expanded ? 'إخفاء التفسير' : 'عرض التفسير الكامل'}
```
A ternary (`condition ? a : b`) picks between two values. Here it flips the button label depending on whether the tafsir is expanded.

**Using a helper function (line 11):**
```jsx
const { year, body: tafsirBody } = parseTafsir(ayah.tafsir_long || '')
```
Instead of doing the date-stripping logic *inside* the component, we call `parseTafsir` from `utils/tafsir.js`. That keeps the component clean and the logic reusable/testable. (See the pure-functions concept box.)

### `web/src/utils/tafsir.js` — a pure helper

```jsx
export function parseTafsir(tafsirLong) {
  const dateMatch = tafsirLong.match(/^(\d{4})-\d{2}-\d{2}\s*/)
  if (!dateMatch) return { year: null, body: tafsirLong }
  return { year: dateMatch[1], body: tafsirLong.slice(dateMatch[0].length) }
}
```
Some tafsir texts begin with a date like `2018-03-10`. This function splits it off, returning `{ year, body }`. It's a **pure function**: same input always gives the same output, no side effects. We'll test it in [lesson 08](./08-tests-and-first-change.md).

---

## Concept boxes

### 🧱 Prerequisite JS: promises and `.then()`

Some operations take time — loading a file, asking a server. A **promise** is "a value that will arrive later." You handle it with `.then()`:

```js
fetchSurah(2)
  .then(data => console.log('got it', data))   // runs when ready
  .catch(err => console.log('failed', err))    // runs on error
  .finally(() => console.log('done'))          // runs either way
```

Think of it like ordering food: you get a receipt (the promise), then later it either arrives (`.then`) or the kitchen says they're out (`.catch`). (There's a cleaner syntax called `async`/`await` — we'll use it in [lesson 05](./05-search.md).)

### 🧱 Composition

Big UIs are built by nesting small components. `SurahView` doesn't render every ayah's details itself — it delegates each ayah to an `AyahCard`. This keeps each component focused and small. A screen is a tree of components.

### 🧱 Props, parent → child

Data flows **down** via props. The parent decides what to pass:
```jsx
<AyahCard ayah={ayah} surahId={surahId} />
```
The child receives them by destructuring: `function AyahCard({ ayah, surahId })`. The child can't change its props — it just reads them. (Changing data is *state*, covered in [lesson 03](./03-themes.md).)

### 🧱 Conditional rendering

Three common forms:
```jsx
{hasTafsir && <Badge />}            // show only if true
{expanded ? 'Hide' : 'Show'}        // pick between two
{surah?.name}                       // safely read maybe-missing data
```

### 🧱 Loading & error states

Whenever you load data asynchronously, the UI has **three** possible states: loading, error, success. Always handle all three, or the user stares at a blank screen. `SurahView` returns `<Spinner />` while loading, an error block on failure, and the real list on success.

### 🧱 The `cancelled` cleanup flag

If the user navigates away while data is still loading, the component is gone — but the `.then()` will still fire later and try to update a component that no longer exists (a bug). The `let cancelled = false` + `return () => { cancelled = true }` trick says: "if I've been unmounted, ignore the late result." You'll see this pattern often.

### 🧱 Pure functions & utils

Logic that doesn't depend on React (like `parseTafsir`) is pulled into `web/src/utils/` as plain functions. Benefits: the component stays readable, the function is reusable, and it's easy to unit-test (lesson 08). Rule of thumb: **components render; utils compute.**

---

## Exercise

Make the full tafsir **expanded by default** instead of collapsed.

**Where:** `web/src/components/AyahCard.jsx`, line 7:
```jsx
const [expanded, setExpanded] = useState(false)
```
Change `false` to `true`. Save and open a surah that has tafsir — the full tafsir should be visible immediately, with the button now reading "إخفاء التفسير" (hide).

This tiny change shows how `useState` controls the UI: flip the starting value, and the whole render adapts.

## Checkpoint

You should now understand:

- ✅ Composition — components rendering other components.
- ✅ Props flowing from parent to child.
- ✅ Conditional rendering (`&&`, ternary, `?.`).
- ✅ Async loading with promises + `.then()`, and the loading/error/success pattern.
- ✅ Why helper logic lives in `utils/` as pure functions.

Next up: **[03 — Themes](./03-themes.md)** — your first `useState`, event handlers, and building a Context provider from scratch.
