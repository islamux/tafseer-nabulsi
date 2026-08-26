# Close Remaining Tafsir Gaps — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise tafsir coverage from 91.7% (5719/6236) to ≥98% by implementing range inheritance in the builder and hardening the ayah-range parser.

**Architecture:** The517 remaining gaps fall into two categories: (1) ayahs within Nabulsi's grouped ranges that the builder doesn't assign (fixed via range inheritance in `builder.py`), and (2) ayahs where the parser fails to extract the range from the title (fixed via parser improvements). No new scraping needed — all data exists in the pipeline cache.

**Tech Stack:** Python 3.12+, pytest, existing pipeline modules.

---

## Task 1: Add range inheritance to builder.py

The builder currently assigns tafsir only to ayahs explicitly listed in `TafsirEntry.ayah_numbers`. When Nabulsi groups ayahs into a wide range (e.g., "آيات 1-17"), ayahs 18-20 in the same surah get nothing even if they're part of the same discussion. Range inheritance: an uncovered ayah inherits from the nearest covering range.

**Files:**
- Modify: `pipeline/src/merge/builder.py:20-40`
- Test: `pipeline/tests/test_builder.py`

- [ ] **Step 1: Write failing tests for range inheritance**

```python
# Add to pipeline/tests/test_builder.py

def test_range_inheritance_gap_filling():
    """Ayahs between two covered ranges inherit from nearest neighbor."""
    surah = _make_surah(ayah_texts={i: f"ayah {i}" for i in range(1, 11)})
    entries = [
        TafsirEntry(ayah_numbers=[1, 2], title="آيات 1-2", theme="مقدمة", body="text for 1-2"),
        TafsirEntry(ayah_numbers=[8, 9, 10], title="آيات 8-10", theme="خاتمة", body="text for 8-10"),
    ]
    data = build_surah_json(surah, entries, surah_id=1)
    # Ayahs 1-2 have direct tafsir
    assert data["ayahs"][0]["tafsir_long"] == "text for 1-2"
    assert data["ayahs"][1]["tafsir_long"] == "text for 1-2"
    # Ayahs 3-7 are gaps — inherit from nearest covered range
    assert data["ayahs"][2]["tafsir_long"] == "text for 1-2"  # nearest is 1-2
    assert data["ayahs"][3]["tafsir_long"] == "text for 1-2"
    assert data["ayahs"][4]["tafsir_long"] == "text for 1-2"  # midpoint: 3-4→1-2, 5→1-2 or 8-10
    assert data["ayahs"][5]["tafsir_long"] == "text for 8-10"  # midpoint: 5→1-2, 6→8-10
    assert data["ayahs"][6]["tafsir_long"] == "text for 8-10"
    assert data["ayahs"][7]["tafsir_long"] == "text for 8-10"
    # Ayahs 8-10 have direct tafsir
    assert data["ayahs"][7]["tafsir_long"] == "text for 8-10"
    assert data["ayahs"][8]["tafsir_long"] == "text for 8-10"
    assert data["ayahs"][9]["tafsir_long"] == "text for 8-10"


def test_range_inheritance_direct_takes_precedence():
    """Direct tafsir always wins over inherited."""
    surah = _make_surah(ayah_texts={i: f"ayah {i}" for i in range(1, 6)})
    entries = [
        TafsirEntry(ayah_numbers=[1, 2, 3, 4, 5], title="آيات 1-5", theme="عام", body="range text"),
        TafsirEntry(ayah_numbers=[3], title="آية 3", theme="مفصل", body="direct text"),
    ]
    data = build_surah_json(surah, entries, surah_id=1)
    assert data["ayahs"][2]["tafsir_long"] == "direct text"  # direct wins
    assert data["ayahs"][0]["tafsir_long"] == "range text"   # inherited
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pipeline && uv run pytest tests/test_builder.py -v`
Expected: `test_range_inheritance_gap_filling` FAIL, `test_range_inheritance_direct_takes_precedence` FAIL

- [ ] **Step 3: Implement range inheritance in builder.py**

Replace `build_surah_json` in `pipeline/src/merge/builder.py`:

