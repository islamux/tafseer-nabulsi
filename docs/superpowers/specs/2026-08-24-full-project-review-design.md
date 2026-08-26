# Full Project Review — Design

- **Date:** 2026-08-24
- **Status:** Approved design (Approach A: hybrid automated + subagent audit)
- **Deliverable:** A prioritized findings report. Report-only — no code changes in this effort.

## Goal

Comprehensively audit the tafseer-nabulsi project and produce a single findings report rated by severity and effort, covering bugs, improvements, enhancements, clean code, SOLID principles, security, performance, accessibility, and test coverage across all three subsystems.

## Scope

| Subsystem | Contents | Approx. size |
|---|---|---|
| `web/` | React 19 + Vite app: components, contexts, api, utils, tests | ~1,550 LOC |
| `pipeline/` | Python scraper (uv): quran fetcher/parser, tafsir scraper, merge builder, utils | ~20 modules |
| `workers/tafsir-api/` | Cloudflare Worker (JS) + D1 schema | ~122 LOC JS |
| Config & docs | `wrangler.jsonc`, Vite config, AGENTS.md accuracy, CI workflows | — |

Out of scope for this review: implementing fixes (separate follow-up), re-running the scraping pipeline against live sites end-to-end, deploying anything.

## Dimensions

1. Bugs / correctness
2. Improvements & enhancements (product-level)
3. Clean code (naming, duplication, dead code, function size)
4. SOLID principles
5. Security (XSS via tafsir HTML, secrets handling, CSP, Worker API auth, CORS)
6. Performance (388MB dataset loading strategy, caching, bundle size)
7. Accessibility (RTL correctness, keyboard nav, screen readers, contrast)
8. Test coverage gaps

## Execution Approach

Hybrid: automation first for cheap signal, focused subagents for deep reading, synthesis into one report.

### Phase 0 — Baseline automation

Run and record results:

- `pnpm build` in `web/` (must succeed; warnings noted as findings)
- `pnpm test` in `web/` (vitest suite)
- `uv run pytest` in `pipeline/`
- Dependency audits (`pnpm audit`, pip/uv equivalent)
- Production bundle analysis (`vite build` output sizes, chunk breakdown)
- Docs-vs-reality check of AGENTS.md / README claims

### Phase 1 — Per-subsystem deep review

Dispatch one general subagent per subsystem with a structured prompt; each returns findings in a fixed format:

```
[subsystem] [dimension] [severity] file:line
Description (evidence-based), suggested fix, effort estimate
```

- **Web agent**: all components, contexts, api, utils; React patterns (effect deps, memoization, key usage), state management, error boundaries, RTL/theming implementation.
- **Pipeline agent**: scraper robustness (network errors, rate limits, retries), parser edge cases, data validation before merge, config/secrets handling.
- **Worker agent**: D1 query safety (injection), auth on write endpoints, CORS, error responses, schema.sql indexes/constraints.

Every critical/high finding is then verified by me directly against the source before entering the report (subagents can produce false positives).

### Phase 2 — Cross-cutting audits

Dispatch dimension-focused agents over the whole repo where subsystem agents lack depth:

- **Security agent**: XSS surfaces (`dangerouslySetInnerHTML` on tafsir text), secret leakage in git history/config, CSP headers, R2 CORS policy assumptions, Worker endpoint abuse.
- **Performance agent**: data loading strategy (full JSON vs per-surah lazy fetch), caching headers, render performance on long surah lists, virtualization opportunities.
- **Accessibility agent**: semantic HTML, ARIA usage, focus management, keyboard navigation, contrast across light/dark/sepia themes.
- **Test coverage agent**: map tested vs untested modules; identify highest-risk untested logic (e.g., tafsir.js utils, worker handlers, pipeline parsers).

### Phase 3 — Synthesis

Merge, deduplicate, verify, and rate all findings into:

`docs/superpowers/reviews/2026-08-24-full-project-review-report.md`

Structure:

1. Executive summary (counts by severity, top risks)
2. Findings table: severity × dimension × subsystem × effort (S/M/L)
3. Detailed findings grouped by severity, each with evidence (`file:line`) and suggested fix
4. Recommended fix order (quick wins → structural)

Severity scale: **Critical** (data loss, security hole, crash) / **High** (incorrect behavior, significant perf/a11y failure) / **Medium** (code quality, maintainability) / **Low** (polish, style).

### Phase 4 — Fix planning (separate effort)

After the user reviews the report, a separate approved plan addresses chosen fixes. Not part of this review.

## Risks & Mitigations

- Subagent false positives → manual verification of critical/high findings
- `web/public/data/` may be absent locally (gitignored) → rely on code reading for perf; run `pnpm copy-data` only if runtime probing is needed
- Flaky network-dependent tests → note as findings, don't block the audit
- Token cost of parallel agents → bounded prompts, fixed output format

## Success Criteria

- Every subsystem × every dimension has explicit coverage (even if the finding is "clean")
- Each finding cites concrete evidence (`file:line`)
- No unverified Critical/High claims in the final report
- Both test suites and build results recorded in Phase 0 appendix
