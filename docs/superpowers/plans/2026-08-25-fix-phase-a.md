# Phase A Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the 7 highest-value quick-win fixes from the full project audit (Phase A of the audit report's fix order).

**Architecture:** Seven independent, single-file-or-two fixes. Each touches one subsystem, has its own test, and commits independently. No task depends on another — all are safe to merge individually. Phase B (WRK-001 auth, A11Y-002 contrast, PIP-005 range cap, TST-001–006 test coverage) is deferred to a separate plan.

**Tech Stack:** React 19 + Vite (web), Python + pytest (pipeline), Vitest (web tests), Tailwind CSS

**Spec:** `docs/superpowers/reviews/2026-08-24-full-project-review-report.md` (audit report, fix-order Section 4, Phase A items 1–7)

## Global Constraints

- **Package managers:** `pnpm` for web/ (never npm/yarn), `uv` for pipeline/ (never pip directly).
- **Branch:** Create a new branch `fix/phase-a-quick-wins` from `main`. Never commit to `main`.
- **No comments** in code unless explicitly requested.
- **RTL throughout:** `<html dir="rtl">`, Arabic content. Arabic-Indic numerals via `toArabicNum()` from `web/src/utils/arabic.js`.
- **Tests:** `pnpm test` in web/ (vitest), `uv run pytest` in pipeline/.
- **Commit per task:** each task commits only its own changed files with a scoped message.

---

### Task 1: WEB-003 — Normalize Arabic in search (High/bugs)

**Files:**
- Modify: `web/src/api/search.js` (add normalizer, apply to index + query)
- Modify: `web/src/api/search.test.js` (add 3 tests)

**Interfaces:**
- Consumes: regex patterns from `web/src/utils/arabic.js` — `TASHKEEL` (line 20) and `ALEF_VARIANTS` (line 21). These are already exported.
- Produces: `searchLocal()` returns correct results for diacritized/undiacritized Arabic queries against vocalized index entries.

**Rationale:** The search index contains fully vocalized Arabic (e.g. `بِسْمِ ٱللَّهِ`) but users type plain undiacritized text (e.g. `بسم الله`). Current `.toLowerCase().includes()` fails. The existing regexes in `arabic.js` already handle this — apply them to both index and query.

- [ ] **Step 1: Write the failing tests**

Add to `web/src/api/search.test.js`:

```js
it('matches diacritized text with undiacritized query', () => {
  const vocalizedIndex = [
    { text: '\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0640\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650', tafsir_short: '', tafsir_long: '' },
  ]
  const results = searchLocal('\u0628\u0633\u0645 \u0627\u0644\u0644\u0647', vocalizedIndex)
  expect(results).toHaveLength(1)
})

it('matches alef-madda and alef-hamza variants', () => {
  const index = [
    { text: '\u0622\u0645\u064e\u0646\u064e \u0671\u0644\u0631\u0651\u064e\u0633\u0648\u0644\u064f', tafsir_short: '', tafsir_long: '' },
  ]
  expect(searchLocal('\u0627\u0645\u0646', index)).toHaveLength(1)
})

it('matches diacritized tafsir_short field', () => {
  const index = [
    { text: 'some text', tafsir_short: '\u062a\u0652\u0641\u0652\u0633\u0650\u064a\u0631\u064c \u0645\u064f\u0628\u064e\u0633\u0651\u0650\u0637\u064c', tafsir_long: '' },
  ]
  expect(searchLocal('\u062a\u0641\u0633\u064a\u0631 \u0645\u0628\u0633\u0637', index)).toHaveLength(1)
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test` (workdir `web/`)
Expected: FAIL on the three new tests.

- [ ] **Step 3: Add normalize helper and apply to search**

In `web/src/api/search.js`, add at the top (after imports):

```js
const TASHKEEL_RE = /[\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e8]/g
const ALEF_RE = /[\u0622\u0623\u0625\u0671]/g

function normalizeArabic(str) {
  return str
    .toLowerCase()
    .replace(TASHKEEL_RE, '')
    .replace(ALEF_RE, '\u0627')
}
```

In `buildSearchIndex`, normalize each field when building the cache (lines 12–21):

```js
searchIndexCache = allSurahs.flatMap(surah =>
  surah.ayahs.map(ayah => ({
    surah_id: surah.surah_id,
    surah_name: surah.name,
    ayah_number: ayah.number,
    ...Object.fromEntries(
      SEARCH_FIELDS.map(field => [field, normalizeArabic(ayah[field] || '')])
    ),
  }))
)
```

In `searchLocal`, normalize the query (line 28):

```js
export function searchLocal(query, searchIndex) {
  if (!query || !searchIndex) return []
  const q = normalizeArabic(query)
  return searchIndex.filter(entry =>
    SEARCH_FIELDS.some(field => entry[field]?.includes(q))
  ).slice(0, MAX_RESULTS)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test` (workdir `web/`)
