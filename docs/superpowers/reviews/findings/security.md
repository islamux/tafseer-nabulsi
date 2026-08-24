# Cross-Cutting Security Findings (SEC)

Read-only security audit of the whole repo (React tafsir reader + Python scraper + Cloudflare Worker + deploy/config surface).
Recorded: 2026-08-24 · Branch: `audit/full-project-review` · HEAD: `9c5be15`
Method: full-chain XSS trace (`pipeline/` extraction → R2 JSON → `web/src/` render), secrets sweep of tracked files **and** full git history, CSP/header analysis incl. inspection of the deployed `origin/gh-pages` artifact, R2/CORS assumption review, dependency-manifest + lockfile review.

Severity: Critical = exploitable XSS/auth bypass/leaked secret · High = missing defense-in-depth on user-input paths · Medium/Low = hygiene.
Effort: S < 1h · M = hours · L = days.

**Totals: 5 findings — 0 Critical · 0 High · 2 Medium · 3 Low.**

Known issues intentionally **not** re-filed here (cross-referenced instead): device-ID-as-bearer-credential auth model → WRK-001 (with WRK-002/003/004/009 as adjacent gaps); unauthenticated/unthrottled public API → WRK-004; pickle deserialization in the HTTP cache → PIP-006; empty `database_id` placeholder in wrangler.jsonc → WRK-011.

### SEC-001 | Medium | security | M
- **Location:** `web/public/_headers:1`
- **Evidence:**
  ```
  /assets/*
    Cache-Control: public, max-age=31536000, immutable
  ```
  Deployed tree check: `git ls-tree -r --name-only origin/gh-pages` returns only `404.html`, `assets/*`, `index.html`, `robots.txt`, `sitemap.xml` — `_headers` (and `.nojekyll`) are absent.
- **Why it matters:** `_headers` is a Cloudflare Pages convention; GitHub Pages ignores it entirely, so it is dead config on the actual hosting target. The live deployment therefore ships **no** `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, or `Permissions-Policy`. The `<meta>` CSP (`web/index.html:5`) backstops script/style injection but cannot set `frame-ancestors` (ignored inside `<meta>` per spec) or `nosniff`, so the app remains framable by third parties (clickjacking overlay on UI buttons — low impact since state changes are local-only) and relies on GitHub's default MIME handling. No `.nojekyll` on `gh-pages` either: harmless today because no deployed filename starts with `_`, but the first future deploy that includes `public/data/` (local-dev parity) would silently 404 on `data/_index.json` under Jekyll processing.
- **Suggested fix:** Either move hosting to Cloudflare Pages (where `_headers` works and security headers can be set properly), or accept and document the GH Pages limitation and add a `.nojekyll` to the `gh-pages` deploy procedure plus a meta-equivalent `<meta name="referrer" ...>`. Delete or relocate the inert `_headers` file so it stops implying protection it cannot deliver.
- **Verified:** yes — re-read `_headers`; confirmed absence from `origin/gh-pages` tree; confirmed meta CSP carries no `frame-ancestors`.

### SEC-002 | Low | security | S
- **Location:** `web/index.html:5`
- **Evidence:**
  ```html
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'sha256-F34KCvfpvTILvJKlqtrSp8+UXiEHmsuZG77bEOUcrSs='; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev __CSP_API_ORIGIN__; img-src 'self' data:; base-uri 'self'; form-action 'self';" />
  ```
- **Why it matters:** The script policy is strong (self + one exact inline hash; hash recomputed against the theme-bootstrap script and confirmed matching), but hardening gaps remain: `style-src 'unsafe-inline'` allows arbitrary inline `<style>`/style attributes (CSS-based data exfiltration would be possible *if* an HTML-injection primitive ever appears); no explicit `object-src` (falls back to `default-src 'self'`, permitting same-origin `<object>`/`<embed>`); `worker-src`/`manifest-src` unspecified. Since the primary XSS defense here is React escaping + this CSP, tightening costs little.
- **Suggested fix:** Add `object-src 'none'`; move inline style attributes to classes where feasible long-term, else accept `'unsafe-inline'` for styles knowingly; consider `require-trusted-types-for 'script'` once browser support in the user base allows.
- **Verified:** yes — re-read `index.html:5`; sha256 recomputed locally: `F34KCvfpvTILvJKlqtrSp8+UXiEHmsuZG77bEOUcrSs=` matches exactly; no other inline scripts exist in the template.

### SEC-003 | Medium | security | S
- **Location:** `web/src/api/data.js:4`
- **Evidence:**
  ```js
  const DATA_BASE = import.meta.env.VITE_DATA_BASE || (import.meta.env.DEV ? '/data' : 'https://pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data')
  ```
  Live-artifact check: `git show origin/gh-pages:assets/index-C_xIwzGP.js` contains `pub-9f6e4a5270114d09a4eb9cdee8e9f840.r2.dev/data` and no `workers.dev` string; deployed CSP connect-src reads `... https://pub-9f6e....r2.dev ;` (placeholder substituted empty). Contrast `web/.env.example:6`: “UNSET (default): falls back to `/data`”.
