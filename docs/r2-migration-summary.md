# Cloudflare R2 Migration — Summary

**Date:** 2026-07-20
**Status:** Complete

## What changed

The 388MB tafsir JSON dataset is no longer in the git repo. It's served from Cloudflare R2 in production, and read from `web/public/data/` locally.

### Architecture

```
Pipeline → minified JSON → upload to R2 → web app fetches via VITE_DATA_BASE
                                            ↓ (local dev fallback)
                                        /data (pnpm copy-data)
```

### Key files

| File | Purpose |
|---|---|
| `scripts/upload_to_r2.py` | Resumable uploader (boto3 or wrangler). Checks R2 before uploading, skips existing. |
| `web/src/api/data.js` | Reads `import.meta.env.VITE_DATA_BASE`, falls back to `/data` |
| `web/.env.example` | Documents `VITE_DATA_BASE` for prod builds |
| `AGENTS.md` | R2 runbook, deploy steps, upload commands |
| `docs/how-to-deploy-to-github-pages.md` | Deploy process (requires `VITE_DATA_BASE` at build time) |

### R2 resources

| Resource | Value |
|---|---|
| Bucket | `tafseer-nabulsi-data` |
| Public URL | `https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data` |
| Account ID | `5c651e4916c8b8c31ba4f5b11ec7862b` |
| CORS | `islamux.github.io` + `localhost:5173`, GET/HEAD |
| Cache | `max-age=86400, s-maxage=31536000, stale-while-revalidate=604800` |

### Commits (main)

1. `a8180b9` — `feat: minify pipeline JSON output` (builder.py, main.py)
2. `85e4c6c` — `feat: make web data URL configurable via VITE_DATA_BASE`
3. `a51a381` — `chore: add R2 upload script + docs`
4. `f7097cc` — `chore: make R2 upload script resumable + save resume state`
5. `209b642` — `fix: increase wrangler upload timeout to 600s for slow networks`

## Deploy process

```bash
# Build with R2 URL baked in
VITE_DATA_BASE=https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data pnpm --dir web build

# Deploy to gh-pages (see docs/how-to-deploy-to-github-pages.md)
```

## Refreshing R2 data (after pipeline rebuild)

```bash
# Fast (needs S3 API token):
R2_ACCOUNT_ID=5c651e4916c8b8c31ba4f5b11ec7862b \
R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
R2_BUCKET=tafseer-nabulsi-data \
uv run --with boto3 scripts/upload_to_r2.py

# Or wrangler (no creds needed):
uv run scripts/upload_to_r2.py --method wrangler
```

## Lessons learned

- Wrangler parallel uploads (4-8 concurrent) fail silently ~60-90% of the time on slow networks. Sequential uploads work reliably.
- Increase subprocess timeout to 600s for large files on slow connections.
- `web/public/data/` must be empty before deploying — otherwise dist includes 388MB of data files.
- GitHub Pages can't be verified from this machine (network unreachable to `islamux.github.io`). Verify from a browser.
