# 04 — Favorites

Lesson 03 taught you `useState` with a single string (`theme`) and a simple Context. Favorites is the same idea, leveled up: the state is **structured** (an object full of `Set`s), updates must be **immutable**, and the data has to be **serialized** to fit in `localStorage`. It's the best example of "real" state management in this app.

---

## What you'll learn

- **Structured state** — objects and `Set`s inside `useState`.
- **Immutable updates** — why we never mutate state directly.
- **Derived values** — computing `isFavorite` from current state.
- **Serialization** — converting between `Set` and JSON for storage.
- Reinforcing the **provider/consumer** pattern.

**Prerequisite JavaScript:** objects, `Object.entries`, `Set`, and the spread operator `...`. All covered below.

## The feature

On any ayah, tap the heart: 🤍 → ❤️. The ayah is now favorited. Refresh the page — it's still favorited. Tap again to unfavorite. Favorites are stored per-surah, per-ayah, and saved in your browser.

## Read the code

### `web/src/components/AyahCard.jsx` — the heart button (consumer)

```jsx
const { toggleFavorite, isFavorite } = useFavorites()
const isFav = isFavorite(surahId, ayah.number)
const favLabel = isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'
```
and
```jsx
<button onClick={() => toggleFavorite(surahId, ayah.number)} title={favLabel} aria-label={favLabel}>
  {isFav ? '❤️' : '🤍'}
</button>
```
Two functions from context: `toggleFavorite(surahId, ayahNumber)` flips a favorite, `isFavorite(surahId, ayahNumber)` returns `true`/`false`. Notice `isFav` is **derived** from state — the component doesn't store it; it computes it. Let's see where the real data lives.

### `web/src/contexts/FavoritesContext.jsx` — the provider

**The shape of the data (mental model):**
```js
{ "1": Set{1, 2, 3},   // surah 1: ayahs 1, 2, 3 favorited
  "2": Set{5} }        // surah 2: ayah 5 favorited
```
It's a plain object whose keys are surah ids (as strings) and whose values are `Set`s of ayah numbers. A `Set` is perfect here — no duplicates, and `.has(n)` is fast.

**Loading from storage (lines 7–21):**
```jsx
function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const result = {}
    for (const [surahId, ayahs] of Object.entries(parsed)) {
      result[surahId] = new Set(ayahs)
    }
    return result
  } catch (e) {
    console.error('Failed to load favorites from localStorage:', e)
    return {}
  }
}
```
`localStorage` can only store strings, and JSON has no `Set` type — arrays only. So saved favorites look like `{ "1": [1,2,3] }`. This function reads that JSON and rebuilds each array into a `Set`. The `try/catch` guards against corrupt data (if someone manually broke the saved JSON, we fall back to `{}` instead of crashing).

**Saving to storage (lines 23–33):**
```jsx
function saveFavorites(favorites) {
  // ...for each surah, convert its Set back to an array: [...ayahSet]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}
```
The reverse: `Set` → array → JSON string. These two functions are the **serialization** layer.

**State + persistence effect (lines 36–40):**
```jsx
const [favorites, setFavorites] = useState(loadFavorites)

useEffect(() => {
  saveFavorites(favorites)
}, [favorites])
```
State starts from `loadFavorites` (lazy init — runs once). Whenever `favorites` changes, the effect saves it. This is the same `useEffect`-for-persistence pattern as the theme.

**The toggle — an immutable update (lines 42–54):**
```jsx
const toggleFavorite = useCallback((surahId, ayahNumber) => {
  setFavorites(prev => {
    const key = String(surahId)
    const current = prev[key] || new Set()
    const next = new Set(current)     // ← copy the Set
    if (next.has(ayahNumber)) {
      next.delete(ayahNumber)
    } else {
      next.add(ayahNumber)
    }
    return { ...prev, [key]: next }   // ← copy the object
  })
}, [])
```
Read this carefully — it's the key lesson. We **never mutate** `prev`. Instead we:
1. Copy the existing `Set` → `next`.
2. Add or remove the ayah on the copy.
3. Return a **new object** `{ ...prev, [key]: next }` that spreads the old data and overrides just this one surah.