Expected: ALL 42 tests pass (39 existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add web/src/api/search.js web/src/api/search.test.js
git commit -m "fix: normalize Arabic in search for diacritized and alef variants"
```

---

### Task 2: PIP-001 — Key index entries off surah_id (High/bugs)

**Files:**
- Modify: `pipeline/src/merge/builder.py:91-106` (`save_index`)
- Modify: `pipeline/tests/test_builder.py` (add 1 test)

**Interfaces:**
- Consumes: `surahs_data` list (each dict has `surah_id` key set by `build_surah_json` line 51).
- Produces: `_index.json` with correct `surah_id` per entry.

**Rationale:** `save_index` at line 95 uses `enumerate(surahs_data, 1)` to assign `surah_id`, trusting list order. If the input list has a gap (e.g. fresh `--surah 5` run), entry 0 gets `surah_id: 1` instead of `5`. Fix: key off `s["surah_id"]`.

- [ ] **Step 1: Write the failing test**

Add to `pipeline/tests/test_builder.py`:

```python
def test_save_index_uses_surah_id_not_position():
    from src.merge.builder import save_index
    import json

    surahs = [
        {"surah_id": 5, "name": "\u0627\u0644\u0645\u0627\u0626\u062f\u0629", "ayahs": [
            {"number": 1, "text": "t", "tafsir_short": "", "tafsir_long": "body", "media": {}},
        ]},
    ]
    path = save_index(surahs)
    index = json.loads(path.read_text(encoding="utf-8"))
    assert index[0]["surah_id"] == 5
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest pipeline/tests/test_builder.py::test_save_index_uses_surah_id_not_position -v` (workdir `pipeline/`)
Expected: FAIL (index says surah_id 1, not 5).

- [ ] **Step 3: Fix save_index to use s["surah_id"]**

Replace `pipeline/src/merge/builder.py:91-101`:

```python
def save_index(surahs_data: list[dict]) -> Path:
    """Save the surah index (_index.json)."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    index = []
    for s in surahs_data:
        sid = s["surah_id"]
        index.append({
            "surah_id": sid,
            "name": SURAH_NAMES[sid - 1],
            "ayah_count": len(s["ayahs"]),
            "has_tafsir": any(a["tafsir_long"] for a in s["ayahs"]),
        })

    out_path = OUTPUT_DIR / "_index.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
    return out_path
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest` (workdir `pipeline/`)
Expected: ALL 46 tests pass (45 existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/merge/builder.py pipeline/tests/test_builder.py
git commit -m "fix: key _index.json entries off surah_id instead of enumerate position"
```

---

### Task 3: PIP-002 — Distinguish fetch failure from empty results (High/bugs)

**Files:**
- Modify: `pipeline/src/quran/fetcher.py:15-30`
- Create: `pipeline/tests/test_fetcher.py`

**Interfaces:**
- Consumes: `CACHE_DIR`, `requests` library.
- Produces: `fetch_quran_json()` returns `Path` on success, `None` on network failure (instead of raising).

**Rationale:** When `requests.get()` fails, `fetch_quran_json()` raises. The caller catches and returns `[]`, which the merge builder treats as success — producing a valid-looking empty JSON that `--resume` bakes in permanently. Fix: catch at fetcher level, return `None`.

- [ ] **Step 1: Write the failing tests**

Create `pipeline/tests/test_fetcher.py`:

```python
from unittest.mock import patch, MagicMock
from pathlib import Path


def test_fetch_returns_none_on_network_error():
    from src.quran.fetcher import fetch_quran_json
    with patch("src.quran.fetcher.requests.get", side_effect=Exception("network down")):
        result = fetch_quran_json(force=True)
    assert result is None


def test_fetch_returns_path_on_success(tmp_path, monkeypatch):
    from src.quran import fetcher
    monkeypatch.setattr(fetcher, "_QURAN_CACHE", tmp_path / "quran.json")
    monkeypatch.setattr(fetcher, "CACHE_DIR", tmp_path)
    mock_resp = MagicMock()
    mock_resp.text = '{"data": []}'
    mock_resp.raise_for_status = MagicMock()
    with patch("src.quran.fetcher.requests.get", return_value=mock_resp):
        result = fetch_quran_json(force=True)
    assert result is not None
    assert result.exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `uv run pytest pipeline/tests/test_fetcher.py -v` (workdir `pipeline/`)
Expected: FAIL on `test_fetch_returns_none_on_network_error`.

- [ ] **Step 3: Wrap fetch in try/except returning None**

Replace `pipeline/src/quran/fetcher.py:15-30`:

```python
def fetch_quran_json(force: bool = False) -> Path | None:
    """Download the full Quran in Uthmani script from AlQuran.cloud.

    Returns the local cached JSON path, or None on network failure.
    """
    if _QURAN_CACHE.exists() and not force:
        return _QURAN_CACHE

    _QURAN_CACHE.parent.mkdir(parents=True, exist_ok=True)

    try:
        wait_if_needed(REQUEST_DELAY_SECONDS)
        resp = requests.get(ALQURAN_CLOUD_URL, timeout=60)
        resp.raise_for_status()
    except Exception as e:
        print(f"Warning: failed to fetch Quran JSON: {e}")
        return None

    _QURAN_CACHE.write_text(resp.text, encoding="utf-8")
    return _QURAN_CACHE
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest` (workdir `pipeline/`)
Expected: ALL tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/quran/fetcher.py pipeline/tests/test_fetcher.py
git commit -m "fix: return None from fetch_quran_json on network failure instead of raising"
```

---

### Task 4: PIP-003 — Log dropped lessons (High/bugs)

**Files:**
- Modify: `pipeline/src/tafsir/lesson_parser.py` (add `import warnings`, emit at fallback)
- Modify: `pipeline/tests/test_lesson_parser.py` (add 1 test)

**Interfaces:**
- Consumes: Arabic lesson titles (strings).
- Produces: `parse_ayah_range()` returns `[]` on unrecognized titles (unchanged) but now emits `warnings.warn()`.

**Rationale:** When `parse_ayah_range` returns `[]`, the caller silently skips the lesson's tafsir — real content lost with no log or counter. Fix: emit a warning so operators can detect unrecognized formats.

- [ ] **Step 1: Write the failing test**

Add to `pipeline/tests/test_lesson_parser.py`:

```python
import warnings

def test_unrecognized_title_warns():
    from src.tafsir.lesson_parser import parse_ayah_range
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        result = parse_ayah_range("some completely unrelated title")
        assert result == []
        assert len(w) == 1
        assert "unrecognized" in str(w[0].message).lower()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest pipeline/tests/test_lesson_parser.py::test_unrecognized_title_warns -v` (workdir `pipeline/`)
Expected: FAIL (no warning emitted).

- [ ] **Step 3: Add warnings.warn at the return [] fallback**

Add `import warnings` at the top of `lesson_parser.py`, then before the final `return []` (line 61):

```python
    warnings.warn(f"Unrecognized ayah range pattern in title: {title!r}")
    return []
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest` (workdir `pipeline/`)
Expected: ALL tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/tafsir/lesson_parser.py pipeline/tests/test_lesson_parser.py
git commit -m "fix: warn on unrecognized ayah range titles to surface dropped lessons"
```

---

### Task 5: PIP-004 — Log failed story pages (High/bugs)

**Files:**
- Modify: `pipeline/src/tafsir/scraper.py:65-73` (add warning in except block)
- Create: `pipeline/tests/test_scraper.py`

**Interfaces:**
- Consumes: `fetch_page()` raises on failure.
- Produces: `fetch_story_page()` returns `None` (unchanged) but emits `warnings.warn()` with URL + exception.

**Rationale:** `fetch_story_page` catches all exceptions silently — the caller has no idea pages were dropped. Fix: emit a warning with the URL.

- [ ] **Step 1: Write the failing test**

Create `pipeline/tests/test_scraper.py`:

```python
import warnings
from unittest.mock import patch


def test_fetch_story_page_warns_on_failure():
    from src.tafsir.scraper import fetch_story_page
    with warnings.catch_warnings(record=True) as w:
        warnings.simplefilter("always")
        with patch("src.tafsir.scraper.fetch_page", side_effect=Exception("timeout")):
            result = fetch_story_page("https://example.com/story/1")
        assert result is None
        assert len(w) == 1
        assert "https://example.com/story/1" in str(w[0].message)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `uv run pytest pipeline/tests/test_scraper.py -v` (workdir `pipeline/`)
Expected: FAIL (no warning emitted).

- [ ] **Step 3: Add warning in the except block**

Add `import warnings` at the top of `scraper.py`, then update lines 70–73:

```python
    try:
        html = fetch_page(url)
    except Exception as e:
        warnings.warn(f"Failed to fetch story page {url}: {e}")
        return None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `uv run pytest` (workdir `pipeline/`)
Expected: ALL tests pass.

- [ ] **Step 5: Commit**

```bash
git add pipeline/src/tafsir/scraper.py pipeline/tests/test_scraper.py
git commit -m "fix: warn on failed story page fetches to surface dropped content"
```

---

### Task 6: A11Y-001 — Darken dark-theme accent for WCAG AA contrast (High/accessibility)

**Files:**
- Modify: `web/src/index.css:40-52` (dark theme block, 3 properties)

**Interfaces:**
- Consumes: `--text-on-accent: #f0fdfb` (relative luminance 0.947) — unchanged.
- Produces: `--accent` darkened so text-on-accent on accent achieves ≥ 4.5:1 contrast ratio.

**Rationale:** Dark-theme `--accent: #4db6ac` with `--text-on-accent: #f0fdfb` hits only 2.34:1 — far below WCAG AA's 4.5:1. Every badge, nav pill, and action button in dark mode has near-illegible text.

Fix: change `--accent: #4db6ac` to `#15574d` (relative luminance 0.121), yielding contrast ratio = (0.947 + 0.05) / (0.121 + 0.05) = 5.83:1 — passes AA. Also update the companion rgba() properties (`--tafsir-tint`, `--border`, `--hover-bg`) to match.

- [ ] **Step 1: Update dark-theme accent color**

In `web/src/index.css`, replace the dark theme block (`[data-theme="dark"]`):

```css
[data-theme="dark"] {
  --bg-primary: #121212;
  --bg-secondary: #1e1e1e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #15574d;
  --tafsir-tint: rgba(21, 87, 77, 0.09);
  --text-on-accent: #f0fdfb;
  --border: rgba(21, 87, 77, 0.15);
  --hover-bg: rgba(21, 87, 77, 0.08);
  --verse-text: #d4e8db;
  --verse-glyph: #4db6ac;
  --tafsir-text: #bcaaa4;
}
```

- [ ] **Step 2: Verify contrast ratio**

Recompute WCAG contrast ratio manually:

```
#f0fdfb luminance: 0.947
#15574d luminance: 0.121
ratio = (0.947 + 0.05) / (0.121 + 0.05) = 5.83:1  (passes AA ≥ 4.5:1)
```

- [ ] **Step 3: Run existing tests**

Run: `pnpm test` (workdir `web/`)
Expected: ALL tests pass (no behavioral changes to test).

- [ ] **Step 4: Build and visually verify (optional)**

Run: `pnpm build` (workdir `web/`)
Confirm build succeeds. Open the app in dark mode and verify badges/nav pills are legible.

- [ ] **Step 5: Commit**

```bash
git add web/src/index.css
git commit -m "fix: darken dark-theme accent to #15574d for WCAG AA contrast (5.83:1)"
```

---

### Task 7: SEC-003 — Fail production build when VITE_DATA_BASE is unset (High/security)

**Files:**
- Modify: `web/src/api/data.js:4` (remove hardcoded R2 URL fallback)
- Create: `web/.env.example` (add VITE_DATA_BASE reference)

**Interfaces:**
- Consumes: `import.meta.env.VITE_DATA_BASE`, `import.meta.env.DEV`.
- Produces: Module throws at load time if `VITE_DATA_BASE` is unset in production builds. Dev mode falls back to `/data` as before.

**Rationale:** `data.js:4` hardcodes the production R2 URL as a fallback when `VITE_DATA_BASE` is unset. This means a production build without the env var silently ships with a hardcoded third-party origin — a security concern (no way to redirect data source without rebuilding) and a docs-vs-reality gap (AGENTS.md claims the URL comes from env only).

Fix: remove the hardcoded URL; throw if unset in production.

- [ ] **Step 1: Update data.js to require VITE_DATA_BASE in production**

Replace `web/src/api/data.js:4`:

```js
const DATA_BASE = import.meta.env.VITE_DATA_BASE || (import.meta.env.DEV ? '/data' : null)

if (!DATA_BASE) {
  throw new Error(
    'VITE_DATA_BASE must be set for production builds. ' +
    'Set it in your .env or pass it to the build command: ' +
    'VITE_DATA_BASE=https://your-r2-url/data pnpm build'
  )
}
```

- [ ] **Step 2: Create .env.example**

Create `web/.env.example`:

```
# Required for production builds. Falls back to /data in dev mode.
# Example: VITE_DATA_BASE=https://pub-<hash>.r2.dev/data
VITE_DATA_BASE=
```

- [ ] **Step 3: Verify build fails without VITE_DATA_BASE**

Run (from `web/`):
```bash
unset VITE_DATA_BASE && pnpm build
```
Expected: FAIL with the Error message.

- [ ] **Step 4: Verify build succeeds with VITE_DATA_BASE**

Run (from `web/`):
```bash
VITE_DATA_BASE=/data pnpm build
```
Expected: PASS.

- [ ] **Step 5: Run tests**

Run: `pnpm test` (workdir `web/`)
Expected: ALL tests pass.

- [ ] **Step 6: Commit**

```bash
git add web/src/api/data.js web/.env.example
git commit -m "fix: require VITE_DATA_BASE in production builds, remove hardcoded R2 URL"
```
