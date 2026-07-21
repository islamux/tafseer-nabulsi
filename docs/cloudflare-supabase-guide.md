# Cloudflare + Supabase Guide (Free Tier)

A decision guide and hands-on setup walkthrough for this project. Covers **when to use Cloudflare vs Supabase vs both**, the free-tier limits that actually matter, and a step-by-step wiring of Supabase auth + bookmark sync into the web app.

---

## 1. TL;DR — Use both, they don't overlap

| Need | Right tool | Why |
|---|---|---|
| Big **immutable content** (surah JSON, ~388MB) | **Cloudflare R2** | Object storage, **zero egress fees**, huge free tier |
| **Auth** + **user-scoped relational data** (bookmarks, notes, reading progress) | **Supabase** | Postgres + Row Level Security + Auth, purpose-built |

Don't pick one. Putting 388MB of JSON into Supabase Storage burns your 1GB free quota and your 5GB monthly bandwidth. Putting per-user bookmarks into R2 means hand-rolling queries, auth, and consistency over flat objects. The two services cover different layers of the stack.

**One-line rule:** *R2 stores what every reader downloads. Supabase stores what belongs to one reader.*

---

## 2. Why this project uses both

Current architecture (see `AGENTS.md`):

- **Static SPA** — React 19 + Vite + Tailwind, deployed to GitHub Pages (`gh-pages` branch).
- **Content** — immutable JSON produced by the Python pipeline (`pipeline/output/*.json`), served from **Cloudflare R2** in production via `VITE_DATA_BASE`, or from `web/public/data/` in local dev via `pnpm copy-data`.
- **User state today** — only two `localStorage` keys: `tafsir-favorites` (favorites) and `tafsir-theme` (theme). No auth, no sync, no server-side state.
- **Staged Supabase schema** — `supabase/migrations/001-005` already define `profiles`, `bookmarks` (with `note`), `reading_progress`, RLS policies, and triggers. **Not wired into the web app yet.**

That gives us two clearly separated data domains:

| Domain | Shape | Lifetime | Concurrency | Right store |
|---|---|---|---|---|
| Quran text + tafsir | Large, immutable blobs | Forever | Read-only, many readers | **R2** |
| Favorites / notes / progress | Small relational rows | Per-user | Read + write, scoped | **Supabase** |

---

## 3. Free-tier comparison

| Service | Cloudflare free tier | Supabase free tier |
|---|---|---|
| Object storage | **R2: 10GB** + free egress | 1GB file storage |
| Bandwidth / egress | **Unlimited** | 5GB/month |
| Compute | Workers: 100K req/day; Cron Triggers: free | Edge Functions: 500K invocations/month |
| Database | D1 (SQLite): 5GB, 10M rows read/day | **Postgres: 500MB**, full SQL |
| Auth | (Cloudflare Access is enterprise-focused) | **50K monthly active users** |
| Idle behavior | Always on | **Pauses after 7 days of inactivity** |

### Projected usage for tafseer-nabulsi

| Resource | This app's expected footprint | % of free quota |
|---|---|---|
| R2 storage | ~388MB | 4% of 10GB |
| R2 reads (Class B) | ~10/s sustained peak | negligible vs 10M/month |
| Supabase DB size | A few KB per active user | <1% of 500MB for hundreds of users |
| Supabase MAU | Whatever your real user count is | comfortable until 50K |
| Supabase bandwidth | A few KB per session | <1% of 5GB |

**Bottom line:** for a personal / small-audience reading app, you will not come close to any free-tier ceiling. The only practical risk is the Supabase idle pause — see next.

---

## 4. The Supabase pause gotcha (and the free fix)

A free-tier Supabase project **pauses after 7 days with no DB/API activity**. While paused:

