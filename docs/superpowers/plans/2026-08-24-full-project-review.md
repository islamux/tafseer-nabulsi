# Full Project Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit the entire tafseer-nabulsi project and produce one prioritized findings report at `docs/superpowers/reviews/2026-08-24-full-project-review-report.md`.

**Architecture:** Hybrid audit per the approved design — automated baselines first (builds, tests, dependency audits), then focused research-only subagents per subsystem and per cross-cutting dimension, then manual verification of Critical/High findings, then synthesis into a single severity × effort rated report.

**Tech Stack:** pnpm + Vite + Vitest (web), uv + pytest (pipeline), Cloudflare Workers/wrangler (worker). No new runtime dependencies are installed anywhere in this plan.

**Spec:** `docs/superpowers/specs/2026-08-24-full-project-review-design.md`

## Global Constraints

- **Report-only:** No source file may be modified. The only writable paths are under `docs/superpowers/reviews/` and this plan file.
- **Branch:** All work happens on `audit/full-project-review`. Never touch `main`.
- **Package managers:** `pnpm` for JS (`web/`, never npm/yarn), `uv` for Python (`pipeline/`, never pip/venv directly).
- **Finding block format (canonical, used by every task):**

```markdown
### {AREA}-{NNN} | {severity} | {dimension} | {effort}
- **Location:** `{path}:{line}`
- **Evidence:** {quoted code or observed output proving the claim}
- **Why it matters:** {impact}
- **Suggested fix:** {concrete change}
- **Verified:** yes|no
```

- **AREA codes:** `WEB` (web app), `PIP` (pipeline), `WRK` (worker), `SEC` (security), `PRF` (performance), `A11Y` (accessibility), `TST` (test coverage). IDs zero-padded: `WEB-001`.
- **Severity scale (from spec):** Critical = data loss, security hole, crash · High = incorrect behavior, significant perf/a11y failure · Medium = code quality/maintainability · Low = polish/style.
- **Effort scale:** S (< 1h) / M (hours) / L (days).
- **Dimension names:** bugs, improvements, clean-code, solid, security, performance, accessibility, test-coverage.
- **Subagents are read-only researchers:** every dispatch prompt must state "Do NOT modify any files. Return findings as your final message."
- **Verification rule:** any finding marked Critical or High gets `Verified:` flipped to `yes` only after the executor personally re-reads the cited `path:line` and confirms it. False positives get deleted, not downgraded silently.
- **Parallelization:** Tasks 2–4 may run concurrently; Tasks 5–8 may run concurrently. Task 9 waits for all.

---

### Task 1: Phase 0 — Baseline automation and docs check

**Files:**
- Create: `docs/superpowers/reviews/phase0-baseline.md`

**Interfaces:**
- Consumes: repo state at `audit/full-project-review`.
- Produces: `phase0-baseline.md` containing raw recorded results (build warnings, test counts, audit output summaries, bundle sizes, doc discrepancies). Task 9 embeds this as the report appendix. No other task depends on its content.

- [ ] **Step 1: Run web build and tests**

Run: `pnpm build` (workdir `web/`)
Record: exit status, every Vite warning verbatim.
Expected: succeeds (per AGENTS.md this is the verification method — no linter configured).

Run: `pnpm test` (workdir `web/`)
Record: pass/fail counts, duration, any flaky or skipped tests.

- [ ] **Step 2: Run pipeline tests**

Run: `uv run pytest` (workdir `pipeline/`)
Record: pass/fail counts (AGENTS.md claims 45 tests — confirm actual number).

- [ ] **Step 3: Dependency audits**

Run: `pnpm audit` (workdir `web/`) — record vulnerabilities by severity, or "clean".
Run: `uv run --with pip-audit pip-audit` (workdir `pipeline/`) — ephemeral tool, does not touch `pyproject.toml`. Record findings or "clean".
Check whether `workers/tafsir-api/package.json` exists; if it has dependencies, run `pnpm audit` there too.

- [ ] **Step 4: Bundle size snapshot**

