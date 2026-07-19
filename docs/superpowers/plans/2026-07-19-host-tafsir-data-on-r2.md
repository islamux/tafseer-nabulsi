# Host Tafsir Data on Cloudflare R2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the 388MB tafsir dataset out of the repo onto Cloudflare R2. Fixes the broken gh-pages deploy path (data was gitignored in commit `1dc5de4` but `pnpm build` still expected it in `web/public/data/`).

**Architecture:** Pipeline emits minified JSON → upload script pushes to R2 → web app fetches via `VITE_DATA_BASE` env var (with `/data` fallback for local dev).

**Tech Stack:** Python (boto3), Vite env vars, Cloudflare R2 (S3-compatible).

---

## Phase 1 — Code & docs (no R2 dependency)

### Task 1: Verify working tree is green
- [ ] `cd pipeline && uv run pytest` → 15 tests pass
- [ ] `cd web && pnpm test` → 21 tests pass
- [ ] `cd web && pnpm build` → succeeds

### Task 2: Update R2 upload script with best-practice cache headers
- [ ] Edit `scripts/upload_to_r2.py:59` → `CacheControl: "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"`
- [ ] Run `uv run --with boto3 scripts/upload_to_r2.py` without creds → expect clean "Missing env: …" error (validates the script loads)

### Task 3: Rebuild pipeline output (minified format lands on disk)
- [ ] `cd pipeline && uv run python -m src.main --all`
- [ ] Verify file sizes drop (sample: `_index.json` before/after)
- [ ] `cd web && pnpm copy-data` to refresh local dev

### Task 4: Add env documentation
- [ ] Create `web/.env.example` with `VITE_DATA_BASE=` documented
- [ ] Confirm `.env.example` is committed (not gitignored)

### Task 5: Update AGENTS.md
- [ ] Add **"Data hosting (R2)"** section under Deployment
- [ ] Update **"Deploy steps"** to set `VITE_DATA_BASE` before `pnpm build`
- [ ] Add Phase 2 (R2 provisioning runbook) as a "One-time setup" subsection

### Task 6: Update root README.md
- [ ] Add a brief data-hosting note + pointer to `AGENTS.md`

### Task 7: Fix stale docs
- [ ] `docs/interview-questions.md:449` — rewrite the minification answer to reflect current state

### Task 8: Final verification + commits
- [ ] Re-run `uv run pytest`, `pnpm test`, `pnpm build`
- [ ] Commit in 3 logical commits:
  - `feat: minify pipeline JSON output`
  - `feat: make web data URL configurable via VITE_DATA_BASE`
  - `chore: add R2 upload script + docs`

---

## Phase 2 — R2 provisioning & first deploy (user-driven runbook)

### Task 9: Provision R2 bucket (Cloudflare dashboard)
- [ ] Create bucket `tafseer-nabulsi-data`
- [ ] Enable public access via `*.r2.dev` subdomain (Settings → Public access)
- [ ] Note the public URL: `https://pub-<hash>.r2.dev`

### Task 10: Configure CORS
- [ ] Bucket → Settings → CORS policy:
  ```json
  [{
    "AllowedOrigins": ["https://islamux.github.io", "http://localhost:5173"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 86400
  }]
  ```

### Task 11: Create R2 API token
- [ ] R2 → Manage R2 API Tokens → Create
- [ ] Permissions: Object Read & Write on `tafseer-nabulsi-data`
- [ ] Record: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`

### Task 12: Upload data
- [ ] Export the four env vars in shell
- [ ] `uv run --with boto3 scripts/upload_to_r2.py`
- [ ] Verify all 116 files uploaded (script reports count)

### Task 13: Verify R2 public URL
- [ ] `curl -I https://pub-<hash>.r2.dev/data/1.json` → 200, `Content-Type: application/json; charset=utf-8`, `Access-Control-Allow-Origin: *`
- [ ] `curl -s https://pub-<hash>.r2.dev/data/_index.json | head -c 200` → valid JSON

### Task 14: First R2-backed deploy
- [ ] `VITE_DATA_BASE=https://pub-<hash>.r2.dev/data pnpm build` (in `web/`)
- [ ] Verify `dist/assets/*.js` contains the R2 URL (grep for `r2.dev`)
- [ ] Deploy to gh-pages per existing flow
- [ ] Open https://islamux.github.io/tafseer-nabulsi/ → confirm surah list loads and surah 1 fetches

### Task 15: Document the live URL
- [ ] Add the R2 public URL to `AGENTS.md` Deployment section
- [ ] Note the date of last data upload

---

## Execution Order
```
Tasks 1–3 (verify + rebuild)   →  baseline confidence
Tasks 4–7 (docs)               →  in parallel where possible
Task 8 (commit)                →  Phase 1 done
Tasks 9–15 (Phase 2)           →  when user has R2 access; runbook only
```

## Verification Signals
| Task | Success signal |
|---|---|
| 1 | All tests pass; build succeeds |
| 2 | Script fails cleanly without creds; cache header correct in source |
| 3 | `_index.json` size drops noticeably |
| 4 | `.env.example` committed, documents `VITE_DATA_BASE` |
| 5–7 | AGENTS.md, README, interview-questions all consistent |
| 12 | All 116 files uploaded |
| 13 | R2 URL serves JSON with correct headers + CORS |
| 14 | Live gh-pages site loads data from R2 |

## Notes / constraints
- `pnpm copy-data` script remains unchanged — still the local dev path
- `web/public/data/` stays gitignored (388MB too large for repo)
- No GitHub Actions workflow added (deploy is manual per current convention)
- `VITE_DATA_BASE` must be set **at build time** (Vite bakes it into the bundle)
- If R2 is down, prod breaks; `/data` fallback only helps local dev

---

## Resume State (saved 2026-07-19)

### What's done
- Phase 1 complete (3 commits on main): minify JSON, VITE_DATA_BASE, R2 upload script + docs
- R2 bucket created, public dev-url enabled, CORS configured
- **21 of 116 files uploaded** to R2 (files 1, 10–13, 100–114)
- Wrangler installed globally, OAuth token valid until 2026-07-20T06:52:54Z
- Resumable upload script: `scripts/upload_to_r2.py` (boto3 or wrangler method)

### What's left
- **95 files still need uploading** — list at `/tmp/r2-missing-final.txt`
- Network is slow (~23KB/s upload to Cloudflare). Sequential wrangler uploads work but take ~4s overhead + bandwidth per file.
- Once all 116 files uploaded: verify public URL, build with `VITE_DATA_BASE`, deploy to gh-pages

### How to resume
```bash
# Option A: boto3 (faster, needs S3 API token in env)
R2_ACCOUNT_ID=5c651e4916c8b8c31ba4f5b11ec7862b \
R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
R2_BUCKET=tafseer-nabulsi-data \
uv run --with boto3 scripts/upload_to_r2.py

# Option B: wrangler (slower, uses existing OAuth — no creds needed)
uv run scripts/upload_to_r2.py --method wrangler

# Option C: manual sequential (if wrangler has issues)
for f in $(cat /tmp/r2-missing-final.txt); do
  wrangler r2 object put "tafseer-nabulsi-data/data/$f" \
    --file "pipeline/output/$f" --remote \
    --content-type "application/json; charset=utf-8" \
    --cache-control "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"
done
```

### After upload completes
1. Verify: `curl -I https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data/1.json`
2. Build: `VITE_DATA_BASE=https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data pnpm build`
3. Deploy per `docs/how-to-deploy-to-github-pages.md`
4. Update AGENTS.md with live R2 URL
