# Accessibility Findings (Cross-Cutting)

Read-only accessibility audit of the React app in `web/` (Arabic RTL Quran reader; themes light/dark/sepia via CSS custom properties + `data-theme`). Scope: semantics, RTL correctness, keyboard, screen readers, contrast across all three themes.
Recorded: 2026-08-25 · Branch: `audit/full-project-review` · HEAD: `6462a70`
Method: every component under `web/src/components/`, `App.jsx`, `index.html`, `index.css`, theme/context sources read in full; WCAG ratios recomputed from the actual hex values in `index.css` (see "Contrast computations" below).

Severity: Critical = app unusable with keyboard/SR · High = major barrier (unlabeled icon-only controls, contrast fails on primary text) · Medium = friction · Low = polish.
Effort: S < 1h · M = hours · L = days.

**Totals:** 12 findings — 0 Critical · 2 High · 6 Medium · 4 Low.
By dimension: all `accessibility`.

Cross-reference: no overlap found with existing `WEB-*` / `PIP-*` / `WRK-*` findings (those cover bugs/clean-code/security/performance dimensions); all IDs below are genuinely uncovered.

Not filed (checked and passing): keyboard operability end-to-end (all controls are native button/link/input; Enter submits search at `SearchBar.jsx:26-28`; no overlays exist so no Escape/focus-trap obligations arise); visible input focus outline survives Tailwind's `outline-none` because `input:focus` (`index.css:86-89`, specificity 0-1-1) beats `.outline-none` (0-1-0), and the accent outline clears WCAG 1.4.11 non-text contrast in all three themes (≥4.3:1 vs adjacent backgrounds); `<html lang="ar" dir="rtl">` correct (`index.html:2`); viewport meta allows zoom (no `maximum-scale`) `index.html:6`; `Spinner.jsx:5-6` is an exemplary live region (`role="status"` + `aria-live="polite"` + `sr-only` label, decorative glyph `aria-hidden`); `ThemeToggle.jsx:21-29` labels its icon-only control correctly (`aria-label`, children `aria-hidden`); react-router `NavLink` sets `aria-current="page"` automatically; BismillahHeader is meaningful text (correctly *not* hidden), and the only ornament (`SurahView.jsx:115-118` divider div) is empty and ignored by AT.

### A11Y-001 | High | accessibility | S
- **Location:** `web/src/index.css:47`
- **Evidence:** In `[data-theme="dark"]`: `--text-on-accent: #f0fdfb;` consumed by `.badge-accent { background-color: var(--accent); color: var(--text-on-accent); }` (`index.css:12-15`) against `--accent: #4db6ac;` (`index.css:45`). Used at small sizes for primary UI: ayah-number circle (`AyahCard.jsx:38`, `text-xs`), active nav pill (`Layout.jsx:21`), search submit button (`SearchBar.jsx:49`), year badge (`AyahCard.jsx:64`), تفسير badge (`SurahList.jsx:83`), retry/home buttons (`SurahList.jsx:26`, `NotFound.jsx:13`, `ErrorBoundary.jsx:22`).
- **Why it matters:** Recomputed ratio **#f0fdfb on #4db6ac = 2.34:1** — fails WCAG AA 4.5:1 for normal text *and* even the 3:1 large-text threshold. Every dark-theme user gets near-illegible ayah numbers inside the verse line, the active navigation state, and all primary action buttons. Low-vision users reading at night (dark theme's core audience) are most affected.
- **Suggested fix:** Darken dark-theme accent toward the light-theme hue family (e.g. keep text-on-accent white-ish but use a deeper teal such as `#00695c`–`#00796b` for badge backgrounds, or switch badges to tinted style: `color: var(--accent)` on `--hover-bg`), then recompute ≥4.5:1.
- **Verified:** yes

