# All-Cloudflare Migration — Status & Resume Guide

**Last updated:** 2026-07-21
**Goal:** Replace Supabase (auth + Postgres) with Cloudflare Workers + D1. No login, no email, no idle pause.

---

## Architecture (target)

```
Browser ──→ Cloudflare Worker ──→ D1 (SQLite)
               tafsir-api            tafseer-nabulsi
               (bookmarks +          (device_id keyed,
                reading progress)     no auth, no PII)

Browser ──→ Cloudflare R2 (static tafsir JSON, unchanged)

Device ID in localStorage (crypto.randomUUID()) — no signup needed
```

**One-line rule:** R2 stores what every reader downloads. Worker+D1 stores what belongs to one device.

---

## Progress tracker

| Step | Status | Notes |
|---|---|---|
| 1. Worker files | ✅ DONE | `workers/tafsir-api/{wrangler.jsonc, src/schema.sql, src/index.js}` |
| 2. `web/src/api/worker.js` | ✅ DONE | device ID + 6 fetch wrappers, all no-op when `VITE_API_BASE` unset |
| 3. `FavoritesContext` upgrade | ✅ DONE | Worker sync on mount, localStorage fallback, fire-and-forget toggle |
| 4. Reading progress | 🔄 90% | DataContext ✅, SurahView ✅, SurahList has **unused `hasStarted` helper** (lines 8-10) |
| 5. Docs (.env.example, AGENTS.md) | ⏳ TODO | See "Remaining work" below |
| 6. Final verification | ⏳ TODO | `pnpm test` (must stay 33/33) + `pnpm build` |

---

## What's already in the codebase

### `workers/tafsir-api/` (new directory)

- **`wrangler.jsonc`** — Worker config, D1 binding `DB`, `database_id: ""` (fill after `wrangler d1 create`)
- **`src/schema.sql`** — `bookmarks` (device_id, surah_id, ayah_number, UNIQUE) + `reading_progress` (composite PK)
- **`src/index.js`** — request router with CORS for `islamux.github.io` + `localhost:5173/4173`, 5 endpoints, validation, try/catch

### `web/src/api/worker.js` (new file)

Exports: `getDeviceId()`, `fetchBookmarks()`, `addBookmark()`, `removeBookmark()`, `fetchProgress()`, `saveProgress()`. All return `null`/no-op when `VITE_API_BASE` is unset → app stays 100% functional without the Worker deployed.

### `web/src/contexts/FavoritesContext.jsx` (modified)

- On mount: `getDeviceId()` → if present, `fetchBookmarks()` and overwrite state from remote
- Falls back to `localStorage` when Worker unreachable or `VITE_API_BASE` unset
- `toggleFavorite`: optimistic local update + fire-and-forget Worker call + localStorage write-through
- Interface unchanged: `{ toggleFavorite, isFavorite }` — no caller changes needed

### `web/src/contexts/DataContext.jsx` (modified)

- New state: `readingProgress` (object: `{ [surahId]: lastAyahNumber }`)
- New effect: on mount, `fetchProgress()` from Worker → populate state
- New function: `saveReadingProgress(surahId, ayahNumber)` — updates state + fires `saveProgress()` to Worker
- Provider value now includes `readingProgress` and `saveReadingProgress`

### `web/src/components/SurahView.jsx` (modified)

- Destructures `saveReadingProgress` from `useData()`
- Calls `saveReadingProgress(surahId, 1)` inside the `fetchSurah().then()` handler
- ⚠️ Note: `saveReadingProgress` is NOT in the `useEffect` deps array. It's stable (wrapped in `useCallback([])` in DataContext) so this is safe, but a future lint pass may flag it.

### `web/src/components/SurahList.jsx` (partially modified)

- Line 8: destructures `readingProgress` from `useData()`
- Line 10: defines `hasStarted = (id) => readingProgress[id] != null`
- ⚠️ **`hasStarted` is currently DEAD CODE** — defined but never used in JSX. Must either wire it into the surah row UI or delete it.

---

## Remaining work (resume here)

### Step 4 finish — choose ONE

**Option A (recommended): Add "متابعة" badge in SurahList**

In `web/src/components/SurahList.jsx`, around line 76-80, add a badge next to the existing "تفسير" badge:

```jsx
<div className="flex items-center gap-1">
  {hasStarted(surah.surah_id) && (
    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--hover-bg)', color: 'var(--accent)' }}>
      متابعة
    </span>
  )}
  {surah.has_tafsir && (
    <span className="text-xs px-2 py-1 rounded-full badge-accent">
      تفسير
    </span>
  )}
</div>
```

**Option B (minimal): Remove dead code**

Delete lines 8 (the `readingProgress` destructure) and 10 (`hasStarted`). Ship invisible sync.

### Step 5 — Documentation

