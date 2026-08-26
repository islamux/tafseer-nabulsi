# 08 — Tests & Your First Change

Last lesson. You now understand the whole app. This one covers two things that keep the app healthy as it grows: **automated tests** and **project conventions**. Then you'll do a small change that touches multiple layers — a graduation exercise.

---

## What you'll learn

- What an **automated test** is and why it matters.
- Reading a **vitest** test (`describe` / `it` / `expect`).
- The project's **conventions** (file naming, structure, clean-code habits).
- A **capstone exercise** combining a utility, a test, and a component.

**Prerequisite JavaScript:** none new.

## The feature (keeping quality)

As the app grows, it's easy to accidentally break something without noticing — change the search engine and silently break favorites, for example. **Tests** are tiny programs that check the real code and fail loudly if it misbehaves. This project has 16 of them across 5 files. They're how we change things with confidence.

## Read the code

### The simplest test: `web/src/utils/tafsir.test.js`

```jsx
import { describe, it, expect } from 'vitest'
import { parseTafsir } from './tafsir'

describe('parseTafsir', () => {
  it('extracts year and body from date-prefixed tafsir', () => {
    const input = '1985-09-06 الحمد لله رب العالمين'
    const { year, body } = parseTafsir(input)
    expect(year).toBe('1985')
    expect(body).toBe('الحمد لله رب العالمين')
  })

  it('returns null year when no date prefix', () => {
    const input = 'الحمد لله رب العالمين'
    const { year, body } = parseTafsir(input)
    expect(year).toBeNull()
    expect(body).toBe(input)
  })
})
```

Read it like plain English:
- `describe('parseTafsir', ...)` — "I'm testing the `parseTafsir` function."
- `it('extracts year and body...', ...)` — "it should do *this specific thing*."
- `expect(year).toBe('1985')` — "I expect `year` to equal `'1985'`." If it doesn't, the test fails.

That's the whole shape: **give input → call the function → check the output**. A test file sits right next to the code it tests (`tafsir.test.js` beside `tafsir.js`) and shares its name.

### A few more examples

- **`web/src/utils/arabic.test.js`** — tests `toArabicNum` (converts `5` → `٥`). Note the test for *strings with embedded digits* (`'سورة 2 الآية 14'` → `'سورة ٢ الآية ١٤'`) and one for *no digits* (passes through unchanged). Good tests cover the edge cases, not just the happy path.
- **`web/src/api/search.test.js`** — tests `searchLocal`. It builds a tiny fake index (`mockIndex`) right in the file, then checks matching each field and the 50-result cap. Testing with a small fake dataset (a "mock") keeps the test fast and independent of real data files.
- **`web/src/contexts/FavoritesContext.test.js`** & **`ThemeContext.test.js`** — test the contexts' behavior (Set↔array serialization, the light→dark→sepia cycle).

### Running the tests

The test command is in `web/package.json` under the `test` script:

```bash
npm test
```

(This is a *run-the-tests* instruction, not an app setup step.) It runs **vitest**, which finds every `*.test.js` file and runs all the `it()` blocks, reporting green ✓ or red ✗ for each.

---

## Concept boxes

### 🧱 What's a test?

A **test** is a function that runs a piece of your real code with known input and checks the output matches expectations. If you later change the code and break it, the test fails — so the bug is caught immediately, not by a user. Tests are a safety net that lets you refactor fearlessly.

### 🧱 vitest basics

This project uses **vitest**. Three keywords:
- `describe(name, fn)` — groups related tests (optional but tidy).
- `it(name, fn)` / `test(...)` — one test case with a human-readable name.
- `expect(value).toEqual(expected)` — the assertion. Variants: `.toBe(x)` (exact), `.toBeNull()`, `.toHaveLength(n)`.

### 🧱 Mocks

Some code is hard or slow to test for real (loading real data, talking to a browser). A **mock** is a small fake stand-in. In `search.test.js`, a hand-written `mockIndex` stands in for the real 6000-ayah dataset. This keeps the test fast, focused, and reliable.