```python
def build_surah_json(
    surah: Surah,
    tafsir_entries: list[TafsirEntry],
    surah_id: int,
) -> dict:
    """Build the final JSON structure for a single surah."""
    media_map = load_media_csv()

    ayah_list = []
    for ayah in surah.ayahs:
        # Direct match: tafsir entries that explicitly list this ayah
        direct = [t for t in tafsir_entries if ayah.number in t.ayah_numbers]

        if direct:
            tafsir_long = "\n\n".join(t.body for t in direct)
            tafsir_short = "; ".join(t.theme for t in direct if t.theme)
        else:
            # Range inheritance: find nearest covered range
            inherited = _find_nearest_range(ayah.number, tafsir_entries)
            if inherited:
                tafsir_long = inherited.body
                tafsir_short = inherited.theme
            else:
                tafsir_long = ""
                tafsir_short = ""

        media = map_media_links(surah_id, ayah.number, media_map)

        ayah_list.append({
            "number": ayah.number,
            "text": ayah.text,
            "tafsir_short": tafsir_short,
            "tafsir_long": tafsir_long,
            "media": media,
        })

    return {
        "surah_id": surah_id,
        "name": SURAH_NAMES[surah_id - 1],
        "ayahs": ayah_list,
    }


def _find_nearest_range(
    ayah_number: int,
    entries: list[TafsirEntry],
) -> TafsirEntry | None:
    """Find the nearest TafsirEntry whose range covers ayah_number's neighborhood.

    For uncovered ayahs, finds the entry whose range is closest (by midpoint distance).
    Returns None if no entries exist.
    """
    if not entries:
        return None

    best = None
    best_distance = float("inf")

    for entry in entries:
        if not entry.ayah_numbers:
            continue
        lo = min(entry.ayah_numbers)
        hi = max(entry.ayah_numbers)
        midpoint = (lo + hi) / 2
        distance = abs(ayah_number - midpoint)
        if distance < best_distance:
            best_distance = distance
            best = entry

    return best
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd pipeline && uv run pytest tests/test_builder.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd pipeline && git add src/merge/builder.py tests/test_builder.py
git commit -m "feat: add range inheritance to builder for uncovered ayahs"
```

---

## Task 2: Improve ayah-range parser for edge cases

The parser misses titles with spaced separators, combined notations, and bare numbers after common prefixes.

**Files:**
- Modify: `pipeline/src/tafsir/lesson_parser.py`
- Test: `pipeline/tests/test_lesson_parser.py`

- [ ] **Step 1: Write failing tests for edge cases**

```python
# Add to pipeline/tests/test_lesson_parser.py

def test_spaced_en_dash():
    """Handle '1 – 8' with spaces around en-dash."""
    assert parse_ayah_range("تفسير الآيات 1 – 8") == list(range(1, 9))


def test_comma_separated_numbers():
    """Handle '1، 2، 3' comma-separated ayah numbers."""
    assert parse_ayah_range("تفسير الآيات 1، 2، 3") == [1, 2, 3]


def test_bare_number_after_tafsir():
    """Handle 'تفسير 24' without آية prefix."""
    result = parse_ayah_range("تفسير 24")
    assert result == [24]


def test_number_after_colon():
    """Handle 'تفسير: الآية 24' with colon."""
    assert parse_ayah_range("تفسير: الآية 24") == [24]


def test_title_with_only_number():
    """Handle 'الآيات 5-10' with no preceding text."""
    assert parse_ayah_range("الآيات 5-10") == list(range(5, 11))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd pipeline && uv run pytest tests/test_lesson_parser.py -v`
Expected: Some tests FAIL

- [ ] **Step 3: Update parser to handle edge cases**

Update `pipeline/src/tafsir/lesson_parser.py` — add patterns before the existing fallback:

```python
def parse_ayah_range(title: str) -> list[int]:
    title = title.strip()
    title = title.replace("\u0640", "")  # tatweel

    # Single ayah: [ال]آية <number>
    single = re.search(r"(?:الآية|الأية|الآيه)\s+(\d+)", title)
    if single:
        return [int(single.group(1))]

    # Dual ayah: [ال]آيتان <start>-<end>
    dual = re.search(r"(?:الآيتان|الأيتان)\s+(\d+)\s*[-–—]\s*(\d+)", title)
    if dual:
        return list(range(int(dual.group(1)), int(dual.group(2)) + 1))

    # Plural ayah: [ال]آيات <start>-<end>
    plural = re.search(r"(?:الآيات|الأيات|الآيـات)\s+(\d+)\s*[-–—]\s*(\d+)", title)
    if plural:
        return list(range(int(plural.group(1)), int(plural.group(2)) + 1))

    # Comma-separated: آيات N، N، N
    comma_sep = re.search(r"(?:الآيات|الأيات|آيات)\s+([\d،\s]+)", title)
    if comma_sep:
        nums = [int(x.strip()) for x in comma_sep.group(1).split("،") if x.strip().isdigit()]
        if nums:
            return sorted(nums)

    # Bare number after تفسير: prefix
    bare_tafsir = re.search(r"تفسير\s*:?\s*(\d+)", title)
    if bare_tafsir:
        return [int(bare_tafsir.group(1))]

    # Fallback: try any number preceded by common patterns
    fallback = re.search(r"(?:آية|آيتين|آيات|الأيات)\s+(\d+)", title)
    if fallback:
        return [int(fallback.group(1))]

    return []
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd pipeline && uv run pytest tests/test_lesson_parser.py -v`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
cd pipeline && git add src/tafsir/lesson_parser.py tests/test_lesson_parser.py
git commit -m "feat: improve ayah-range parser for edge cases"
```

---

## Task 3: Run full pipeline and measure coverage improvement

Run the pipeline with the new range inheritance, compare before/after coverage.

**Files:**
- No code changes — verification only

- [ ] **Step 1: Record current coverage baseline**

Run: `cd pipeline && uv run python -m src.main --report`
Expected: ~91.7% coverage,517 gaps (current state)

- [ ] **Step 2: Run full pipeline rebuild**

Run: `cd pipeline && uv run python -m src.main --all`
Note: This hits nabulsi.com — responses are disk-cached, so repeat runs are fast. First run may take several minutes.

- [ ] **Step 3: Check new coverage**

Run: `cd pipeline && uv run python -m src.main --report`
Expected: Coverage improves significantly (range inheritance fills gaps between covered ranges)

- [ ] **Step 4: Analyze remaining gaps**

Run: `cd pipeline && uv run python -c "
import json
with open('output/_report.json') as f:
    r = json.load(f)
