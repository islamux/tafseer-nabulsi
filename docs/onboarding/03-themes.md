# 03 — Themes

In lessons 01 and 02 you *consumed* shared data via `useData()`. Now let's build the other side: the **provider** that creates shared data. The theme system is the perfect example — small, self-contained, and it teaches you `useState`, event handlers, and `useEffect` all at once.

---

## What you'll learn

- **`useState`** — giving a component memory.
- **Event handlers** — running code when the user clicks.
- **Building a Context provider** — creating shared data (the sender side).
- **`useEffect`** — running side-effects after render.
- **`localStorage`** — remembering data across refreshes.
- **CSS custom properties** — theming the whole app from one variable.

**Prerequisite JavaScript:** objects, arrays, and the idea of a "callback function."

## The feature

In the app header there's a theme button. Click it and the whole app cycles through three looks: **Light** → **Dark** → **Sepia** → back to Light. Pick one, refresh the page, and your choice is remembered.

This works because:
1. A `ThemeContext` **provider** holds the current theme in state.
2. A `useEffect` writes the theme to the `<html>` tag and to `localStorage`.
3. CSS variables change their colors based on a `data-theme` attribute.

## Read the code

### `web/src/components/ThemeToggle.jsx` — the button (consumer)

```jsx
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button onClick={toggleTheme} className="..." title={`Current: ${LABELS[theme]}. Click to switch.`}>
      <span>{ICONS[theme]}</span>
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  )
}
```
This is a **consumer** of context — same as lesson 01. It reads `theme` and `toggleTheme` from `useTheme()` and wires the button's `onClick` to `toggleTheme`. The icon/label (`ICONS`, `LABELS`) are looked up by the current theme name. Simple.

The real lesson is *where* `theme` and `toggleTheme` come from. Let's open the provider.

### `web/src/contexts/ThemeContext.jsx` — the provider (sender)

This is the most important file in this lesson. Read it slowly.

**1. Create the context channel (line 3):**
```jsx
const ThemeContext = createContext()
```
This creates an empty "channel" for sharing data. By itself it does nothing.

**2. State with a lazy initializer (lines 8–10):**
```jsx
const [theme, setTheme] = useState(() => {
  return localStorage.getItem('tafsir-theme') || 'light'
})
```
This is `useState` — the component's memory. The current theme lives in `theme`, and `setTheme` changes it. The function form `useState(() => ...)` is a **lazy initializer**: it runs *once*, on first load, to read any saved theme from `localStorage` (defaulting to `'light'`). This is how your choice survives a refresh.

**3. The side-effect (lines 12–15):**
```jsx
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('tafsir-theme', theme)
}, [theme])
```
"Whenever `theme` changes, do two things: set `data-theme="..."` on the `<html>` element, and save it to `localStorage`." The `[theme]` at the end is the **dependency array** — it says "only re-run this effect when `theme` changes." (More in the concept box.)

**4. The toggle function (lines 17–22):**
```jsx
const toggleTheme = () => {
  setTheme(prev => {
    const idx = THEMES.indexOf(prev)
    return THEMES[(idx + 1) % THEMES.length]
  })
}
```
`THEMES = ['light', 'dark', 'sepia']`. Find the current theme's position, add 1, and wrap around using `%` (modulo). `setTheme(prev => ...)` uses the **updater form** — it receives the previous value and returns the next. This is safer than reading `theme` directly.

**5. Provide the value (lines 24–28):**
```jsx
return (
  <ThemeContext.Provider value={{ theme, toggleTheme }}>
    {children}
  </ThemeContext.Provider>
)
```
This is what makes the data available to everyone inside. Anything wrapped by this provider can call `useTheme()` and get `{ theme, toggleTheme }`. The `children` prop is whatever the provider wraps (the whole app — see [lesson 06](./06-how-it-all-fits.md)).

**6. The consumer hook (lines 31–34):**
```jsx
export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```
A tiny helper that reads the context and throws a helpful error if used outside a provider. This is the pattern you'll see for every context in this codebase.