### A11Y-002 | High | accessibility | M
- **Location:** `web/src/index.css:30`
- **Evidence:** Light theme `--accent: #00897b` (`:root`, `index.css:25-38`) used as text via `.text-accent { color: var(--accent); }` on white `--bg-primary: #ffffff` and gray `--bg-secondary: #f5f5f5` (`.input-style`, header). Cited usages: brand title `تفسير النابلسي` on bg-secondary (`Layout.jsx:12`), back/error links (`SurahView.jsx:101,94`), tafsir expand toggle at `text-xs` (`AyahCard.jsx:55`), search-result titles on `input-style` cards (`SearchBar.jsx:88`), surah numbers (`SurahList.jsx:66`). Sepia variant: `--accent: #00796b` on `--bg-secondary: #e8dcc8` hits the same result-title path.
- **Why it matters:** Recomputed ratios: **#00897b on #ffffff = 4.32:1**, **#00897b on #f5f5f5 = 3.96:1**, **#00796b on #e8dcc8 = 3.93:1**, and light badge pair **#fefdfe on #00897b = 4.25:1** — all below WCAG AA 4.5:1 for normal-size text (the tafsir toggle is 12px). The site's own brand title, every accent link, and search-result headings fail AA for low-vision users in default light mode and sepia secondary surfaces. (Sepia accent-on-primary passes at 4.52:1; sepia badge passes at 5.03:1.)
- **Suggested fix:** Darken light accent to ≈`#00695c` (recompute ≥4.5:1 on both `#ffffff` and `#f5f5f5`) or restrict `text-accent` to ≥18.7px bold/large text and move small interactive text to `text-primary`; bump sepia `--bg-secondary` lighter or use a darker accent on secondary surfaces; darken `--text-on-accent` pairing by deepening `#00897b`.
- **Verified:** yes

### A11Y-003 | Medium | accessibility | S
- **Location:** `web/src/components/Layout.jsx:24`
- **Evidence:** 
  ```jsx
  <NavLink to="/search" className={...}>
    <span>🔍</span>
    <span className="hidden sm:inline arabic-text">بحث</span>
  </NavLink>
  ```
  The NavLink has no `aria-label`; the emoji span is not `aria-hidden`; the Arabic label is `display:none` below `sm` breakpoint.
- **Why it matters:** On mobile viewports (< 640px) this icon-only navigation control's accessible name is just the emoji — announced by screen readers as an unlocalized English name ("magnifying glass tilted right") or skipped entirely, leaving the primary search entry point effectively unnamed. Contrast with `ThemeToggle.jsx`, which handles the identical pattern correctly (`aria-label` + `aria-hidden` children).
- **Suggested fix:** Add `aria-label="بحث"` to the NavLink and `aria-hidden="true"` to the emoji span (mirroring ThemeToggle).
- **Verified:** yes

### A11Y-004 | Medium | accessibility | M
- **Location:** `web/src/App.jsx:26`
- **Evidence:** Client-side routes (`<Routes>` with `/`, `/surah/:id`, `/search`, `*`, lines 26-31) with no focus management anywhere (`grep document.title|useTitle web/src` → 0 hits) and a static page title (`web/index.html:7`: `<title>تفسير النابلسي — تفسير القرآن الكريم</title>`).
- **Why it matters:** On SPA route change the clicked link unmounts, focus silently resets to `<body>` with no announcement, and the tab/window title never changes. Screen-reader users navigating to a surah hear nothing about what loaded and lose their reading position in the accessibility tree; browser history entries are indistinguishable ("تفسير النابلسي…" ×N), breaking title-based navigation for everyone.
- **Suggested fix:** Add a route-level effect that sets `document.title` per page (e.g. `سورة الفاتحة — تفسير النابلسي`) and moves focus to the page `h1` (`tabIndex={-1}`, `focus({ preventScroll: true })`), or render a visually-hidden router announcer live region.
- **Verified:** yes

### A11Y-005 | Medium | accessibility | M
- **Location:** `web/src/components/SearchBar.jsx:55`
- **Evidence:** Index-build progress renders as plain markup with no status semantics:
  ```jsx
  {isBuildingIndex && (
    <div className="text-center py-8">
      <div className="animate-spin ..."></div>
      <p className="text-sm arabic-text text-secondary">جاري تحميل البيانات... {toArabicNum(searchProgress)}%</p>
  ```
  Similarly unannounced: results count (`SearchBar.jsx:78-80`), "لا توجد نتائج" outcomes (`SearchBar.jsx:70-74`, `SurahList.jsx:92-96`), and error paragraphs (`SearchBar.jsx:64-68`, `SurahView.jsx:93`, `SurahList.jsx:21-23`).
