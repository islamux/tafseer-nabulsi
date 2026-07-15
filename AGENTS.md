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
```

## Project Structure

- `web/` — React 19 + Vite + Tailwind CSS frontend
- `pipeline/` — Python scraping pipeline (uses `uv` for env/deps)
- `web/public/data/` — Generated JSON output from pipeline (copied via `pnpm copy-data`)
- `web/src/components/` — React components
- `web/src/contexts/` — React Context providers (Theme, Favorites, Data)
- `web/src/utils/` — Utility functions

## Build & Lint Commands

- **Build web app**: `pnpm build` (run inside `web/`)
- **No linter configured** — verify changes via `pnpm build` succeeding
- **Pipeline tests**: `cd pipeline && uv run pytest` (16 tests)

## Deployment

- `main` branch — source code
- `gh-pages` branch — deployed build (`web/dist/`)
- Vite `base: '/tafseer-nabulsi/'` for GitHub Pages
- Live URL: https://islamux.github.io/tafseer-nabulsi/

### Deploy steps
1. Commit source changes to `main`, push
2. `pnpm build` inside `web/` (on `main`)
3. Copy `web/dist/` to temp
4. Switch to `gh-pages`, copy dist into `web/dist/`
5. Force-add dist files (gitignored), commit, push

## Conventions

- **Fully RTL**: `<html dir="rtl">`, Arabic content throughout
- **Fonts**: Noto Naskh Arabic (Quran/UI), Inter (fallback)
- **Themes**: Light/Dark/Sepia via CSS custom properties + `data-theme` attribute
- **No pure `#fff` or `#000`**: Use tinted CSS variables (`--text-on-accent`, etc.)
- **Arabic-Indic numerals**: Use `toArabicNum()` from `web/src/utils/arabic.js`
- **No comments in code** unless explicitly requested
- **Python pipeline**: Uses `uv` (not pip/venv directly)
