# Onboarding Guide — Tafsir Nabulsi Web App

A step-by-step learning path for developers who are **brand-new to programming and React**. We teach the JavaScript, web, and React concepts you need *as we go*, using this project's real code as the textbook.

---

## Who this is for

You are new to all of this. You may have never written a line of JavaScript, never built a web page, and never heard of React. That's fine. This guide assumes zero background and introduces every idea the moment you need it.

You'll be reading a real application — the Tafsir Nabulsi web app — so everything you learn is grounded in code that actually runs.

## How to use this guide

1. **Read the docs in order.** They are numbered `00` → `08`. Each one builds on the previous. Don't skip ahead — later lessons assume you understand the earlier ones.
2. **Keep the app open in a browser** while you read, so you can see each feature working as you learn about it.
3. **Do every exercise.** Each doc ends with a small task in the real codebase. Reading teaches you the shape of things; *editing* teaches you how they work.
4. **Check the checkpoint.** Each doc ends with "you should now understand …". If a point feels fuzzy, re-read that section before moving on.

## The learning path

| Step | Doc | Real feature | Concepts you'll learn | Real files you'll read |
|------|-----|-------------|------------------------|------------------------|
| 00 | [Big picture](./00-big-picture.md) | — (orientation) | what the project is, how a web app runs, what React/Vite/Tailwind are | repo overview, `main.jsx` |
| 01 | [The Surah List](./01-the-surah-list.md) | Home: 114 surahs | component, JSX, props, `.map()`, consuming context | `SurahList.jsx`, `Layout.jsx` |
| 02 | [Reading a Surah](./02-reading-a-surah.md) | Ayah list + tafsir | composition, conditional render, async + loading states, pure functions | `SurahView.jsx`, `AyahCard.jsx`, `tafsir.js` |
| 03 | [Themes](./03-themes.md) | Theme toggle | `useState`, events, building a Context provider, localStorage, CSS vars | `ThemeContext.jsx`, `ThemeToggle.jsx`, `index.css` |
| 04 | [Favorites](./04-favorites.md) | Save ayahs | structured state (Set/object), derived values, serialization | `FavoritesContext.jsx`, `AyahCard.jsx` |
| 05 | [Search](./05-search.md) | Search all ayahs | controlled inputs, `useEffect`, async/await, the search engine | `SearchContext.jsx`, `SearchBar.jsx`, `api/search.js` |
| 06 | [How it all fits](./06-how-it-all-fits.md) | Whole app | react-router, nested providers, ErrorBoundary | `App.jsx`, routing |
| 07 | [Pipeline & Backend](./07-pipeline-and-backend.md) | Where data comes from | data pipeline concept, Supabase schema (overview only) | `pipeline/`, `supabase/` |
| 08 | [Tests & First Change](./08-tests-and-first-change.md) | Quality + practice | automated tests, project conventions, your first change | `*.test.js`, conventions |

## Glossary

Quick definitions for terms used throughout this guide. Don't memorize these — come back here whenever a word feels unfamiliar.

- **Component** — A reusable piece of UI. In React it's a function that returns what should appear on screen.
- **JSX** — A syntax that lets you write HTML-like markup inside JavaScript. React components return JSX.
- **Props** — Data passed *into* a component from its parent (like function arguments).
- **State** — Data a component remembers and can change. When state changes, the UI updates. Managed with `useState`.
- **Hook** — A special React function starting with `use` (e.g. `useState`, `useEffect`) that gives a component abilities like memory or side-effects.
- **Context** — A way to share data across many components without passing props through every level. Has a **provider** (sender) and **consumer** (reader).
- **Async / await** — Syntax for code that takes time (like fetching data). `await` pauses until the result is ready.
- **Promise** — A value that will be available in the future (e.g. the result of a network request).
- **localStorage** — A small key/value store built into the browser. Data survives a page refresh.
- **Route** — A URL path (like `/surah/2`) mapped to a screen of the app.
- **Vite** — The build tool that serves and bundles the app during development.
- **Tailwind** — A CSS framework where you style elements with small utility classes (e.g. `text-center`, `py-4`).
- **Tafsir** — The interpretation/explanation of the Quran. In this app, Dr. Nabulsi's commentary on each ayah.
- **Surah** — A chapter of the Quran. There are 114.
- **Ayah** — A verse of the Quran. Each surah contains many ayahs.

## What this guide does NOT cover

- **No setup or installation steps.** This guide assumes the app is already running and focuses on understanding and changing the code.
- **Not a generic React course.** Every concept is taught through this project's real files — you won't find abstract examples disconnected from the app.
- **No deep Python or SQL.** Step 07 gives you just enough context to know where the data comes from; it does not teach Python or database queries.

---

Ready? Start with **[00 — Big Picture](./00-big-picture.md)**.