- Auth calls fail (users can't sign in).
- The first request after pause triggers a restore, which takes ~30s and may time out on the client.

For a low-traffic personal app this is the single most likely way to "break" the free setup.

### Fix: a Cloudflare Worker Cron Trigger pinging Supabase

Cron Triggers are free and run on Cloudflare's edge. One tiny Worker hitting a Supabase table every few hours keeps the project warm.

**`supabase-keepalive/src/index.js`**

```js
export default {
  async scheduled(_event, env, _ctx) {
    const url = `https://${env.SUPABASE_REF}.supabase.co/rest/v1/profiles?select=id&limit=1`
    const res = await fetch(url, {
      headers: {
        apikey: env.SUPABASE_ANON_KEY,
        Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
      },
    })
    console.log(`Supabase keepalive: ${res.status}`)
  },
  async fetch() {
    return new Response('ok')
  },
}
```

**`supabase-keepalive/wrangler.jsonc`**

```jsonc
{
  "name": "supabase-keepalive",
  "main": "src/index.js",
  "compatibility_date": "2024-11-01",
  "triggers": {
    "crons": ["0 */6 * * *"]
  }
}
```

Deploy + set secrets (run inside `supabase-keepalive/`):

```bash
npx wrangler secret put SUPABASE_REF        # e.g. abcdefghijklmnop
npx wrangler secret put SUPABASE_ANON_KEY   # your project's anon key
npx wrangler deploy
```

The cron runs every 6 hours — well inside the 7-day window. Cost: zero. (The same pattern works for any future free-tier Postgres that idles.)

---

## 5. Cloudflare R2 setup (recap — already done)

This is already wired up in production; included here for completeness. See `AGENTS.md` → "Data hosting (R2)" for the authoritative runbook.

1. Cloudflare dashboard → R2 → bucket `tafseer-nabulsi-data`.
2. Enable public access on the `*.r2.dev` subdomain; record the URL.
3. CORS: allow `https://islamux.github.io` and `http://localhost:5173`, methods `GET`/`HEAD`, headers `*`.
4. Create an R2 API token with Object Read & Write.
5. Upload the pipeline output:

   ```bash
   R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
       R2_BUCKET=tafseer-nabulsi-data uv run --with boto3 scripts/upload_to_r2.py
   ```

6. Verify: `curl -I https://pub-<hash>.r2.dev/data/1.json` → `200` + CORS headers.
7. Build with the data base URL set:

   ```bash
   VITE_DATA_BASE=https://pub-<hash>.r2.dev/data pnpm build
   ```

**Nothing more to do here** unless the pipeline regenerates data — then re-run step 5.

---

## 6. Supabase setup (hands-on)

The schema already exists in `supabase/migrations/`; you only need to apply it to a live project and enable auth.

### 6.1 Create the project

1. https://supabase.com → New project. Pick a region close to your audience.
2. Wait for provisioning, then open **Project Settings → API**.
3. Record:
   - **Project URL** (`https://<ref>.supabase.co`)
   - **anon public key** (safe to expose; protected by RLS)

### 6.2 Apply the migrations

Your migrations are already authored (`supabase/migrations/001-005`). Two ways to apply them:

**Option A — Supabase CLI (recommended):**

```bash
supabase link --project-ref <ref>
supabase db push
```

**Option B — Dashboard SQL editor:** open the Supabase SQL editor and paste, in order:

1. `supabase/migrations/001_profiles.sql`
2. `supabase/migrations/002_bookmarks.sql`
3. `supabase/migrations/003_reading_progress.sql`
4. `supabase/migrations/004_rls_policies.sql`
5. `supabase/migrations/005_helpers.sql`

Running `005_helpers.sql` installs the `on_auth_user_created` trigger, so new signups automatically get a row in `profiles`.

### 6.3 Configure Auth

In the dashboard → **Authentication → Providers**:

1. Enable **Email/Password** (simplest, free, fits this app).
2. **Authentication → URL configuration:**
   - **Site URL:** `https://islamux.github.io/tafseer-nabulsi/`
   - **Redirect URLs:** add both
     - `https://islamux.github.io/tafseer-nabulsi/`
     - `http://localhost:5173/`
3. (Optional) Enable Google or GitHub OAuth for one-click login — still free, still inside the 50K MAU quota.