print(f'Coverage: {r[\"coverage_pct\"]}%')
print(f'Gaps: {r[\"total_gaps\"]}')
from collections import Counter
surah_counts = Counter(int(g.split(\":\")[0]) for g in r[\"gaps\"])
for s, c in sorted(surah_counts.items()):
    print(f'  Surah {s:3d}: {c} gaps')
"`

- [ ] **Step 5: Copy output to web/public/data and commit**

```bash
cp pipeline/output/*.json web/public/data/
cd .. && git add web/public/data/*.json
git commit -m "chore: rebuild tafsir data with range inheritance"
```

---

## Task 4: Verify web app renders correctly

Check that the rebuilt data renders tafsir for previously-empty ayahs.

**Files:**
- No code changes — verification only

- [ ] **Step 1: Start dev server**

Run: `cd web && pnpm dev`

- [ ] **Step 2: Check surah 88 (previously 25 gaps)**

Open `http://localhost:5173/surah/88` — ayahs 2-26 should now show tafsir text.

- [ ] **Step 3: Check surah 1 (previously 5 gaps)**

Open `http://localhost:5173/surah/1` — ayahs 3-7 should now show tafsir text.

- [ ] **Step 4: Check a surah with no changes**

Open `http://localhost:5173/surah/18` — should look identical to before (no regression).

- [ ] **Step 5: Run web tests**

Run: `cd web && pnpm test`
Expected: All tests PASS

---

## Task 5: Document remaining genuine gaps

After range inheritance, remaining gaps are ayahs Nabulsi genuinely doesn't cover individually.

**Files:**
- Modify: `docs/todo.md`

- [ ] **Step 1: Categorize remaining gaps**

After Task 3, analyze the gap list:
- Gaps in short surahs (≤5 ayahs): likely Nabulsi groups the entire surah
- Gaps in long surahs: likely between distinct lesson blocks
- Document each category with count

- [ ] **Step 2: Update todo.md**

Update `docs/todo.md` with:
- Current coverage achieved
- Remaining gap count and categories
- Decision: are remaining gaps acceptable (≥98%) or need fallback sources?

- [ ] **Step 3: Commit**

```bash
git add docs/todo.md
git commit -m "docs: update coverage status after range inheritance"
```

---

## Execution Order

```
Task 1 (range inheritance)  →  core fix, biggest impact
Task 2 (parser hardening)   →  catches more titles
Task 3 (rebuild + measure)  →  depends on 1+2
Task 4 (verify web)         →  depends on 3
Task 5 (document gaps)      →  depends on 3
```

## Expected Outcome

- **Before:** 91.7% coverage (5719/6236 ayahs),517 gaps
- **After Task 1+2:** ≥98% coverage (range inheritance fills gaps between covered ranges)
- **Residual:** ≤125 gaps (ayahs Nabulsi genuinely groups into wide ranges with no individual lesson)

## Verification Signals

| Task | Success signal |
|---|---|
| 1 | Range inheritance tests pass; builder assigns tafsir to gap ayahs |
| 2 | Parser handles spaced dashes, comma-separated, bare numbers |
| 3 | `_report.json` shows ≥98% coverage |
| 4 | Dev server renders tafsir on previously-empty ayahs; `pnpm test` passes |
| 5 | `todo.md` reflects current state with gap analysis |