Run: `ls -la web/dist/assets/` (after Step 1's build)
Record: total JS/CSS shipped, largest chunks. Flag anything > 300 kB gzipped as a PRF candidate.

- [ ] **Step 5: Docs-vs-reality check**

Verify each AGENTS.md claim against reality:
1. Commands listed exist in `web/package.json` scripts (`build`, `dev`, `preview`, `copy-data`, `test`, `test:watch`).
2. Claimed paths exist: `web/src/components/`, `web/src/contexts/`, `web/src/utils/arabic.js`, `web/src/utils/tafsir.js`, `web/src/api/data.js`, `web/src/api/search.js`.
3. Test-count claims (33 web tests, 45 pipeline tests) match Step 1–2 output.
4. `VITE_DATA_BASE` fallback claim matches `web/src/api/data.js` behavior (read it).
Record each mismatch as a DOC finding (use AREA `WEB`, dimension `improvements`).

- [ ] **Step 6: Write and commit baseline**

Write `phase0-baseline.md` with sections: Build / Web Tests / Pipeline Tests / Dependency Audits / Bundle / Docs Check, raw outputs summarized per section.

```bash
git add docs/superpowers/reviews/phase0-baseline.md
git commit -m "audit: phase 0 baseline (build, tests, deps, bundle, docs)"
```

---

### Task 2: Web subsystem deep review

**Files:**
- Create: `docs/superpowers/reviews/findings/web.md`

**Interfaces:**
- Consumes: `web/src/**` source (read-only).
- Produces: `findings/web.md` with `WEB-*` finding blocks in canonical format. Task 9 consumes this file.

Dispatch ONE general subagent with this prompt (adjust nothing structural):

> You are a read-only code reviewer. Do NOT modify any files. Review the React app under `web/src/` (components/, contexts/, api/, utils/, App.jsx, main.jsx — ~1,550 LOC).
>
> Hunt for findings across these dimensions, in priority order:
> 1. **bugs**: incorrect logic, stale closures, wrong useEffect dependencies, missing error handling around fetch/localStorage, race conditions in DataContext/SearchContext, off-by-one in surah/ayah indexing (Quran has 114 surahs; ayah counts vary), broken RTL string handling in utils/arabic.js.
> 2. **clean-code**: duplication, dead code, oversized components (>150 lines), unclear naming, magic numbers.
> 3. **solid**: components doing data-fetching + rendering + persistence together; contexts mixing concerns; violations of single-responsibility/open-closed in FavoritesContext (localStorage + sync logic?) and ThemeContext.
> 4. **improvements**: product-level gaps you notice while reading (e.g., missing loading/error states, no virtualization hooks).
>
> Rules: cite exact `path:line` for every claim; quote the offending code as Evidence; skip anything you cannot substantiate; aim for real findings only, no filler. Rate each severity (Critical/High/Medium/Low) and effort (S/M/L) per the definitions below. Severity: Critical = crash/data loss/security hole; High = user-visible incorrectness; Medium = maintainability; Low = polish. Effort: S < 1h, M = hours, L = days.
>
> Return ALL findings in your final message using EXACTLY this block format per finding (IDs numbered sequentially starting WEB-001):
>
> ### WEB-{NNN} | {severity} | {dimension} | {effort}
> - **Location:** `{path}:{line}`
> - **Evidence:** {quoted code}
> - **Why it matters:** {impact}
> - **Suggested fix:** {concrete change}

- [ ] **Step 1: Dispatch the subagent** with the prompt above.

- [ ] **Step 2: Save findings** verbatim into `findings/web.md`.

- [ ] **Step 3: Verify Critical/High findings.** For each, open the cited file at the cited line. Confirm or delete. Set `Verified: yes` on confirmed ones. (Medium/Low stay `Verified: no` — spot-check at least two.)

- [ ] **Step 4: Commit.**

```bash
git add docs/superpowers/reviews/findings/web.md
git commit -m "audit: web subsystem findings"
```

---

### Task 3: Pipeline subsystem deep review

**Files:**
- Create: `docs/superpowers/reviews/findings/pipeline.md`

**Interfaces:**
- Consumes: `pipeline/src/**` source (read-only).
- Produces: `findings/pipeline.md` with `PIP-*` finding blocks. Task 9 consumes this file.

Dispatch ONE general subagent with this prompt:

> You are a read-only code reviewer. Do NOT modify any files. Review the Python scraper under `pipeline/src/` (config.py, main.py, quran/parser.py + fetcher.py, tafsir/{scraper,content_extractor,category_index,surah_index,lesson_parser}.py, merge/builder.py, media/mapper.py, utils/{cache,rate_limit,logging_setup}.py).
>
> Hunt for findings across these dimensions:
> 1. **bugs**: unhandled network errors / retries missing, rate-limiter bypassed on retry, parser edge cases (empty pages, missing elements, encoding), silent exception swallowing, cache poisoning/stale-cache bugs, off-by-one in surah/ayah loops (114 surahs), data validation gaps before merge/builder writes JSON.
> 2. **security**: secrets handling in config.py (hardcoded creds? env vars?), unsafe deserialization of scraped HTML, path traversal in cache/file writes.
> 3. **clean-code**: duplication across scrapers, dead code, functions >50 lines, inconsistent logging.
> 4. **solid**: god-modules (main.py doing orchestration + IO?), violation of dependency inversion between fetchers and parsers, config coupling.
> 5. **improvements**: resume/checkpoint capability for interrupted runs, idempotency of merge step.
>
> Rules: cite exact `path:line`; quote code as Evidence; no unsubstantiated claims, no filler. Severity: Critical = data corruption/crash/security hole; High = wrong data produced; Medium = maintainability; Low = polish. Effort: S < 1h, M = hours, L = days.
>
> Return ALL findings in your final message using EXACTLY this block format (IDs start PIP-001):
>
> ### PIP-{NNN} | {severity} | {dimension} | {effort}
> - **Location:** `{path}:{line}`
> - **Evidence:** {quoted code}
> - **Why it matters:** {impact}
> - **Suggested fix:** {concrete change}

- [ ] **Step 1: Dispatch the subagent** with the prompt above.

- [ ] **Step 2: Save findings** verbatim into `findings/pipeline.md`.

- [ ] **Step 3: Verify Critical/High findings** same protocol as Task 2 Step 3.

- [ ] **Step 4: Commit.**

```bash
git add docs/superpowers/reviews/findings/pipeline.md
git commit -m "audit: pipeline findings"
```

---

### Task 4: Worker subsystem deep review

**Files:**
- Create: `docs/superpowers/reviews/findings/worker.md`

**Interfaces:**
- Consumes: `workers/tafsir-api/src/index.js`, `src/schema.sql`, `wrangler.jsonc` (read-only).
- Produces: `findings/worker.md` with `WRK-*` finding blocks. Task 9 consumes this file.

Dispatch ONE general subagent with this prompt:

> You are a read-only code reviewer. Do NOT modify any files. Review the Cloudflare Worker API at `workers/tafsir-api/` (~122 LOC index.js, schema.sql, wrangler.jsonc). It provides D1 bookmarks + reading-progress sync for the web app.
>
> Hunt for findings:
> 1. **security**: authentication/authorization on write endpoints (can anyone overwrite another user's bookmarks? how are users identified — device token? none?), SQL injection (are D1 queries parameterized?), CORS configuration (over- or under-permissive), information leaks in error responses, missing rate limiting.
> 2. **bugs**: missing input validation (JSON body parsing, array bounds, type coercion), unhandled promise rejections, incorrect HTTP status codes, race conditions on upserts, migration/schema mismatches between schema.sql and query column names.
> 3. **solid/clean-code**: handler duplication, mixed transport/domain logic, magic strings for routes.
> 4. **improvements**: pagination, batch endpoints, observability (logging/analytics).
>
> Rules: cite exact `path:line`; quote code as Evidence; no filler. Severity: Critical = auth bypass/injection/data loss; High = incorrect responses/validation gaps; Medium = maintainability; Low = polish. Effort: S < 1h, M = hours, L = days.
>
> Return ALL findings in your final message using EXACTLY this block format (IDs start WRK-001):
>
> ### WRK-{NNN} | {severity} | {dimension} | {effort}
> - **Location:** `{path}:{line}`
> - **Evidence:** {quoted code}
> - **Why it matters:** {impact}
> - **Suggested fix:** {concrete change}

- [ ] **Step 1: Dispatch the subagent** with the prompt above.

- [ ] **Step 2: Save findings** verbatim into `findings/worker.md`.

- [ ] **Step 3: Verify Critical/High findings** same protocol as Task 2 Step 3.

- [ ] **Step 4: Commit.**

```bash
git add docs/superpowers/reviews/findings/worker.md
git commit -m "audit: worker findings"
```

---

### Task 5: Cross-cutting security audit

**Files:**
- Create: `docs/superpowers/reviews/findings/security.md`

**Interfaces:**
- Consumes: whole repo (read-only), especially tafsir HTML rendering path (`web/src/components/TafsirText.jsx`, `AyahCard.jsx`) and deploy config.
- Produces: `findings/security.md` with `SEC-*` finding blocks. Task 9 consumes this file.

Dispatch ONE general subagent with this prompt:

> You are a read-only security auditor. Do NOT modify any files. Audit this repo (React tafsir reader + Python scraper + Cloudflare Worker).
>
> Focus areas:
> 1. **XSS surfaces**: find every use of `dangerouslySetInnerHTML` / innerHTML in `web/src/`. Trace tafsir HTML from `pipeline/` extraction through R2 JSON to render — is it sanitized anywhere? Quote the full chain with file:line.
> 2. **Secrets**: grep for hardcoded keys/tokens across all configs (`wrangler.jsonc`, `.env*`, `scripts/upload_to_r2.py`, pipeline config); check `.gitignore` coverage; check git history for committed secrets (`git log -p -- .env wrangler.jsonc scripts/ | grep -iE 'key|secret|token'` style search — read-only).
> 3. **CSP/headers**: any Content-Security-Policy definition (recent commits mention a CSP placeholder)? Missing headers on GitHub Pages deployment?
> 4. **R2/CORS assumptions**: how `web/src/api/data.js` builds URLs; implications of public-read bucket.
> 5. **Supply chain**: unpinned or suspicious dependencies in both package.json and pyproject.toml.
>
> Rules: cite `path:line`; quote code; rate exploitability honestly (Critical = exploitable XSS/auth bypass/leaked secret; High = missing defense-in-depth on user input paths; Medium/Low = hygiene). No filler findings.
>
> Return ALL findings using EXACTLY this block format (IDs start SEC-001):
>
> ### SEC-{NNN} | {severity} | security | {effort}
> - **Location:** `{path}:{line}`
> - **Evidence:** {quoted code}
> - **Why it matters:** {attack scenario}
> - **Suggested fix:** {concrete mitigation}

- [ ] **Step 1: Dispatch the subagent** with the prompt above.

- [ ] **Step 2: Save findings** into `findings/security.md`.

- [ ] **Step 3: Verify ALL findings** (security claims get 100% verification, not just Critical/High): re-read each cited location, confirm the attack chain is real end-to-end, adjust severity if overstated, set `Verified: yes`.

- [ ] **Step 4: Commit.**

```bash
git add docs/superpowers/reviews/findings/security.md
git commit -m "audit: security findings"
```

---

### Task 6: Cross-cutting performance audit

**Files:**
- Create: `docs/superpowers/reviews/findings/performance.md`

**Interfaces:**
- Consumes: `web/src/api/data.js`, DataContext, SurahList/SurahView render paths, Phase 0 bundle sizes (workdir `web/dist/` if present).
- Produces: `findings/performance.md` with `PRF-*` finding blocks. Task 9 consumes this file.

Dispatch ONE general subagent with this prompt:

> You are a read-only performance auditor. Do NOT modify any files. Audit the web app's data-loading and rendering strategy.
>
> Known constraint: tafsir dataset totals ~388MB of JSON served from R2 (or `/data` locally). Determine precisely:
> 1. What `web/src/api/data.js` fetches and when (whole-surah files? everything upfront? on route change?). Quote the loading code with file:line.
> 2. Whether DataContext caches/dedupes fetches or refetches on remount; whether surah lists load all metadata eagerly.
> 3. Render performance: SurahList renders 114 items — any list virtualization or memoization? SurahView with long tafsir (Al-Baqarah ≈ 6k ayahs with commentary) — re-render hazards, missing memo/useMemo/useCallback, keys on large lists.
> 4. Caching: HTTP caching assumptions for R2 (long max-age noted in AGENTS.md) vs client-side cache-busting; service worker absence.
> 5. Bundle: React Router + all components in initial chunk? Code-splitting opportunities (quote import graph evidence).
> 6. Images/fonts: font loading strategy (Noto Naskh Arabic — subsetted? swap strategy?).
>
> Rules: cite `path:line`; quote code; quantify impact where possible (e.g., "~388MB fetched on first visit if X"). Severity: Critical = unusable first load; High = major avoidable cost (multi-MB fetches, jank on common interactions); Medium = measurable waste; Low = micro. Effort: S/M/L. Only real findings.
>
> Return ALL findings using EXACTLY this block format (IDs start PRF-001):
>
> ### PRF-{NNN} | {severity} | performance | {effort}
> - **Location:** `{path}:{line}`
> - **Evidence:** {quoted code}
> - **Why it matters:** {quantified impact}
> - **Suggested fix:** {concrete change}

- [ ] **Step 1: Dispatch the subagent** with the prompt above.

- [ ] **Step 2: Save findings** into `findings/performance.md`.

- [ ] **Step 3: Verify Critical/High findings** per global rule; additionally sanity-check quantified claims against actual file sizes (`ls pipeline/output/*.json` if present locally, else note "sizes from AGENTS.md").

- [ ] **Step 4: Commit.**

```bash
git add docs/superpowers/reviews/findings/performance.md
git commit -m "audit: performance findings"
```

---

### Task 7: Cross-cutting accessibility audit

**Files:**
- Create: `docs/superpowers/reviews/findings/accessibility.md`

**Interfaces:**
- Consumes: `web/src/components/**`, `web/index.html`, `index.css` theme variables.
- Produces: `findings/accessibility.md` with `A11Y-*` finding blocks. Task 9 consumes this file.

Dispatch ONE general subagent with this prompt:

> You are a read-only accessibility auditor. Do NOT modify any files. Audit the React app in `web/src/` (fully Arabic RTL Quran reader, themes: light/dark/sepia via CSS custom properties + `data-theme`).
>
> Check:
> 1. **Semantics**: heading hierarchy (App.jsx → Layout.jsx → SurahView.jsx), landmark regions (nav/main), list semantics in SurahList.jsx, button vs link usage in SearchBar.jsx / ThemeToggle.jsx / AyahCard.jsx actions.
> 2. **RTL correctness**: `dir="rtl"` placement, logical CSS properties vs physical (margin-left/right in index.css), bidi isolation when Arabic numerals/latin appear inside Arabic text (utils/arabic.js toArabicNum usage).
> 3. **Keyboard**: focus visibility (outline styles in themes), tab order through interactive ayah cards, favorite toggles reachable and labeled, SearchBar submit via Enter, Escape closing any overlays, focus trapped/restored appropriately.
> 4. **Screen readers**: aria-labels on icon-only buttons (ThemeToggle, favorites heart), alt/aria-hidden on decorative elements (BismillahHeader ornamentation), live regions for loading states (Spinner/StateMessage announcements).
> 5. **Contrast**: read the three theme palettes in index.css custom properties; flag any text/background pair likely below WCAG AA 4.5:1 (estimate ratios from hex values, state them explicitly).
>
> Rules: cite `path:line` (CSS selectors count — quote the selector); no filler; rate by impact on real users. Severity: Critical = app unusable with keyboard/SR; High = major barrier (unlabeled icon-only controls, contrast fails on primary text); Medium = friction; Low = polish. Effort: S/M/L.
>
> Return ALL findings using EXACTLY this block format (IDs start A11Y-001):
>
> ### A11Y-{NNN} | {severity} | accessibility | {effort}
> - **Location:** `{path}:{line}`
> - **Evidence:** {quoted markup/css}
> - **Why it matters:** {affected user group + scenario}
> - **Suggested fix:** {concrete change}

- [ ] **Step 1: Dispatch the subagent** with the prompt above.

- [ ] **Step 2: Save findings** into `findings/accessibility.md`.

- [ ] **Step 3: Verify Critical/High findings** per global rule; for contrast claims, recompute at least two ratios yourself from the hex values.

- [ ] **Step 4: Commit.**

```bash
git add docs/superpowers/reviews/findings/accessibility.md
git commit -m "audit: accessibility findings"
```

---

### Task 8: Test coverage gap analysis

**Files:**
- Create: `docs/superpowers/reviews/findings/test-coverage.md`

**Interfaces:**
- Consumes: existing tests (`web/src/**/*.test.{js,jsx}`, `App.integration.test.jsx`, `pipeline/tests/**`) and their subjects.
- Produces: `findings/test-coverage.md` with `TST-*` finding blocks. Task 9 consumes this file.

Dispatch ONE general subagent with this prompt:

> You are a read-only test-coverage analyst. Do NOT modify any files. Map tested vs untested code and identify the highest-risk gaps.
>
> Inventory first — list every source module and whether a test file covers it:
> - `web/src/`: tested today are arabic.js, tafsir.js, search.js, FavoritesContext, ThemeContext, SurahView, App routing/integration. UNTested (verify): api/data.js, api/worker.js, contexts/DataContext.jsx, contexts/SearchContext.jsx, most components (AyahCard, SearchBar, SurahList, Layout, ErrorBoundary, TafsirText, BismillahHeader, StateMessage, NotFound).
> - `pipeline/tests/`: enumerate which src modules have direct tests vs none.
> - `workers/tafsir-api/`: check for ANY test file.
>
> Then produce findings ONLY where the gap is risky, ranked by risk:
> 1. Untested modules with complex logic or user-facing failure modes (e.g., DataContext fetch/error handling, worker input validation, tafsir content_extractor parsing edge cases).
> 2. Existing tests that assert too little (snapshot-only, happy-path-only) — quote the weak assertion.
> 3. Untested error paths that already bit the project (git log shows fixes like "prevent app crash on theme save in private browsing", "merge favorites on sync instead of overwriting" — check regression tests exist for these).
>
> For each finding propose the concrete test cases needed (describe cases, e.g., "fetch rejection → error state rendered"; do NOT write full test code).
>
> Severity: Critical = no tests on auth/data-integrity code; High = no tests on complex core logic; Medium = weak/happy-path-only suites; Low = minor gaps. Effort: S/M/L. Dimension tag: `test-coverage`.
>
> Return ALL findings using EXACTLY this block format (IDs start TST-001):
>
> ### TST-{NNN} | {severity} | test-coverage | {effort}
> - **Location:** `{path}` (module lacking coverage) or `{test path}:{line}` (weak assertion)
> - **Evidence:** {what is/isn't asserted, quoted}
> - **Why it matters:** {failure mode that would ship undetected}
> - **Suggested fix:** {specific test cases to add}

- [ ] **Step 1: Dispatch the subagent** with the prompt above.

- [ ] **Step 2: Save findings** into `findings/test-coverage.md`.

- [ ] **Step 3: Verify Critical/High findings** per global rule (confirm the module truly has no test coverage via glob/grep).

- [ ] **Step 4: Commit.**

```bash
git add docs/superpowers/reviews/findings/test-coverage.md
git commit -m "audit: test coverage findings"
```

---

### Task 9: Synthesis — final report

**Files:**
- Create: `docs/superpowers/reviews/2026-08-24-full-project-review-report.md`

**Interfaces:**
- Consumes: all seven findings files (`findings/*.md`) + `phase0-baseline.md`.
- Produces: the final deliverable report. Nothing downstream.

- [ ] **Step 1: Merge and deduplicate.** Collect every finding block from all seven files. Drop duplicates (same root cause found by multiple agents — keep the best-evidenced copy, note cross-references). Expected pool: roughly 20–60 findings; if far outside that range, re-check for filler before proceeding.

- [ ] **Step 2: Rate and order.** Sort by severity, then effort (quick wins first within severity). Build the summary table:

```markdown
| ID | Sev | Dimension | Subsystem | Location | Effort |
|----|-----|-----------|-----------|----------|--------|
```

- [ ] **Step 3: Write the report** with exactly these sections (per spec):
   1. **Executive summary** — counts by severity, top 5 risks in plain language.
   2. **Findings table** (from Step 2).
   3. **Detailed findings** grouped Critical → Low, canonical block format preserved.
   4. **Recommended fix order** — quick wins (High sev + S effort) → structural (L effort) → polish; explicitly defer anything requiring product decisions.
   5. **Appendix** — Phase 0 baseline results (embed from `phase0-baseline.md`).

- [ ] **Step 4: Self-check against spec success criteria:**
   - Every subsystem (web/pipeline/worker) × every dimension has explicit coverage — add a "clean" note for any combination with zero findings.
   - Every Critical/High has `Verified: yes`.
   - Every finding cites `path:line`.
   Fix any failures before committing.

- [ ] **Step 5: Commit.**

```bash
git add docs/superpowers/reviews/2026-08-24-full-project-review-report.md
git commit -m "audit: full project review report"
```

---

### Task 10: Wrap-up — handoff to fix planning

**Files:**
- Modify: none (verification + handoff only)

**Interfaces:**
- Consumes: final report from Task 9.
- Produces: user decision on Phase 4 fix planning (out of scope of this plan).

- [ ] **Step 1: Final verification.** Run `pnpm test` (workdir `web/`) and `uv run pytest` (workdir `pipeline/`) one last time to confirm the audit changed nothing behavioral. Expected: same counts as Phase 0.

- [ ] **Step 2: Present the executive summary to the user** (top risks + counts inline in chat, full report path referenced) and ask whether to proceed to Phase 4 fix planning (a separate brainstorming → plan cycle, per spec).

- [ ] **Step 3: Stop.** Per the spec, fixing is a separate approved effort. Do not begin fixes regardless of how tempting findings look.