### 6.4 Add env vars

Append to `web/.env` (or `.env.production`):

```bash
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

Keep `VITE_DATA_BASE` as-is — the R2 config is independent.

Update `web/.env.example` to document the two new keys.

---

## 7. Wiring Supabase into the web app

The goal: **preserve the current `FavoritesContext` interface** (`toggleFavorite`, `isFavorite`) so call sites don't change, while making favorites sync to Supabase when a user is signed in and fall back to `localStorage` when not.

### 7.1 Install the client

```bash
pnpm add @supabase/supabase-js
```

### 7.2 Singleton client — `web/src/api/supabase.js`

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null
```

The `null` fallback means the app keeps working if env vars aren't set (e.g. a fresh dev checkout).

### 7.3 Auth context — `web/src/contexts/AuthContext.jsx`

```js
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    signIn: (email, password) =>
      supabase.auth.signInWithPassword({ email, password }),
    signUp: (email, password) =>
      supabase.auth.signUp({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

### 7.4 Provider tree — `web/src/App.jsx`

Insert `AuthProvider` **above** `FavoritesProvider` so favorites can read auth state:

```
ErrorBoundary
  ThemeProvider
    AuthProvider          ← new
      FavoritesProvider   ← now reads useAuth()
        DataProvider
          SearchProvider
            BrowserRouter
```

### 7.5 Upgrade `FavoritesContext.jsx` (interface preserved)

The shape stays `{ [surahId]: Set<ayahNumber> }`. Two helpers do the sync:

```js
async function mergeLocalIntoRemote(localFavorites, userId) {
  const rows = []
  for (const [surahId, ayahSet] of Object.entries(localFavorites)) {
    for (const ayahNumber of ayahSet) {
      rows.push({ user_id: userId, surah_id: Number(surahId), ayah_number: ayahNumber })
    }
  }
  if (rows.length === 0) return
  await supabase
    .from('bookmarks')
    .upsert(rows, { onConflict: 'user_id,surah_id,ayah_number', ignoreDuplicates: true })
}

