# AGENTS.md

## Package Manager

**Always use `pnpm` — never `npm` or `yarn`.**

The project uses pnpm (lockfile: `web/pnpm-lock.yaml`, workspace: `web/pnpm-workspace.yaml`).

```bash
# Install dependencies
pnpm install          # in web/

# Build
pnpm build            # in web/

# Dev server
pnpm dev              # in web/

# Preview production build
pnpm preview          # in web/

# Copy pipeline data to web
pnpm copy-data        # in web/

# Run web tests
pnpm test             # in web/ (33 tests, vitest)
pnpm test:watch       # watch mode
```

## Project Structure

- `web/` — React 19 + Vite + Tailwind CSS frontend
- `pipeline/` — Python scraping pipeline (uses `uv` for env/deps)
- `web/public/data/` — Generated JSON output from pipeline (gitignored — populated locally via `pnpm copy-data`; in production served from Cloudflare R2, see Deployment)
- `scripts/` — Standalone scripts (e.g. `upload_to_r2.py` — push minified JSON to R2)
- `web/src/components/` — React components
- `web/src/contexts/` — React Context providers (Theme, Favorites, Data, Search)
- `web/src/utils/` — Utility functions (`arabic.js`, `tafsir.js`)
- `web/src/api/` — Data access (`data.js`) + search engine (`search.js`)

## Build & Lint Commands

- **Build web app**: `pnpm build` (run inside `web/`)
- **Web tests**: `pnpm test` (run inside `web/`, vitest + jsdom)
- **No linter configured** — verify changes via `pnpm build` succeeding
- **Pipeline tests**: `cd pipeline && uv run pytest` (45 tests)

## Deployment

- `main` branch — source code
- `gh-pages` branch — deployed build (`web/dist/`)
- Vite `base: '/tafseer-nabulsi/'` for GitHub Pages
- Live URL: https://islamux.github.io/tafseer-nabulsi/

### Data hosting (R2)

Tafsir JSON (~388MB) is **not committed** — `web/public/data/` and `pipeline/output/` are both gitignored. Distribution:

- **Local dev**: run `pnpm copy-data` (in `web/`) to copy `pipeline/output/*.json` into `web/public/data/`. The app reads from `/data`.
- **Production**: data is served from Cloudflare R2. The web app reads `import.meta.env.VITE_DATA_BASE` (see `web/src/api/data.js`); falls back to `/data` when unset. See `web/.env.example`.

### Deploy steps

1. Commit source changes to `main`, push
2. Ensure R2 has the latest data (see "Refresh R2 data" below)
3. `VITE_DATA_BASE=https://pub-<hash>.r2.dev/data pnpm build` inside `web/` (on `main`) — without this, the deployed site has no data
4. Copy `web/dist/` to temp
5. Switch to `gh-pages`, copy dist into `web/dist/`
6. Force-add dist files (gitignored), commit, push

### Refresh R2 data (after a pipeline rebuild)

```bash
# In repo root, with R2 creds in env:
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
    R2_BUCKET=tafseer-nabulsi-data uv run --with boto3 scripts/upload_to_r2.py
```

Uploads all `pipeline/output/*.json` to `data/*.json` on R2 with `Content-Type: application/json; charset=utf-8` and a long-lived cache (`max-age=86400, s-maxage=31536000, stale-while-revalidate=604800`).

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

### One-time R2 setup (runbook)

1. Cloudflare dashboard → R2 → create bucket (e.g. `tafseer-nabulsi-data`)
2. Enable public access on the `*.r2.dev` subdomain; record the URL
3. CORS policy: allow `https://islamux.github.io` and `http://localhost:5173`, methods `GET`/`HEAD`, headers `*`
4. Create R2 API token with Object Read & Write on the bucket; record `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
5. Run the upload command above; verify with `curl -I https://pub-<hash>.r2.dev/data/1.json` (200 + CORS headers)
6. Set `VITE_DATA_BASE` and run the deploy steps above

## Git & PR Workflow

- When creating a PR or merging (accepting) a PR, **NEVER delete the branch**. Always omit `--delete-branch` / `-d` / `--delete` from `gh pr merge`, `git push origin --delete`, and `git branch -D`. Keep merged branches intact.

## Conventions

- **Fully RTL**: `<html dir="rtl">`, Arabic content throughout
- **Fonts**: Noto Naskh Arabic (Quran/UI), Inter (fallback)
- **Themes**: Light/Dark/Sepia via CSS custom properties + `data-theme` attribute
- **No pure `#fff` or `#000`**: Use tinted CSS variables (`--text-on-accent`, etc.)
- **Arabic-Indic numerals**: Use `toArabicNum()` from `web/src/utils/arabic.js`
- **No comments in code** unless explicitly requested
- **Python pipeline**: Uses `uv` (not pip/venv directly)
