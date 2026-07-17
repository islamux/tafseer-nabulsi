# 07 — Pipeline & Backend

You've spent six lessons entirely inside `web/`. But the app loads data from somewhere, and you may have wondered: *where do those JSON files come from?* This lesson answers that — at a **high level only**. You will **not** learn Python or SQL here. The goal is to understand the boundary: what lives in `web/` (your job) versus what lives outside it (someone else's job, for now).

---

## What you'll learn

- Where `web/public/data/*.json` comes from.
- What the **Python pipeline** does — at a glance, not in depth.
- What the **Supabase** schema is for, and that it's *not yet connected* to the web app.
- The all-important **boundary**: when a problem is a `web/` problem vs. a `pipeline/` problem.

**Prerequisite:** none. This lesson is conceptual — no code you'll edit.

## The feature (the data behind the app)

Every surah you browse, every ayah you read, every tafsir you expand — it all comes from JSON files sitting in `web/public/data/`. The web app simply loads those files. So the question is: **who builds those files?**

There are two sources outside `web/`:

| Source | What it provides | Is it connected to the web app? |
|--------|------------------|--------------------------------|
| `pipeline/` (Python) | The content JSON files (Quran text + tafsir) | **Yes** — its output is copied into `web/public/data/`. |
| `supabase/` (database) | Future user data (accounts, bookmarks, progress) | **No** — staged for future features. |

## Read the code (overview only)

### The data contract: `web/public/data/1.json`

First, look at what the web app actually consumes. Here's the shape (from `1.json`, Al-Fatiha):

```json
{
  "surah_id": 1,
  "name": "الفاتحة",
  "ayahs": [
    {
      "number": 1,
      "text": "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ",
      "tafsir_short": "تفسير الأيات 1-2 كيفية الحمد",
      "tafsir_long": "1985-09-06 بسـم اللـه الرحمـن الرحيـم الحمد لله..."
    }
  ]
}
```

This is **the contract**. Every file `1.json` … `114.json` follows this exact shape. The web app (`api/data.js`, `api/search.js`) depends on these field names: `surah_id`, `name`, `ayahs[].number`, `text`, `tafsir_short`, `tafsir_long`. Notice the **leading date** on `tafsir_long` (`1985-09-06`) — that's exactly what `parseTafsir()` from [lesson 02](./02-reading-a-surah.md) strips off.

> If a surah is missing a field, or the JSON is malformed, the fix is almost always in the **pipeline**, not in `web/`.

### The Python pipeline (`pipeline/`) — at a glance

`pipeline/` is a separate Python program whose only job is to **produce** those JSON files. It does not run inside the web app. From its README/architecture:

```
src/
├── main.py              ← CLI entry: builds all or one surah
├── config.py            ← URLs, constants, surah metadata
├── quran/               ← Quran text (from Tanzil.net)
├── tafsir/              ← Tafsir lessons (from nabulsi.com)
├── media/               ← Optional audio/video links
├── merge/               ← Combines everything into the final JSON
└── utils/               ← Caching, rate-limiting, logging
```

In plain English, it does three things:
1. **Fetches** the Quran text (from Tanzil.net) and Dr. Nabulsi's tafsir lessons (from nabulsi.com).
2. **Merges** them — pairing each ayah with its tafsir.
3. **Writes** one JSON file per surah (`output/1.json` … `output/114.json`) plus an `_index.json` (the surah list) and a `_report.json` (coverage stats).

Those output files are then **copied** into `web/public/data/` (the web app's `package.json` even has a `copy-data` script for this). That's how the pipeline's output becomes the web app's input.

You do **not** need to know Python for any of this. Just know: *the pipeline produces JSON; the web app consumes it.*

### The Supabase backend (`supabase/`) — staged for the future

`supabase/` defines a database schema for **user-specific** features that don't exist in the web app yet:

| Table | Purpose |
|-------|---------|
| `profiles` | A user profile (auto-created when they sign up) |
| `bookmarks` | Per-ayah bookmarks with optional notes |
| `reading_progress` | The last ayah a user read in each surah |

Two important facts:
1. **It's not connected to the web app yet.** Right now, favorites live in `localStorage` (lesson 04) — purely on your device. Supabase would let them sync across devices *in the future*.
2. **It uses Row Level Security (RLS):** each user can only ever read or write their *own* rows. This is enforced at the database level, so even a bug in the app can't leak another user's data.

You do **not** need to know SQL for any of this. Just know: *Supabase is the future home of user accounts and cross-device sync; it's defined but not wired in.*

---

## Concept boxes

### 🧱 What's a data pipeline?

A **pipeline** is a program that gathers raw data from various sources, transforms/cleans it, and writes output files — usually run on a schedule or on demand, separately from the app that consumes the output. Here: scrape → merge → JSON. The web app never runs the pipeline; it just reads the pipeline's results.

### 🧱 Why separate the pipeline from the web app?

- **Different languages/tools:** Python is great for scraping; React is great for UI.
- **Different run frequencies:** the pipeline runs occasionally (to refresh data); the app runs constantly (every user session).
- **Clean boundary:** the JSON file is a stable contract between them. Either side can change its internals without breaking the other, as long as the JSON shape stays the same.

### 🧱 Where the line is (the key takeaway)

When something's wrong, ask yourself **where the problem lives**:

| Symptom | Likely location |
|---------|----------------|
| An ayah's text looks wrong or tafsir is missing | `pipeline/` (bad source data or a parsing bug) |
| A field name the app expects is absent from the JSON | `pipeline/` (the contract) |
| The page doesn't load / a button doesn't work | `web/` (your code) |
| A search returns weird results | `web/` (the search engine in `api/search.js`) |
| Favorites don't persist | `web/` (`FavoritesContext`, `localStorage`) |

Knowing this boundary saves you from debugging the wrong codebase for hours.

---

## Exercise

Open `web/public/data/1.json` (it's one long line — that's normal for JSON). Find the `tafsir_long` field for ayah 1 and look at its very start: it begins with a date like `1985-09-06`. Now recall `parseTafsir()` from [lesson 02](./02-reading-a-surah.md) — it uses a regex `/^(\d{4})-\d{2}-\d{2}\s*/` to split that date off into a `year` and the rest into a `body`.

Confirm by eye: the date is there in the raw data, and the web app strips it for display. **This is the contract in action** — the pipeline emits the date, and the web app knows how to handle it.

## Checkpoint

You should now understand:

- ✅ The web app reads ready-made JSON files from `web/public/data/`.
- ✅ Those files are produced by the Python `pipeline/` (fetch → merge → write).
- ✅ Supabase defines future user-data tables, but isn't connected to the web app yet.
- ✅ The boundary: content problems are pipeline problems; UI/behavior problems are `web/` problems.

Final lesson: **[08 — Tests & First Change](./08-tests-and-first-change.md)** — how we keep the app correct, the project's conventions, and a capstone exercise.
