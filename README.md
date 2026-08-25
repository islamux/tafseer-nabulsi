# تفسير النابلسي — Tafsir Nabulsi

A web app for reading the Quran alongside the tafsir (interpretation) of Dr. Muhammad Rateb Al-Nabulsi, ayah by ayah. Fully Arabic, fully RTL.

**Live:** https://islamux.github.io/tafseer-nabulsi/

---

## Features

- **Browse** all 114 surahs of the Quran.
- **Read** each ayah with its tafsir underneath.
- **Search** across every ayah and every tafsir (client-side, with Arabic diacritics and alef variant normalization).
- **Bookmark** ayahs and resume where you left off (reading progress).
- **Themes:** Light, Dark, and Sepia — all with WCAG AA contrast.
- Arabic-Indic numerals throughout; no pure `#fff`/`#000` (tinted palette).

## Tech stack

| Layer | Tools |
|---|---|
| Web app | React 19, Vite 6, Tailwind CSS 3, React Router 7 |
| Data pipeline | Python 3.12+ (managed with `uv`) |
| Content hosting | Cloudflare R2 (~388 MB of tafsir JSON, not in this repo) |
| Bookmarks / progress sync (optional) | Cloudflare Worker + D1 (device-ID keyed, no auth) |
| Hosting | GitHub Pages (`gh-pages` branch) |
| Testing | Vitest (web, 42 tests), Pytest (pipeline, 50 tests) |

## Project structure

```
tafseer-nabulsi/
├── web/                # React app — everything the user sees
│   ├── src/
│   │   ├── api/        # Data loading + search engine
│   │   ├── components/ # React components
│   │   ├── contexts/   # Context providers (Theme, Favorites, Data, Search)
│   │   └── utils/      # Utility functions (Arabic, tafsir helpers)
│   └── public/data/    # Generated JSON output (gitignored, populated locally)
├── pipeline/           # Python scraper + builder → JSON output
│   ├── src/
│   │   ├── merge/      # Builder: combines Quran text + tafsir + media
│   │   ├── quran/      # Quran text fetcher + parser
│   │   ├── tafsir/     # Tafsir scraper, parser, content extractor
│   │   └── media/      # Media (audio/video) mapper
│   └── tests/          # Pytest test suite
├── workers/tafsir-api/ # Optional Cloudflare Worker (D1 bookmarks + progress)
├── scripts/            # R2 upload helper
└── docs/               # Architecture docs, deploy guide, audit reports
```

The web app loads ready-made JSON produced by `pipeline/`. If content is missing, the fix is usually in the pipeline.

## Getting started (local dev)

Prerequisites: Node >= 20, `pnpm`, and `uv` (for the pipeline).

```bash
# Web app
cd web
pnpm install
pnpm copy-data    # copies ../pipeline/output/*.json into public/data/
pnpm dev          # http://localhost:5173

# Pipeline (to generate fresh data)
cd pipeline
uv run pytest     # run tests first
uv run python -m src.cli --all   # full build
```

Local dev reads tafsir data from `web/public/data/`. If that folder is empty, run the pipeline first or run `pnpm copy-data` after a pipeline build.

## Environment variables

See `web/.env.example`.

| Var | Required | Purpose |
|---|---|---|
| `VITE_DATA_BASE` | Production only | Base URL for tafsir JSON (e.g. `https://pub-<hash>.r2.dev/data`). Dev mode falls back to `/data`. |
| `VITE_API_BASE` | Optional | Cloudflare Worker URL for bookmarks + reading-progress sync. Unset = localStorage-only mode. |
| `VITE_API_ORIGIN` | Optional | Override for the CSP `connect-src` entry. Auto-derived from `VITE_API_BASE` at build time. |

## Testing

```bash
# Web — vitest (42 tests)
cd web && pnpm test

# Pipeline — pytest (50 tests)
cd pipeline && uv run pytest
```

## Deployment

Source lives on `main`; the live site is built from the `gh-pages` branch (orphan branch containing only `web/dist/`).

```bash
# Build with the R2 data URL baked in (required for production)
cd web
VITE_DATA_BASE=https://pub-<hash>.r2.dev/data pnpm build
```

Then follow the full orphan-branch deploy flow in [`docs/how-to-deploy-to-github-pages.md`](docs/how-to-deploy-to-github-pages.md). See also `AGENTS.md` for the R2 and Worker runbooks.

### Worker (D1 bookmarks + reading progress API)

```bash
cd workers/tafsir-api
npx wrangler login
npx wrangler d1 create tafseer-nabulsi
npx wrangler d1 execute tafseer-nabulsi --file=src/schema.sql
npx wrangler deploy
```

Build web app with Worker URL:
```bash
VITE_API_BASE=https://tafsir-api.<subdomain>.workers.dev/api pnpm build
```

### R2 data refresh

```bash
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
    R2_BUCKET=tafseer-nabulsi-data uv run --with boto3 scripts/upload_to_r2.py
```

## Further reading

- [`AGENTS.md`](AGENTS.md) — authoritative architecture, commands, and runbooks
- [`docs/how-to-deploy-to-github-pages.md`](docs/how-to-deploy-to-github-pages.md) — deploy steps
- [`docs/onboarding/`](docs/onboarding/) — beginner walkthrough of the codebase
- [`docs/superpowers/reviews/`](docs/superpowers/reviews/) — full project audit report (86 findings)