#### `web/.env.example` — append:

```bash
# Cloudflare Worker URL for bookmarks + reading progress sync.
# - UNSET (default): app works in localStorage-only mode (no cross-device sync).
# - LOCAL DEV:    VITE_API_BASE=http://localhost:8787/api  (run `wrangler dev` in workers/tafsir-api/)
# - PRODUCTION:   VITE_API_BASE=https://tafsir-api.<your-subdomain>.workers.dev/api
VITE_API_BASE=
```

#### `AGENTS.md` — add new subsection under "## Deployment":

```markdown
### Worker (D1 bookmarks + reading progress API)

Located in `workers/tafsir-api/`. Optional — the web app works without it (localStorage fallback).

**One-time setup:**
```bash
cd workers/tafsir-api
npx wrangler login
npx wrangler d1 create tafseer-nabulsi
# Copy the database_id from output into wrangler.jsonc
npx wrangler d1 execute tafseer-nabulsi --file=src/schema.sql
```

**Deploy Worker:**
```bash
cd workers/tafsir-api && npx wrangler deploy
```

**Build web app with Worker URL:**
```bash
VITE_API_BASE=https://tafsir-api.<subdomain>.workers.dev/api pnpm build
```
```

### Step 6 — Verification

```bash
cd web
pnpm test          # must stay 33/33
pnpm build         # must succeed
```

Manual smoke test (optional but recommended):
```bash
# Terminal 1
cd workers/tafsir-api && npx wrangler dev
# Terminal 2
cd web && VITE_API_BASE=http://localhost:8787/api pnpm dev
```
Open browser, toggle a bookmark, reload page → bookmark should persist via Worker.

---

## Deployment flow (after all steps done)

```bash
# 1. Deploy Worker (first time + any time workers/ changes)
cd workers/tafsir-api
npx wrangler d1 create tafseer-nabulsi                              # first time only
npx wrangler d1 execute tafseer-nabulsi --file=src/schema.sql       # first time only
# Edit wrangler.jsonc → fill in database_id from create output
npx wrangler deploy

# 2. Build web app with all env vars
cd ../../web
VITE_DATA_BASE=https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data \
VITE_API_BASE=https://tafsir-api.<subdomain>.workers.dev/api \
pnpm build

# 3. Deploy to GitHub Pages (existing flow, unchanged)
# See docs/how-to-deploy-to-github-pages.md
```

---

## Key design decisions (locked in)

| Decision | Choice | Rationale |
|---|---|---|
| Auth model | **Device ID** (no email/password) | Bookmarks aren't sensitive; minimal config; zero PII |
| Worker URL config | **`VITE_API_BASE` env var** | Matches existing Vite pattern for `VITE_DATA_BASE` |
| Offline behavior | **localStorage fallback** | App stays 100% functional without Worker deployed |
| Sync strategy | **Worker is source of truth when reachable** | localStorage acts as write-through cache |
| Data loss risk | **If user clears localStorage, device ID is lost → server data orphaned** | Same as current app; acceptable for non-sensitive data |

---

## Files touched (summary)

| File | Action |
|---|---|
| `workers/tafsir-api/wrangler.jsonc` | new |
| `workers/tafsir-api/src/schema.sql` | new |
| `workers/tafsir-api/src/index.js` | new |
| `web/src/api/worker.js` | new |
| `web/src/contexts/FavoritesContext.jsx` | modified |
| `web/src/contexts/DataContext.jsx` | modified |
| `web/src/components/SurahView.jsx` | modified |
| `web/src/components/SurahList.jsx` | modified (needs Step 4 finish) |
| `web/.env.example` | TODO (Step 5) |
| `AGENTS.md` | TODO (Step 5) |
| `supabase/` | unchanged (historical; can delete later) |
| `docs/cloudflare-supabase-guide.md` | unchanged (historical record) |

**No new npm dependencies.** Worker uses only Cloudflare runtime. Web app uses only `fetch()`.

---

## Worker API reference (for resume context)

| Method | Path | Body/Query | Response |
|---|---|---|---|
| GET | `/api/bookmarks` | `?device_id=xxx` | `{ bookmarks: [{surah_id, ayah_number, created_at}] }` |
| POST | `/api/bookmarks` | `{ device_id, surah_id, ayah_number }` | `{ ok: true }` (201) |
| DELETE | `/api/bookmarks` | `{ device_id, surah_id, ayah_number }` | `{ ok: true }` |
| GET | `/api/progress` | `?device_id=xxx` | `{ progress: [{surah_id, last_ayah_number, updated_at}] }` |
| PUT | `/api/progress` | `{ device_id, surah_id, last_ayah_number }` | `{ ok: true }` |

CORS allows: `https://islamux.github.io`, `http://localhost:5173`, `http://localhost:4173`.
