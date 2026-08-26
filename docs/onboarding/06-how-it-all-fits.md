# 06 — How It All Fits

You've now met every piece: components, state, context, async, the `api/` layer. This lesson zooms out and shows how those pieces are **wired together** in `App.jsx` — the file that ties the whole app into one running program. You previewed it in lesson 00; now you can understand every line.

---

## What you'll learn

- **Routing** with `react-router-dom` — URLs mapping to screens.
- **Nested Context providers** — and why their *order* matters.
- **`ErrorBoundary`** — a `try/catch` for the whole UI.
- The **component tree** from root to leaf, all in one diagram.

**Prerequisite JavaScript:** none new.

## The feature

This isn't a single feature — it's the skeleton that holds every feature together. By the end of this lesson, you'll be able to look at the app and say "I know how every screen connects."

## Read the code

### `web/src/App.jsx` — the whole app

Open it. Here it is in full:

```jsx
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <FavoritesProvider>
          <DataProvider>
            <SearchProvider>
              <BrowserRouter>
                <Layout>
                  <Routes>
                    <Route path="/" element={<SurahList />} />
                    <Route path="/surah/:id" element={<SurahView />} />
                    <Route path="/search" element={<SearchBar />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </BrowserRouter>
            </SearchProvider>
          </DataProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
```

You can read this from the **outside in**:

**1. The outermost layer — `<ErrorBoundary>`** wraps everything. If *any* screen crashes during render, the boundary catches it and shows a friendly error instead of a blank white page. (More below.)

**2. The four providers — nested like Russian dolls:**
```
ThemeProvider > FavoritesProvider > DataProvider > SearchProvider
```
Each one sets up a Context so its data is available to everything inside it. `ThemeProvider` must wrap the app so `useTheme()` works in the header; `DataProvider` must wrap `SurahView` so `useData()` works; and so on.

**3. `<BrowserRouter>`** turns on routing — it's what makes the URL bar drive the app.

**4. `<Layout>`** is the chrome that's always visible (header + main area). Notice it receives `{children}` — that's how the current screen gets placed inside the layout.

**5. `<Routes>` + `<Route>`** — the routing table itself:
| URL | Component | What it shows |
|-----|-----------|---------------|
| `/` | `<SurahList />` | Home — the 114 surahs |
| `/surah/:id` | `<SurahView />` | One surah (`:id` → `useParams()`, lesson 02) |
| `/search` | `<SearchBar />` | Search page |
| `*` | `<NotFound />` | Fallback for any other URL |

### `web/src/components/Layout.jsx` — the always-on chrome

```jsx
export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 ...">
        <NavLink to="/">تفسير النابلسي</NavLink>
        <NavLink to="/search">🔍 بحث</NavLink>
        <ThemeToggle />
      </header>
      <main className="...">{children}</main>
    </div>
  )
}
```
The header (app name + search link + theme toggle) is on every page. `{children}` is whichever screen the router picked. Notice `<NavLink>` (not `<Link>`) — it can style itself differently when it's the *active* route, via the `isActive` callback on line 20–22.

### `web/src/components/ErrorBoundary.jsx` — a safety net

```jsx
export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) { return <StateMessage emoji="⚠️" ...>...</StateMessage> }
    return this.props.children
  }
}
```
This is the **only** `class` component in the app — and the reason is technical: error boundaries *must* be class components (React's hooks can't catch render errors yet). `getDerivedStateFromError` flips `hasError` to `true` when a child crashes; then `render` shows a fallback UI instead of the broken tree. It's like a `try/catch` that wraps your whole interface.

### `web/src/components/NotFound.jsx` — the fallback route

A tiny component shown when the URL matches nothing else (the `path="*"` route). It reuses `<StateMessage>` (the shared not-found/error template) — a good example of DRY: one component, three uses (not-found, error, boundary).

---

## The big picture: the full tree

```
main.jsx
  └─ <App />
       └─ <ErrorBoundary>            ← catches any render crash
            └─ <ThemeProvider>       ← provides theme + toggleTheme
                 └─ <FavoritesProvider>  ← provides favorites API
                      └─ <DataProvider>   ← provides index + fetchSurah
                           └─ <SearchProvider>  ← provides search()
                                └─ <BrowserRouter>  ← enables URL routing
                                     └─ <Layout>   ← header + <main>
                                          └─ <Routes>
                                               ├─ "/"        → <SurahList>
                                               ├─ "/surah/:id" → <SurahView>
                                               │                  └─ <AyahCard> ×N
                                               ├─ "/search"    → <SearchBar>
                                               └─ "*"          → <NotFound>
```

Read this tree top-down: data flows **down** (providers give to consumers), and the router swaps the bottom screen based on the URL. Hold this picture in your head and the whole app makes sense.

---

## Concept boxes

### 🧱 Routing

A **router** connects URLs to components without full page reloads:
- `<BrowserRouter>` — turns routing on.
- `<Routes>` — a container that picks exactly one match.
- `<Route path="/surah/:id" element={<SurahView />} />` — "when the URL is `/surah/2`, render `SurahView`."
- `:id` is a **URL parameter**, read inside the component with `useParams()` (lesson 02).
- `<Link to="...">` / `<NavLink to="...">` — navigate without reloading.

### 🧱 Nested providers and why order matters

Providers work like nesting dolls: a consumer must sit **inside** its provider. The order here isn't random — each provider may depend on another:
- `SearchProvider` calls `search()`, which loads surahs via `loadAllSurahs` — that data layer doesn't *need* `DataProvider` (it uses the `api/` module directly), but conceptually data-related providers cluster together.
- `ThemeProvider` is outermost because *every* screen (including error fallbacks) needs a theme.

The one rule to remember: **a `use...()` hook must be called inside its matching `<...Provider>`.** Get the nesting wrong and you'll see `"useX must be used within XProvider"` errors (the guard we saw in every context).

### 🧱 `ErrorBoundary`

A special class component that catches errors thrown during rendering of its children. Without it, one bug crashes the entire app to a white screen. With it, only the broken part is replaced by a fallback. Wrap risky trees (or the whole app) in a boundary.

### 🧱 Class components vs function components

Everything else in this app is a **function component** with hooks. `ErrorBoundary` is a **class component** because error boundaries are the one feature hooks can't replace (yet). You'll rarely write class components; just recognize the pattern when you see it.

---

## Exercise

Add a new **`/about`** route. Three steps:

1. **Create** `web/src/components/About.jsx`:
   ```jsx
   export default function About() {
     return (
       <div className="text-center py-20">
         <h1 className="text-2xl font-bold arabic-text text-primary">عن التطبيق</h1>
         <p className="mt-4 arabic-text text-secondary">تفسير النابلسي — تطبيق لقراءة القرآن وتفسيره.</p>
       </div>
     )
   }
   ```
2. **Register it** in `App.jsx`: import `About`, and add `<Route path="/about" element={<About />} />` inside `<Routes>`.
3. **Link to it**: add `<NavLink to="/about">عن التطبيق</NavLink>` in `Layout.jsx`'s header.

Visit `/about` in the browser — your new screen should appear inside the same layout. You've just added a whole new page to the app.

## Checkpoint

You should now understand:

- ✅ How `App.jsx` wires providers, router, and layout together.
- ✅ Routing: `Routes`/`Route`, URL params, `Link`/`NavLink`.
- ✅ Why providers are nested and the one rule about consumer placement.
- ✅ What `ErrorBoundary` does and why it's a class component.
- ✅ The full component tree, root to leaf.

Next up: **[07 — Pipeline & Backend](./07-pipeline-and-backend.md)** — where the app's data actually comes from.