- **Why it matters:** The first search blocks for seconds-to-minutes while fetching ~388MB (see WEB-008); a screen-reader user activating بحث hears nothing — no progress, no completion, no empty-result or failure announcement — and cannot tell whether the app is working. Filtering the surah list likewise gives zero audible feedback. `Spinner.jsx:5-6` proves the correct pattern exists in-repo but isn't applied here.
- **Suggested fix:** Wrap the progress block in `role="status" aria-live="polite"` (or reuse `<Spinner />`), announce the result count / empty state via a polite live region, and give error paragraphs `role="alert"`.
- **Verified:** yes

### A11Y-006 | Medium | accessibility | S
- **Location:** `web/src/components/AyahCard.jsx:77`
- **Evidence:**
  ```jsx
  <button onClick={() => toggleFavorite(surahId, ayah.number)} ... aria-label={favLabel}>
  ```
  where `favLabel` flips between 'إضافة للمفضلة'/'إزالة من المفضلة' (line 14); the disclosure button (lines 53-58) likewise swaps its text ('عرض التفسير الكامل'/'إخفاء التفسير') with no `aria-expanded`.
- **Why it matters:** Both controls convey their state solely by mutating the label mid-session. Screen readers do not reliably announce accessible-name changes on the focused element, so users can't confirm whether a favorite was added or whether the tafsir panel opened — state information is lost (WCAG 4.1.2 Name/Role/Value).
- **Suggested fix:** Add `aria-pressed={isFav}` to the heart button (keep the stable label) and `aria-expanded={expanded}` (plus `aria-controls`) to the tafsir toggle.
- **Verified:** yes

### A11Y-007 | Medium | accessibility | S
- **Location:** `web/src/components/SurahList.jsx:57`
- **Evidence:** 
  ```jsx
  <div>
    {filtered.map(surah => (
      <Link key={surah.surah_id} to={`/surah/${surah.surah_id}`} ...>
  ```
  — a bare `<div>` of 114 sibling links, each containing an `<h2>` (line 70); no `<ul>`/`<li>` anywhere.
- **Why it matters:** The app's primary screen is semantically an unordered list of 114 surahs, but assistive tech sees an unstructured link pile: SR users can't invoke "list" navigation, don't get the item count ("list, 114 items"), and heading-by-heading (H) navigation is polluted by 114 same-level headings interleaved with page content. Keyboard/screen-reader traversal order still works, so friction rather than barrier.
- **Suggested fix:** Render `<ul>` with `<li key={...}><Link …>` rows (drop the inner `h2` to a styled `span`, keeping the single page `h1`); optionally add `aria-labelledby` linking the filter input's results.
- **Verified:** yes

### A11Y-008 | Medium | accessibility | S
- **Location:** `web/src/components/SurahView.jsx:93`
- **Evidence:** 
  ```jsx
  <p className="arabic-text text-secondary">خطأ: {error}</p>
  ```
  where `error` comes from `data.js:12` (`Failed to load ${url}: ${resp.status}`) or `data.js:16` (`Request timed out after 10s: ${url}`) — raw LTR English URLs embedded in RTL sentences. Same interpolation without isolation at `SurahList.jsx:22` and `SearchBar.jsx:66`.
- **Why it matters:** With the paragraph's RTL base direction, a mixed-direction string like `Request timed out after 10s: https://pub-…r2.dev/data/61.json` is laid out with reordered runs — the URL/path segments and trailing punctuation visually scramble (e.g. the scheme separates from the domain, slashes jump sides), making already-critical error messages unreadable when they matter most (offline/slow-network scenarios common on mobile).
- **Suggested fix:** Wrap interpolated dynamic values in a bidi isolate: `<span dir="ltr" style={{unicodeBidi:'isolate'}}>{error}</span>` (or wrap in U+2066/U+2069), and/or map fetch errors to short Arabic messages before display.
- **Verified:** yes

### A11Y-009 | Low | accessibility | S
- **Location:** `web/src/components/Layout.jsx:7`
- **Evidence:** `<header className="sticky top-0 z-50 …">` containing two NavLinks (lines 11-27) directly — no `<nav>` landmark wraps them; `<main>` follows at line 31; no skip link exists before either.
- **Why it matters:** Screen-reader users get banner and main landmarks but no navigation landmark to jump to/from, and on every page visit keyboard users must re-tab through the header controls before reaching content — minor friction today (only two controls), growing if nav expands.
- **Suggested fix:** Wrap the NavLinks in `<nav aria-label="التنقل الرئيسي">` and add a visually-hidden "تجاوز إلى المحتوى" skip link targeting `<main id="main">`.
- **Verified:** yes