- **Why it matters:** The production data origin is hardcoded in source as a fallback, and the actual live deployment was built **without** `VITE_DATA_BASE`/`VITE_API_BASE` (contradicting the documented deploy steps in `AGENTS.md`). Consequences: (1) the delivery chain's integrity/confidentiality assumptions depend on a source-code constant rather than environment config — any fork/rebuild silently reads from (and attributes traffic/quota cost to) the author's R2 bucket; (2) the CSP `connect-src` is welded to that same hardcoded origin in two places, so migrating buckets requires synchronized edits to `data.js` **and** `index.html` or sync breaks silently; (3) docs claim the prod fallback is `/data`, masking the real behavior; (4) the Worker API is silently disabled in the live build (no `VITE_API_BASE` baked, no connect-src entry) — bookmark sync is dead in production without any error surfaced.
- **Suggested fix:** Fail the production build loudly when `VITE_DATA_BASE`/`VITE_API_BASE` are unset (throw in `vite.config.js` or a build-time check), remove the hardcoded R2 URL from source, and align `.env.example`/AGENTS.md wording with actual behavior. Optionally derive the CSP data origin from the same single env var at build time (it already does this for the API origin — extend the pattern).
- **Verified:** yes — re-read `data.js:4`; grepped deployed `gh-pages` JS bundles (hardcoded R2 URL present, no Worker URL); compared substituted CSP in `origin/gh-pages:index.html`; cross-checked `.env.example:6` claim.

### SEC-004 | Low | security | S
- **Location:** `docs/r2-migration-summary.md:34`
- **Evidence:**
  ```
  | Account ID | `5c651e4916c8b8c31ba4f5b11ec7862b` |
  ```
  Also embedded in command examples at `docs/r2-migration-summary.md:59` and `docs/superpowers/plans/2026-07-19-host-tafsir-data-on-r2.md:143`.
- **Why it matters:** The Cloudflare **account ID** is committed to the repo. Full-history sweep confirms it entered via commits `ef89701`/`f7097cc` while `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` were always `...` placeholders — so **no credential ever leaked**, and Cloudflare treats account IDs as non-secret identifiers (they appear in API endpoint URLs). Residual risk is information disclosure that facilitates targeted phishing/social-engineering against the account, plus permanent exposure even after repo cleanup due to git history.
- **Suggested fix:** Replace the literal with `<your-account-id>` placeholders in both docs (history will retain it until a history rewrite or repo archival decision is made separately); no rotation required.
- **Verified:** yes — `git log --all -p -S` traced introduction commits; confirmed key material alongside it was always placeholder text; swept entire history for `AKIA…`/`ghp_…`/`sk-…`/PEM blocks/API-token patterns with no hits.

### SEC-005 | Low | security | S
- **Location:** `scripts/upload_to_r2.py:5`
- **Evidence:**
  ```
  uv run --with boto3 scripts/upload_to_r2.py
  ```
  with `pipeline/pyproject.toml:7-12` declaring only `beautifulsoup4`, `lxml`, `pytest`, `requests` — boto3 is absent from the project's locked dependency set. Similarly, documented deploy commands invoke `npx wrangler …` (AGENTS.md, workers runbook) with no version pin.