### `web/src/index.css` — CSS variables

How does changing `data-theme` recolor the whole app? CSS custom properties:

```css
:root {                      /* default = light */
  --bg-primary: #ffffff;
  --accent: #00897b;
  /* ... */
}
[data-theme="dark"] {        /* overrides when data-theme="dark" */
  --bg-primary: #121212;
  --accent: #4db6ac;
}
[data-theme="sepia"] {
  --bg-primary: #f4ecd8;
  --accent: #00796b;
}
```
Throughout the app, styles reference `var(--accent)` etc. So flipping one attribute on `<html>` instantly swaps every color. That's why the provider only needs to set `data-theme` — the CSS does the rest.

---

## Concept boxes

### 🧱 `useState`

`useState` gives a component **memory** that survives between renders:
```jsx
const [theme, setTheme] = useState('light')
```
- `theme` — the current value.
- `setTheme` — the function to change it. **Call this; never assign to `theme` directly.**
- When you call `setTheme`, React re-runs the component with the new value and updates the screen.

Lazy initializer form `useState(() => ...)` runs the initializer only once (good for expensive work or reading `localStorage`).

### 🧱 Event handlers

`onClick={toggleTheme}` runs `toggleTheme` when the user clicks. Note: we pass the *function itself*, not the result of calling it — so `onClick={toggleTheme}`, **not** `onClick={toggleTheme()}`. (The latter would run immediately on render, which is wrong.)

### 🧱 Building a Context provider

The full loop has three parts:
1. **Create** the channel: `const Ctx = createContext()`.
2. **Provide** a value: `<Ctx.Provider value={...}>...children...</Ctx.Provider>`.
3. **Consume** it: `const value = useContext(Ctx)` (usually wrapped in a `use...()` hook).

Any consumer must sit **inside** the provider in the component tree. We'll see where all the providers get nested in [lesson 06](./06-how-it-all-fits.md).

### 🧱 `useEffect`

`useEffect(() => { ... }, [deps])` runs your code *after* React paints the screen. It's for **side-effects** — things that reach outside the component (writing to `localStorage`, changing the DOM, fetching data).

- `[]` — run once, on mount.
- `[theme]` — run on mount **and** whenever `theme` changes.
- No array — run after *every* render (rarely what you want).

### 🧱 `localStorage`

A tiny key/value store in the browser:
```js
localStorage.setItem('tafsir-theme', 'dark')   // save
localStorage.getItem('tafsir-theme')           // read → 'dark'
```
Values must be strings (so objects get `JSON.stringify`'d — see [lesson 04](./04-favorites.md)). Data persists across refreshes and restarts.

### 🧱 CSS custom properties (variables)

`--accent: #00897b;` defines a variable; `color: var(--accent);` uses it. Overriding the variable under a selector like `[data-theme="dark"]` changes it only in that context. This is the cleanest way to theme a whole app.

---

## Exercise

Change the **accent color** of the entire app. Open `web/src/index.css` and edit the `--accent` value in the `:root` block (line 30) — try `#e53935` (a red). Save and watch every accent element (badges, links, the focus ring) recolor at once.

**Stretch goal:** Add a fourth theme. Add a name to `THEMES` in `ThemeContext.jsx` (e.g. `'ocean'`), add a matching `[data-theme="ocean"]` block in `index.css` with its own colors, and add an icon/label in `ThemeToggle.jsx`. The button will now cycle through four themes.

## Checkpoint

You should now understand:

- ✅ `useState` — component memory, and the lazy initializer form.
- ✅ Event handlers via `onClick`.
- ✅ How to build a Context provider (create → provide → consume).
- ✅ `useEffect` for side-effects, and the dependency array.
- ✅ `localStorage` for persistence.
- ✅ CSS variables driving theming.

Next up: **[04 — Favorites](./04-favorites.md)** — more complex state (a `Set` per surah), immutable updates, and serialization.