Why all the copying? See the concept box on immutability.

**The derived value (lines 56–59):**
```jsx
const isFavorite = useCallback((surahId, ayahNumber) => {
  const key = String(surahId)
  return favorites[key]?.has(ayahNumber) || false
}, [favorites])
```
Instead of storing "is this favorited?" separately (which could drift out of sync), we **compute** it from the real data each time. Single source of truth.

---

## Concept boxes

### 🧱 Prerequisite JS: objects, `Object.entries`, `Set`, spread

- **Object:** a collection of key/value pairs: `{ name: 'Ali', age: 30 }`.
- **`Object.entries(obj)`** turns it into an array of `[key, value]` pairs: `[['name','Ali'], ['age',30]]`. Great for looping.
- **`Set`:** a collection of *unique* values. `new Set([1,1,2])` → `Set{1,2}`. Methods: `.add(x)`, `.delete(x)`, `.has(x)`. No duplicates, fast lookups.
- **Spread `...`:** expands a collection. `[...set]` copies a Set into an array; `{ ...obj }` shallow-copies an object; `[...arr, 4]` makes a new array with one more item.

### 🧱 Structured state

State isn't limited to a string or number. It can be any data structure — here, an object-of-`Set`s. The trade-off: more powerful, but updates need more care (immutability).

### 🧱 Immutable updates

React decides "should I re-render?" by checking whether the state value **changed**. If you mutate an object in place (`favorites['1'].add(5)`), it's still the *same* object in memory, so React may not notice the change. The fix: always build a **new** object/array/Set and pass that to the setter:
```jsx
// ❌ mutating — React might miss it
prev[key].add(ayahNumber)

// ✅ immutable — new object, React detects the change
const next = new Set(current); next.add(ayahNumber)
return { ...prev, [key]: next }
```
Rule of thumb: **copy, then change the copy, then return the copy.**

### 🧱 Derived values

If you can *compute* a value from existing state, don't store it separately. `isFavorite` is computed from `favorites` — so it can never disagree with the real data. Storing it separately risks two sources of truth drifting apart (a classic bug source).

### 🧱 Serialization

Some data types (like `Set`, `Map`, or `Date`) can't be saved directly as JSON. You convert to plain JSON-friendly types on the way out (`Set` → array) and rebuild on the way in (array → `Set`). Anytime you persist non-trivial data, expect a serialization layer.

### 🧱 `useCallback` (seen here)

`toggleFavorite` and `isFavorite` are wrapped in `useCallback(..., [])`. This memoizes the function so it keeps the same identity across renders. You don't need to master this yet — just know it's an optimization so consumers don't re-render needlessly. We'll revisit in later lessons.

---

## Exercise

Add a **"Clear all favorites"** button. Three small steps:

1. **In `FavoritesContext.jsx`**, add a `clearFavorites` function and expose it:
   ```jsx
   const clearFavorites = useCallback(() => setFavorites({}), [])
   ```
   Add it to the provider's `value={{ toggleFavorite, isFavorite, clearFavorites }}`.
2. **In `web/src/components/Layout.jsx`**, import `useFavorites`, destructure `clearFavorites`, and add a button in the header that calls it (e.g. next to the theme toggle).
3. Test: favorite a few ayahs, click your new button, and confirm the hearts reset to 🤍.

This exercise ties together state mutation, context, and a consumer UI change.

## Checkpoint

You should now understand:

- ✅ Structured state (objects + `Set`s) in `useState`.
- ✅ Immutable updates — copy, change the copy, return the copy.
- ✅ Derived values vs. duplicated state.
- ✅ Serializing `Set` ↔ JSON for `localStorage`.
- ✅ The provider/consumer loop reinforced.

Next up: **[05 — Search](./05-search.md)** — controlled inputs, `async`/`await`, `useEffect` deeper, and the search engine.