### 🧱 Project conventions

Follow these so your code matches the rest of the codebase:

| Convention | Example |
|------------|---------|
| **Components** are PascalCase `.jsx` | `AyahCard.jsx`, `SurahList.jsx` |
| **Contexts/hooks/utils/api** are camelCase `.js` | `useTheme`, `parseTafsir`, `searchLocal` |
| **Tests** sit next to the file, named `*.test.js` | `tafsir.test.js` beside `tafsir.js` |
| **Pure logic** lives in `utils/` or `api/`, not components | `parseTafsir`, `searchLocal` |
| **Shared UI helpers** are extracted into components | `<Spinner />`, `<StateMessage />` |

And the four clean-code habits summarized in `docs/clean-code-summary.md`:
- **DRY** — Don't Repeat Yourself (extract duplication into a function/component).
- **KISS** — Keep It Simple (no clever code when simple works).
- **YAGNI** — You Aren't Gonna Need It (don't build features nobody asked for).
- **SRP** (from SOLID) — Single Responsibility (one file = one job; that's why `DataContext` and `SearchContext` are separate).

---

## Exercise (capstone)

Write a tiny new utility **and** its test **and** use it in a component — touching all three layers. We'll add a `pluralizeAyahs(n)` helper that returns an Arabic label for an ayah count.

**Step 1 — Create the utility** at `web/src/utils/pluralize.js`:
```jsx
export function pluralizeAyahs(n) {
  if (n == null) return ''
  return `${n} آية`
}
```

**Step 2 — Create the test** at `web/src/utils/pluralize.test.js`:
```jsx
import { describe, it, expect } from 'vitest'
import { pluralizeAyahs } from './pluralize'

describe('pluralizeAyahs', () => {
  it('returns a labeled count', () => {
    expect(pluralizeAyahs(7)).toBe('7 آية')
  })
  it('returns empty string for null', () => {
    expect(pluralizeAyahs(null)).toBe('')
  })
})
```

**Step 3 — Run the tests** (`npm test` in `web/`) and confirm your two new tests pass.

**Step 4 — Use it.** In `web/src/components/SurahView.jsx`, import it and replace the existing ayah-count line with `{pluralizeAyahs(surah?.ayahs?.length ?? surahMeta?.ayah_count)}`. Open a surah and confirm the count still shows.

You've now written a utility, tested it, and wired it into the UI — the full stack of layers you've learned across this guide. 🎉

## Checkpoint

You should now understand:

- ✅ What automated tests are and why they matter.
- ✅ How to read a vitest test (`describe`/`it`/`expect`).
- ✅ The project's naming and structure conventions.
- ✅ The DRY/KISS/YAGNI/SRP habits.
- ✅ How to add a utility + test + wire it into a component.

---

## You've finished the onboarding guide 🎓

You went from "brand-new to everything" to reading, understanding, and editing a real React application. Quick recap of the ground you covered:

- **00** — The big picture: SPA, React/Vite/Tailwind, the entry point.
- **01** — Components, JSX, props, `.map()`, consuming context.
- **02** — Composition, conditional rendering, async loading, pure functions.
- **03** — `useState`, events, building a Context provider, `useEffect`, localStorage, CSS vars.
- **04** — Structured state, immutable updates, derived values, serialization.
- **05** — Controlled inputs, `async`/`await`, building a search index, the `api/` layer.
- **06** — Routing, nested providers, `ErrorBoundary`, the full component tree.
- **07** — Where data comes from (pipeline) and where it's going (Supabase).
- **08** — Tests and conventions.

Where to go next? Re-read any lesson that felt fuzzy, explore a file we didn't cover (`StateMessage.jsx`, `Spinner.jsx`, the remaining tests), or pick a small feature from `docs/todo.md` and try to build it. You have the map now — happy coding.
