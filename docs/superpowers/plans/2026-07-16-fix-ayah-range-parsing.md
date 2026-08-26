# Fix Ayah-Range Title Parsing Edge Cases

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `parse_ayah_range` to handle spaced en-dash (`1 – 8`) and "part" notation (`2-2`) edge cases in Arabic lesson titles.

**Architecture:** Add regex patterns for spaced separators and a context-aware "part" detection that distinguishes "ayahs 2-2" (single ayah) from "part 2 of 2" (not a range).

**Tech Stack:** Python, pytest, regex

---

### Task 1: Write failing tests for edge cases

**Files:**
- Test: `pipeline/tests/test_lesson_parser.py`

- [ ] **Step 1: Add test for spaced en-dash**

```python
def test_spaced_en_dash():
    """Spaced en-dash should work like regular dash."""
    result = parse_ayah_range("تفسير الآيات 1 – 8")
    assert result == [1, 2, 3, 4, 5, 6, 7, 8]
```

- [ ] **Step 2: Add test for part notation**

```python
def test_part_notation():
    """Part notation (same number repeated) should return single ayah."""
    result = parse_ayah_range("تفسير الآيات 2-2")
    assert result == [2]  # "part 2 of 2" = single ayah 2
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest tests/test_lesson_parser.py -v`

Expected: Both new tests FAIL

---

### Task 2: Fix spaced en-dash parsing

**Files:**
- Modify: `pipeline/src/tafsir/lesson_parser.py:35,41`

- [ ] **Step 4: Update regex patterns to handle spaces around dashes**

The current patterns use `\s*[-–—]\s*` which should already handle spaces. Let me verify by checking the actual regex.

If the pattern already handles spaces, the test should pass. If not, update the regex.

- [ ] **Step 5: Run test to verify spaced en-dash passes**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest tests/test_lesson_parser.py::test_spaced_en_dash -v`

Expected: PASS

---

### Task 3: Fix part notation parsing

**Files:**
- Modify: `pipeline/src/tafsir/lesson_parser.py`

- [ ] **Step 6: Add logic to detect part notation**

When `start == end` in a range (e.g., `2-2`), treat it as a single ayah, not a range.

```python
# In dual and plural patterns, after getting start and end:
if start == end:
    return [start]
```

- [ ] **Step 7: Run test to verify part notation passes**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest tests/test_lesson_parser.py::test_part_notation -v`

Expected: PASS

---

### Task 4: Run full test suite

**Files:**
- None

- [ ] **Step 8: Run full test suite**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest`

Expected: All tests pass

- [ ] **Step 9: Commit changes**

```bash
cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi
git add pipeline/src/tafsir/lesson_parser.py pipeline/tests/test_lesson_parser.py
git commit -m "fix: handle spaced en-dash and part notation in ayah range parsing"
```