- **Why it matters:** Both invocations execute privileged code paths carrying cloud credentials (R2 secret keys; Wrangler OAuth/deploy rights) but resolve their toolchain **at run time**, bypassing the committed `uv.lock`/`pnpm-lock.yaml`. A compromised or maliciously repurposed release of boto3 (or the wrangler package pulled by `npx`'s floating resolution) would be auto-installed and immediately handed production secrets on the next routine upload/deploy. This is the classic supply-chain gap: reproducible app deps, ephemeral credentialed tooling.
- **Suggested fix:** Add `boto3` to `pipeline/pyproject.toml` dependencies (so it lands in `uv.lock`) and drop `--with`; pin wrangler (`npx wrangler@<pinned-version>` or add it to a package.json devDependency) and upgrade deliberately.
- **Verified:** yes — re-read `pyproject.toml` (no boto3) and `upload_to_r2.py` usage strings; confirmed `pipeline/uv.lock` contains 35 locked packages none named boto3; confirmed AGENTS.md documents unpinned `npx wrangler` usage.

---

## Checked and clean

- **XSS chain, end-to-end**: tafsir HTML is stripped at extraction time — `content_div.get_text(separator="\n", strip=True)` (`pipeline/src/tafsir/scraper.py:96`, fallbacks :100-103) — so published JSON contains plain text, never markup. Render side: **zero** occurrences of `dangerouslySetInnerHTML`/`innerHTML`/`insertAdjacentHTML`/`document.write`/`eval`/`new Function` anywhere under `web/` (grep-verified, including tests). Every dynamic value — ayah text, tafsir body, search query, error messages, surah names — renders as React text children (auto-escaped): `AyahCard.jsx:28-33`, `TafsirText.jsx:15`, `SearchBar.jsx:72,93`, `SurahList.jsx:70`, `ErrorBoundary.jsx` message. Even if hostile markup reached the dataset, it would display as text, and the strict script CSP (self + single verified hash) is a working last-line backstop. No exploitable XSS found.
- **Route-parameter injection**: `/surah/:id` is `parseInt(id, 10)` then bounds-checked `1–114` (`SurahView.jsx:12,16,26`) before any fetch URL is assembled — no path traversal into `DATA_BASE`.
- **Secrets in tracked files/history**: no hardcoded keys/tokens in any tracked config (`wrangler.jsonc` has only an empty `database_id` placeholder; `.env.example` values are blank; pipeline config has none). `web/.env` is properly gitignored (verified via `git check-ignore -v`) and was never committed. Full `git log --all -p` sweeps for AWS/GitHub/OpenAI token shapes, PEM blocks, and assignment patterns found only documentation placeholders (see SEC-004).
- **CSP integrity**: the single inline script (theme bootstrap, `web/index.html:14`) is pinned by exact sha256; recomputed hash matches byte-for-byte. Build-time substitution of `__CSP_API_ORIGIN__` (`web/vite.config.js:13-21`) degrades gracefully to removal when unset.
- **R2/CORS posture**: bucket is public-read by design (public-domain religious texts, no PII); runbook CORS restricts methods to GET/HEAD for `islamux.github.io` + `localhost:5173`; client fetches are read-only with timeout+abort (`data.js:7-22`).
- **Dependency inventory**: npm deps are mainstream (`react`, `react-dom`, `react-router-dom`, `vite`, `vitest`, `tailwindcss`, testing-library, `jsdom`, `postcss`, `autoprefixer`); Python deps likewise (`beautifulsoup4`, `lxml`, `requests`, `pytest`); both lockfiles (`pnpm-lock.yaml`, `uv.lock`) are committed. No suspicious/typo-squat packages identified. (No CI workflows exist, hence no third-party GitHub Action supply-chain surface either.)
- **SPA 404 redirect** (`web/public/404.html:6-17`): uses `location.replace()` URL assembly only — no DOM injection sink; standard GH Pages pattern.

## Verification appendix (all findings)

| ID | Re-checked citation | Outcome |
|----|---------------------|---------|
| SEC-001 | `_headers:1-2` content; `git ls-tree origin/gh-pages` lacks `_headers` and `.nojekyll`; meta CSP has no `frame-ancestors` | Verified: yes |
| SEC-002 | `index.html:5` directives; sha256 recomputation matched; no second inline script | Verified: yes |
| SEC-003 | `data.js:4`; deployed bundle contains hardcoded R2 URL and no Worker host; deployed CSP connect-src placeholder emptied; `.env.example:6` contradicts actual fallback | Verified: yes |
| SEC-004 | `docs/r2-migration-summary.md:34,59`; plans doc :143; history `-S` trace shows keys were always placeholders | Verified: yes |
| SEC-005 | `upload_to_r2.py:5`; `pyproject.toml:7-12` omits boto3; `uv.lock` lacks boto3; AGENTS.md unpinned `npx wrangler` | Verified: yes |

False positives investigated and dropped during review: “tafsir_long may contain raw HTML rendered unsafely” (disproven — tags stripped in pipeline, escaped in render, CSP backstop); “route param enables arbitrary fetch/path traversal” (disproven — parseInt + 1–114 gate precedes URL construction); “localStorage theme value → DOM XSS” (disproven — `setAttribute('data-theme', …)` cannot execute); “404.html redirect reflects attacker input into DOM” (disproven — `location.replace` only, no innerHTML/document.write); “deployed CSP breaks Worker calls in production” (reclassified — no Worker URL is baked into the deployed bundle, so nothing is blocked; captured as part of SEC-003's silent-disable observation instead of a broken-CSP finding).
