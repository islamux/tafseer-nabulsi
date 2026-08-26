# Phase B Fixes Implementation Plan

**Goal:** Implement the 5 structural fixes from the full project audit (Phase B of the audit report's fix-order).

**Spec:** `docs/superpowers/reviews/2026-08-24-full-project-review-report.md` (Section 4, Phase B)

**Branch:** `fix/phase-b-structural` from `main`

**Package managers:** `pnpm` for web/, `uv` for pipeline/.

**No comments** in code unless explicitly requested. **RTL throughout.**

---

### Task 1: A11Y-002 — Darken light-theme accent to `#00695c` (High/a11y, M)

**Files:** `web/src/index.css` (light + sepia theme blocks)

**Rationale:** Light-theme `--accent: #00897b` fails WCAG AA on both `#ffffff` (4.32:1) and `#f5f5f5` (3.96:1). Sepia `--accent: #00796b` fails on `#e8dcc8` (3.93:1). Fix: darken to `#00695c`.

**Target ratios:**
- `#00695c` on `#ffffff` ≈ 5.74:1 (pass)
- `#00695c` on `#f5f5f5` ≈ 5.02:1 (pass)
- `#00695c` on `#e8dcc8` ≈ 4.62:1 (pass)
- Badge `#fefdfe` on `#00695c` ≈ 5.88:1 (pass)

- [ ] Step 1: Edit `web/src/index.css` — update `:root` accent to `#00695c` + companion rgba values; update `[data-theme="sepia"]` accent to `#00574d` (or keep `#00695c`)
- [ ] Step 2: Verify ratios manually from hex values
- [ ] Step 3: Run `pnpm test` (web/) — all pass
- [ ] Step 4: Run `pnpm build` (web/) — succeeds
- [ ] Step 5: Commit

---

### Task 2: PIP-005 — Cap `_find_nearest_range` distance + provenance (High/bugs, M)

**Files:** `pipeline/src/merge/builder.py` (fix + test), `pipeline/tests/test_builder.py`

**Rationale:** `_find_nearest_range` has no distance cap — ayah 250 can inherit from ayahs 1–3. No provenance field means consumers can't distinguish inherited from direct tafsir.

- [ ] Step 1: Add tests to `test_builder.py` — (a) inheritance stops beyond distance cap; (b) output has `tafsir_inherited` field
- [ ] Step 2: Implement distance cap (`MAX_INHERIT_DISTANCE = 5`) and `tafsir_inherited` field
- [ ] Step 3: Run `uv run pytest` (pipeline/) — all pass
- [ ] Step 4: Commit

---

### Task 3: TST-001 — Tests for `api/data.js` (Critical, S)

**Files:** Create `web/src/api/data.test.js`

- [ ] Step 1: Write tests — fetchJson timeout, non-ok response, loadIndex caching, loadSurah caching, normalizeSurah conditional basmala strip
- [ ] Step 2: Run `pnpm test` — all pass
- [ ] Step 3: Commit

---

### Task 4: TST-002 — Tests for `api/worker.js` (Critical, S)

**Files:** Create `web/src/api/worker.test.js`

- [ ] Step 1: Write tests — getDeviceId with/without API_BASE, getDeviceId localStorage throw, api() error paths, CRUD wrappers send correct method/path/body
- [ ] Step 2: Run `pnpm test` — all pass
- [ ] Step 3: Commit

---

### Task 5: TST-003 — Tests for `DataContext.jsx` (Critical, M)

**Files:** Create `web/src/contexts/DataContext.test.jsx`

- [ ] Step 1: Write tests — DataProvider renders, useData returns index, useData returns indexError on failure, readingProgress from fetchProgress, saveReadingProgress updates state, useData throws outside provider
- [ ] Step 2: Run `pnpm test` — all pass
- [ ] Step 3: Commit

---

### Task 6: TST-005 — Tests for `content_extractor.py` (High, M)

**Files:** Create `pipeline/tests/test_content_extractor.py`

- [ ] Step 1: Write tests — process_lesson end-to-end, _extract_theme comma/dash/no-separator, _clean_text preserves paragraphs, process_lesson with empty title
- [ ] Step 2: Run `uv run pytest` — all pass
- [ ] Step 3: Commit

---

### Task 7: TST-006 — Tests for `scraper.py` HTML extraction (High, M)

**Files:** Create `pipeline/tests/test_scraper_html.py`

- [ ] Step 1: Write tests — extract_story_links_from_category dedup/urljoin, fetch_story_page extracts title/body/category, fallback selectors, returns None on fetch failure
- [ ] Step 2: Run `uv run pytest` — all pass
- [ ] Step 3: Commit

---

### Task 8: WRK-001 — HMAC-signed device tokens (High/security, M)

**Files:** `workers/tafsir-api/src/index.js`, `workers/tafsir-api/wrangler.jsonc`, `web/src/api/worker.js`

**Rationale:** No auth on any endpoint. device_id in URL query strings. Anyone who learns a device_id can read/modify/delete bookmarks and progress.

**Approach:** HMAC-SHA256 of device_id with a Worker secret. Client stores the token (not raw device_id). Server verifies token, extracts device_id from it. Move identity from query params to `Authorization: Bearer <token>` header.

- [ ] Step 1: Read current Worker and worker.js source
- [ ] Step 2: Add HMAC signing/verification helpers to Worker
- [ ] Step 3: Add `DEVICE_SECRET` env var to wrangler.jsonc
- [ ] Step 4: Update all 5 handlers to verify token from Authorization header
- [ ] Step 5: Update `web/src/api/worker.js` to send token in header
- [ ] Step 6: Run web tests — all pass
- [ ] Step 7: Commit