async function loadRemoteFavorites() {
  const { data, error } = await supabase.from('bookmarks').select('surah_id, ayah_number')
  if (error) return {}
  const result = {}
  for (const b of data) {
    const key = String(b.surah_id)
    if (!result[key]) result[key] = new Set()
    result[key].add(b.ayah_number)
  }
  return result
}
```

Inside the provider:

```jsx
export function FavoritesProvider({ children }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState(loadFavorites)

  // On sign-in: push local favorites up, then hydrate from remote.
  useEffect(() => {
    if (!user || !supabase) return
    const local = loadFavorites()
    mergeLocalIntoRemote(local, user.id).then(() =>
      loadRemoteFavorites().then(setFavorites)
    )
    localStorage.removeItem(STORAGE_KEY)
  }, [user?.id])

  // Anonymous: keep persisting to localStorage as before.
  useEffect(() => {
    if (user) return
    saveFavorites(favorites)
  }, [favorites, user])

  const toggleFavorite = useCallback((surahId, ayahNumber) => {
    const key = String(surahId)
    setFavorites(prev => {
      const current = prev[key] || new Set()
      const next = new Set(current)
      const nowHas = next.has(ayahNumber)
      if (nowHas) next.delete(ayahNumber)
      else next.add(ayahNumber)
      if (user && supabase) {
        if (nowHas) {
          supabase
            .from('bookmarks')
            .delete()
            .match({ user_id: user.id, surah_id: Number(key), ayah_number: ayahNumber })
        } else {
          supabase
            .from('bookmarks')
            .insert({ user_id: user.id, surah_id: Number(key), ayah_number: ayahNumber })
        }
      }
      return { ...prev, [key]: next }
    })
  }, [user])

  const isFavorite = useCallback((surahId, ayahNumber) => {
    const key = String(surahId)
    return favorites[key]?.has(ayahNumber) || false
  }, [favorites])

  return (
    <FavoritesContext.Provider value={{ toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}
```

**Why this shape:**

- **Merge-on-login, not wipe** — existing local favorites are pushed up via `ignoreDuplicates: true`; no user loses favorites by signing in for the first time. (Matches the strategy described in `docs/interview-questions.md` Q7.)
- **Anonymous-first** — with no `user` or no `supabase`, behavior is byte-identical to today: read/write `localStorage`. The app stays fully functional without auth.
- **RLS does the scoping** — `supabase/migrations/002_bookmarks.sql` already restricts every row to `auth.uid() = user_id`, so no app-side filtering is required.
- **No UI changes required** — `toggleFavorite` / `isFavorite` keep the same signature; only their internals change.

### 7.6 (Optional) minimal sign-in UI

Add a small `AuthButton` component anywhere in the tree (e.g. header) wired to `useAuth()`'s `signIn` / `signUp` / `signOut`. No router changes needed.

---

## 8. Reading progress (next step, not in initial wiring)

Your schema already supports this via `supabase/migrations/003_reading_progress.sql` (composite PK `(user_id, surah_id)`, column `last_ayah_number`, auto `updated_at` via the trigger in `005_helpers.sql`). A minimal implementation:

- On ayah view, `upsert` into `reading_progress` for `(user, surah_id)`.
- On surah load (when authenticated), `select last_ayah_number` and scroll/indicate it.

Sketch only — defer until the auth + favorites wiring above is stable.

---

## 9. Staying free — operational checklist

- [ ] **Keepalive Worker deployed** (Section 4) — prevents the 7-day idle pause.
- [ ] **Content stays on R2**, never in the Supabase DB or Storage. The DB only holds small relational rows.
- [ ] **Watch MAU** in the Supabase dashboard → Auth → Users. Free tier covers 50K; you'll likely never approach it.
- [ ] **Don't store blobs in Postgres** — if you ever add user avatars, keep them on R2 and store only the URL in a column.
- [ ] **GitHub Pages stays free** for static hosting — no reason to migrate.

**When you'd actually outgrow free tier:**

- Community features (public/shared bookmarks, comments) — heavier DB load, more rows.
- > 50K monthly active users — needs Supabase Pro ($25/mo) for the MAU alone.
- Server-side search across 6236 ayahs — would need Workers + an index, but that's a separate decision; client-side search is correct for now.

---

## 10. Cheat sheet

**Files touched when wiring Supabase:**

| Path | Change |
|---|---|
| `web/package.json` | `+ @supabase/supabase-js` |
| `web/.env` / `.env.example` | `+ VITE_SUPABASE_URL`, `+ VITE_SUPABASE_ANON_KEY` |
| `web/src/api/supabase.js` | new — singleton client |
| `web/src/contexts/AuthContext.jsx` | new — auth provider |
| `web/src/contexts/FavoritesContext.jsx` | modified — sync when authenticated, `localStorage` otherwise |
| `web/src/App.jsx` | add `<AuthProvider>` above `<FavoritesProvider>` |
| `supabase/migrations/001-005` | apply once to the live project (already authored) |

**Env vars (all of them):**

```bash
VITE_DATA_BASE=https://pub-<hash>.r2.dev/data     # R2, production only
VITE_SUPABASE_URL=https://<ref>.supabase.co        # Supabase
VITE_SUPABASE_ANON_KEY=<anon-key>                  # Supabase (RLS-protected)
```

**Key commands:**

```bash
pnpm add @supabase/supabase-js                     # in web/
supabase link --project-ref <ref>                  # in repo root
supabase db push                                   # applies migrations 001-005
npx wrangler deploy                                # keepalive Worker (Section 4)
VITE_DATA_BASE=... VITE_SUPABASE_URL=... \
    VITE_SUPABASE_ANON_KEY=... pnpm build          # production build with both
```

**Live URLs:**

- App: https://islamux.github.io/tafseer-nabulsi/
- R2 data: `https://pub-<hash>.r2.dev/data/<1-114>.json`
- Supabase: `https://<ref>.supabase.co`
