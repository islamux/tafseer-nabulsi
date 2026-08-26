# 00 — Big Picture

Welcome. Before we touch any code, let's understand what this project *is* and how a web app actually works. This lesson has almost no code on purpose — it's the map for everything that follows.

---

## What you'll learn

- What the Tafsir Nabulsi project is and what it does.
- The three parts of the project and how they fit together.
- How a web app runs inside a browser.
- What React, Vite, and Tailwind are (one line each).
- Where the app *starts* — the entry point file.

No prerequisite knowledge needed. This is the starting line.

## The feature (the app itself)

**Tafsir Nabulsi** is a web app for reading the Quran together with Dr. Nabulsi's *tafsir* (interpretation). Open it in a browser and you can:

- **Browse** all 114 surahs (chapters) of the Quran.
- **Read** each surah's ayahs (verses) with the tafsir explanation underneath.
- **Search** across every ayah and every tafsir.
- **Favorite** ayahs to find them again later.
- **Switch themes** between Light, Dark, and Sepia.

Everything you'll learn in this guide comes from the code that powers those five things.

## The three parts of the project

The repository has three folders. For now, you only need to know what each one *does* — you'll spend almost all your time in just one of them.

```
tafseer-nabulsi/
├── pipeline/    ← Makes the data (Python)
├── supabase/    ← Future user data (database, not connected yet)
└── web/         ← The app itself (React)  ← you'll work here
```

| Folder | What it does | Will you edit it? |
|--------|-------------|-------------------|
| `pipeline/` | A set of Python scripts that gather the Quran text and the tafsir, then write them out as JSON data files. | Rarely. (See [lesson 07](./07-pipeline-and-backend.md).) |
| `supabase/` | Defines database tables for future features like user accounts and cross-device favorites. **Not connected to the web app yet.** | No, for now. |
| `web/` | The React application — everything the user sees and clicks. | **Yes — this is your home.** |

The key idea: the `web/` app loads ready-made JSON files produced by `pipeline/`. The web app has no database of its own. If a piece of content is missing, the fix is usually in the pipeline, not in `web/`. We'll come back to this in [lesson 07](./07-pipeline-and-backend.md).

## How a web app runs in a browser

If you've only ever *used* websites, here's the one fact that changes how you think about building them:

> **A web page is just a text file the browser reads, then a program (JavaScript) takes over and draws the page.**

In old-school websites, every click asks the server for a brand-new HTML file. This app is different — it's a **Single-Page Application (SPA)**:

1. The browser loads **one** HTML file (`index.html`) — almost empty.
2. That file loads a JavaScript program.
3. The JavaScript draws the entire user interface and keeps running.
4. When you click around, JavaScript swaps the content — **no full page reload**.

This is why the app feels fast and smooth: once it's loaded, it's really just one program deciding what to draw.

## What React, Vite, and Tailwind are

You'll see these three names constantly. One line each:

- **React** — A library for building user interfaces out of small, reusable pieces called **components**. A component is just a function that returns "what should appear on screen."
- **Vite** — The tool that serves the app while you develop it and bundles it for release. You can think of Vite as the engine that runs the project.
- **Tailwind** — A way of styling things by adding tiny CSS classes directly to elements, like `text-center` or `py-4`. You'll see these class names everywhere in the code.

You don't need to know more than that right now. We'll use each one hands-on in later lessons.

## Read the code: where the app starts

Every program has an entry point — the first file that runs. For this app, it's `web/src/main.jsx`. Let's look at it. It's short:

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

Here's what's happening, in plain English:

- **Line 1–4 (imports):** Bring in React, ReactDOM (the part of React that draws to a web page), our main `App` component, and the stylesheet.
- **Line 6 (`createRoot(...)`):** Find the empty `<div id="root">` in `index.html` and turn it into the place where React will draw everything.
- **Line 6–8 (`.render(<App />)`):** Draw our `App` component inside that root.

That's it. `main.jsx` doesn't contain any screens or buttons — it just says "start the app by drawing `<App />`." Everything you actually *see* lives inside that `App` component, which we'll explore in [lesson 06](./06-how-it-all-fits.md).

> **Don't worry** if `import`, `<React.StrictMode>`, or `.render` feel mysterious. The only thing to take away here is: **the app starts at `main.jsx`, which draws `<App />`.** We'll unpack `App` piece by piece across the next lessons.

## Exercise

Find the file `web/index.html` and locate the `<div id="root">`. 

Why does the app need that empty div? (Think about what `createRoot(document.getElementById('root'))` is looking for.)

<details>
<summary>Reveal the answer</summary>

React needs an empty "canvas" in the HTML to draw into. `createRoot(document.getElementById('root'))` grabs that `<div id="root">` and says "this is where my whole app will live." Without it, React would have nowhere to draw. Everything you see on screen gets inserted *inside* that one div.
</details>

## Checkpoint

You should now understand:

- ✅ What the Tafsir Nabulsi app does (browse, read, search, favorite, theme).
- ✅ The three project parts and that you'll work in `web/`.
- ✅ What a Single-Page Application is and how the browser runs it.
- ✅ What React, Vite, and Tailwind each are.
- ✅ Where the app starts: `main.jsx` draws `<App />`.

Next up: **[01 — The Surah List](./01-the-surah-list.md)**, where you'll read your first real component and learn JSX, props, and rendering a list.
