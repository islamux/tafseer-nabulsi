# تفسير النابلسي — Tafsir Nabulsi

A web app for reading the Quran alongside the tafsir (interpretation) of Dr. Muhammad Rateb Al-Nabulsi, ayah by ayah. Fully Arabic, fully RTL.

**Live:** https://islamux.github.io/tafseer-nabulsi/

---

## Features

- **Browse** all 114 surahs of the Quran.
- **Read** each ayah with its tafsir underneath.
- **Search** across every ayah and every tafsir (client-side).
- **Bookmark** ayahs and resume where you left off (reading progress).
- **Themes:** Light, Dark, and Sepia.
- Arabic-Indic numerals throughout; no pure `#fff`/`#000` (tinted palette).

## Tech stack

| Layer | Tools |
|---|---|
| Web app | React 19, Vite 6, Tailwind CSS 3, React Router 7 |
| Data pipeline | Python (managed with `uv`) |
| Content hosting | Cloudflare R2 (~388 MB of tafsir JSON, not in this repo) |
| Bookmarks / progress sync (optional) | Cloudflare Worker + D1 (device-ID keyed, no auth) |
| Hosting | GitHub Pages (`gh-pages` branch) |

## Project structure

```
tafseer-nabulsi/
├── web/                # React app — everything the user sees
├── pipeline/           # Python scraper + builder → JSON output
├── workers/tafsir-api/ # Optional Cloudflare Worker (D1 bookmarks + progress)
├── scripts/            # R2 upload helper
├── supabase/           # Historical (superseded by workers/tafsir-api)
└── docs/               # Architecture, deploy guide, onboarding
```

The web app loads ready-made JSON produced by `pipeline/`. The web app has no database of its own; if content is missing, the fix is usually in the pipeline.

## Getting started (local dev)

Prerequisites: Node ≥ 20, `pnpm`, and `uv` (for the pipeline).

```bash
cd web
pnpm install
pnpm copy-data    # copies ../pipeline/output/*.json into public/data/
pnpm dev          # http://localhost:5173
```

Local dev reads tafsir data from `web/public/data/`. If that folder is empty, run the pipeline first (see `pipeline/README.md`) or run `pnpm copy-data` after a pipeline build.

## Environment variables

All optional — local dev works without any of them. See `web/.env.example`.

| Var | Purpose |
|---|---|
| `VITE_DATA_BASE` | Base URL for tafsir JSON. Production: the R2 public URL. Unset → falls back to `/data` (local dev). |
| `VITE_API_BASE` | Cloudflare Worker URL for bookmarks + reading-progress sync. Unset → localStorage-only mode. |
| `VITE_API_ORIGIN` | Optional override for the CSP `connect-src` entry. Auto-derived from `VITE_API_BASE` at build time. |

## Testing

```bash
# Web (vitest)
cd web && pnpm test

# Pipeline (pytest)
cd pipeline && uv run pytest
```

## Deployment

Source lives on `main`; the live site is built from the `gh-pages` branch (orphan branch containing only `web/dist/`).

```bash
# Build with the R2 data URL baked in (required, or the live site has no data)
cd web
VITE_DATA_BASE=https://pub-<hash>.r2.dev/data pnpm build
```

Then follow the full orphan-branch deploy flow in [`docs/how-to-deploy-to-github-pages.md`](docs/how-to-deploy-to-github-pages.md). See also `AGENTS.md` for the R2 and Worker runbooks.

## Further reading

- [`AGENTS.md`](AGENTS.md) — authoritative architecture, commands, and runbooks
- [`docs/how-to-deploy-to-github-pages.md`](docs/how-to-deploy-to-github-pages.md) — deploy steps
- [`docs/onboarding/`](docs/onboarding/) — beginner walkthrough of the codebase
- [`docs/all-cloudflare-migration-status.md`](docs/all-cloudflare-migration-status.md) — bookmarks/progress sync design
