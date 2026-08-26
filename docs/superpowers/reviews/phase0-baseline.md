# Phase 0 — Baseline (automated checks + docs verification)

Recorded: 2026-08-24 · Branch: `audit/full-project-review` · Report-only audit; no source changes.

## Build

Command: `pnpm build` in `web/`

- **Exit status: 0** — succeeded.
- Vite `v6.4.3`, 64 modules transformed, built in 2.45s.
- **Warnings: none.** Every warning line was captured verbatim from output; no warnings were emitted.

## Web Tests

Command: `pnpm test` in `web/` (vitest run)

- **Exit status: 0**
- **Test Files: 8 passed (8)**
- **Tests: 39 passed (39)** — 0 failed, 0 skipped, 0 todo.
- Duration: **4.54s** (transform 630ms, setup 1.61s, collect 2.70s, tests 362ms).
- Per-file: tafsir.test.js (9), arabic.test.js (15), FavoritesContext.test.js (4), search.test.js (6), App.routing.test.jsx (2), SurahView.test.jsx (1), App.integration.test.jsx (1), ThemeContext.test.js (1).
- No flaky behavior observed (single clean run).

## Pipeline Tests

Command: `uv run pytest` in `pipeline/` (pytest 9.1.1, Python 3.12.11)

- **Exit status: 0**
- **Tests: 45 passed** in 0.62s — 0 failed, 0 skipped.
- Files: test_builder.py (6), test_category_index.py (15), test_lesson_parser.py (18), test_sitemap_parsing.py (6).
- Note: first run created `.venv` via uv (14 packages installed); a filesystem hardlink warning appeared (`UV_LINK_MODE=copy` suggestion) — environment noise, not a test failure.

## Dependency Audits

### `pnpm audit` in `web/` — exit 1

**3 vulnerabilities found — Severity: 2 high | 1 moderate**

| Sev | Package | Vulnerable range | Patched | Path | Advisory |
|-----|---------|------------------|---------|------|----------|
| high | react-router | >=7.12.0 <7.18.2 | >=7.18.2 | . → react-router-dom → react-router | GHSA-qwww-vcr4-c8h2 (RSC Mode CSRF bypass allows action execution before 400 response) |
| high | nanoid | <3.3.18 | >=3.3.18 | transitive of @vitejs/plugin-react→vite→postcss, autoprefixer→postcss (12 paths total) | GHSA-2v37-7h3g-55p8 (custom generators can loop indefinitely when size is zero) |
| moderate | postcss | <=8.5.22 | >=8.5.23 | same 12-path set as nanoid | GHSA-fxqj-rqcc-2cmp (attacker-controlled sourceMappingURL reads arbitrary .map files when `from` unset) |

Notes: both high findings are dev-tooling-transitive (nanoid/postcss) or unused-at-runtime features (react-router RSC mode); the direct react-router-dom usage is a real runtime dep and worth a patch bump regardless.

### `pip-audit` in `pipeline/` — exit 0

Run as `uv run --with pip-audit pip-audit` (ephemeral; `pyproject.toml` untouched). Result: **"No known vulnerabilities found"** — clean.

### Worker (`workers/tafsir-api/`)

`workers/tafsir-api/package.json` **does not exist** — nothing to audit there.

## Bundle

Source: `ls -la web/dist/assets/` after the Step-1 build (total `web/dist` = 279K).

| File | Raw | Gzipped |
|------|-----|---------|
| index-dvuaC17e.js (main chunk) | 245.40 kB | 79.05 kB |
| SurahView-COsyOsb9.js | 5.26 kB | 2.29 kB |
| SearchBar-NtiC8gqw.js | 2.54 kB | 1.17 kB |
| NotFound-Cw_w8ffR.js | 0.39 kB | 0.32 kB |
| index-QcYeEXq_.css | 11.78 kB | 3.32 kB |
| index.html | 2.34 kB | 1.12 kB |

Totals: JS ≈ **253.59 kB raw / ~82.83 kB gzipped**; CSS 11.78 kB raw / 3.32 kB gzipped.

**PRF candidates (>300 kB gzipped): none.** Main chunk at 79 kB gzip is healthy for React 19 + router; route-level code splitting already present (SurahView/SearchBar/NotFound are separate chunks).

## Docs Check

AGENTS.md claims verified against reality:

1. **Commands exist** — ✅ All six scripts present in `web/package.json`: `dev`, `build`, `preview`, `copy-data`, `test`, `test:watch`.
2. **Claimed paths exist** — ✅ `web/src/components/`, `web/src/contexts/`, `web/src/utils/arabic.js`, `web/src/utils/tafsir.js`, `web/src/api/data.js`, `web/src/api/search.js` all exist.
3. **Test-count claims** — ❌ Web: AGENTS.md claims **33 tests**, actual **39** (see Web Tests above). Pipeline: claims 45, actual 45 ✅.
4. **`VITE_DATA_BASE` fallback claim** — ❌ AGENTS.md says the app "falls back to `/data` when unset". Actual code (`web/src/api/data.js:4`) falls back to `/data` **only when `import.meta.env.DEV` is true**; production builds with `VITE_DATA_BASE` unset fall back to a **hardcoded R2 public URL baked into source**: `https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data`. The documented unconditional fallback does not match production behavior.

### Findings

Both mismatches are DOC findings (AREA prefix `WEB-`, dimension: improvements):

- **WEB-001** [docs/improvements] AGENTS.md test-count claim stale: says web suite has 33 tests; suite currently has 39 passing tests across 8 files.
- **WEB-002** [docs/improvements] AGENTS.md (and by extension `web/.env.example`, `docs/r2-migration-summary.md`) describe an unconditional `/data` fallback when `VITE_DATA_BASE` is unset; actual fallback is dev-only, with a hardcoded R2 URL in production builds (`web/src/api/data.js:4`). Docs should either describe the dev/prod split or the hardcoded default should be removed in favor of explicit config.