### A11Y-010 | Low | accessibility | S
- **Location:** `web/src/components/AyahCard.jsx:78`
- **Evidence:** 
  ```jsx
  className="text-xl transition-transform hover:scale-110"
  ```
  — a bare emoji glyph (~20px) with zero padding; the card's only other control sits ~100px away but the heart is centered between dense verse rows.
- **Why it matters:** Tap target ≈20×20px, under the WCAG 2.5.8 AA minimum of 24×24px. On touch devices, favoriting/unfavoriting an ayah requires precise aim inside long scrollable lists; a mis-tap lands in verse text selection instead.
- **Suggested fix:** Add padding/min box (e.g. `p-1.5 -m-1.5` or `min-w-6 min-h-6` inline-flex) to reach ≥24px while preserving layout.
- **Verified:** yes

### A11Y-011 | Low | accessibility | S
- **Location:** `web/src/components/AyahCard.jsx:60`
- **Evidence:** `<div className="mt-4 p-5 rounded-lg text-right" …>` — the sole physical directional declaration in the codebase (grep across `web/src` + `index.html`: everything else uses logical-safe spacing/gap; `dir="rtl"` set once at `index.html:2`).
- **Why it matters:** `text-right` happens to equal the logical start side under the app's fixed RTL direction, so there is no user-facing defect today; but it is the one place that would silently flip (tafsir aligning to the wrong edge) if a LTR context or `dir` override were ever introduced around expanded tafsir content. Polish/hardening.
- **Suggested fix:** Use `text-start` (Tailwind logical utility) instead of `text-right`.
- **Verified:** yes

### A11Y-012 | Low | accessibility | S
- **Location:** `web/src/components/SurahView.jsx:102`
- **Evidence:** 
  ```jsx
  <Link to="/" className="…">العودة للسور ←</Link>
  ```
  Left-pointing arrow (U+2190) rendered after (i.e., visually left of, at the reading-flow end of) RTL text meaning "return to the surahs".
- **Why it matters:** In RTL conventions the "back/previous" direction points right (mirrored from LTR), while ← signals forward/next. The glyph therefore contradicts the action's semantics for Arabic readers scanning quickly — a polish issue affecting sighted users' direction intuition, not operation.
- **Suggested fix:** Use → (U+2192) or better a direction-neutral glyph (↑ / chevron mirrored via CSS transform), placed at the visual start of the link.
- **Verified:** yes

---

## Contrast computations (recomputed from `index.css` hex values)

WCAG 2.x relative-luminance formula applied to exact hex pairs from `index.css:25-68`:

| Pair (fg on bg) | Ratio | AA 4.5:1? |
|---|---|---|
| `#f0fdfb` on `#4db6ac` (dark badge-accent) | **2.34:1** | FAIL (also < 3:1) |
| `#fefdfe` on `#00897b` (light badge-accent) | **4.25:1** | FAIL |
| `#00897b` on `#ffffff` (light accent text) | **4.32:1** | FAIL |
| `#00897b` on `#f5f5f5` (light accent on secondary) | **3.96:1** | FAIL |
| `#00796b` on `#e8dcc8` (sepia accent on secondary) | **3.93:1** | FAIL |
| `#00796b` on `#f4ecd8` (sepia accent on primary) | 4.52:1 | pass (borderline) |
| `#fdf8ee` on `#00796b` (sepia badge) | 5.03:1 | pass |
| `#4db6ac` on `#121212` (dark accent text) | 7.67:1 | pass |
| `#d4e8db` on `#121212` (dark verse text) | 14.60:1 | pass |
| `#666666` on `#ffffff` / `#f5f5f5` (light secondary) | 5.74:1 / 5.27:1 | pass |
| `#a0a0a0` on `#121212` (dark secondary) | 7.16:1 | pass |
| `#6d4c41` on `#f4ecd8` (sepia secondary) | 6.46:1 | pass |
| `#bcaaa4` on tint composite `#172120` (dark tafsir) | 7.39:1 | pass |

## Verification summary

All 12 findings re-read at cited `path:line` against HEAD `6462a70`; both High findings' contrast claims recomputed independently from source hex values (table above). No findings dropped during verification; none of the issues duplicate existing WEB-*/PIP-*/WRK-* entries.
