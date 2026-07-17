# Fix Absolute URL Parsing in Story Discovery

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `parse_stories_from_html` to detect story links using absolute URLs (`https://nabulsi.co/story/...`) in addition to relative URLs (`/story/...`)

**Architecture:** Single function update in `category_index.py` to handle both URL formats, with test coverage for absolute URL scenarios.

**Tech Stack:** Python, pytest, BeautifulSoup CSS selectors

---

### Task 1: Write failing test for absolute URL parsing

**Files:**
- Test: `pipeline/tests/test_category_index.py`
- Source: `pipeline/src/tafsir/category_index.py`

- [ ] **Step 1: Add test case for absolute URLs**

```python
def test_parse_stories_from_html_absolute_urls():
    """Story links with absolute URLs should be extracted."""
    html = """
    <a href="https://nabulsi.co/story/Beautiful-Names10965">
        <img alt="الدرس : سورة الإخلاص - تفسير الآيات 1-4">
    </a>
    <a href="https://nabulsi.co/story/Beautiful-Names10965">
        الدرس : سورة الإخلاص - تفسير الآيات 1-4
    </a>
    """
    stories = parse_stories_from_html(html)
    assert len(stories) == 1
    assert stories[0]["url"] == "https://nabulsi.co/story/Beautiful-Names10965"
    assert "تفسير" in stories[0]["title"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest tests/test_category_index.py::test_parse_stories_from_html_absolute_urls -v`

Expected: FAIL with 0 stories found (selector doesn't match absolute URLs)

---

### Task 2: Fix the CSS selector in parse_stories_from_html

**Files:**
- Modify: `pipeline/src/tafsir/category_index.py:61`

- [ ] **Step 3: Update selector to match both URL patterns**

```python
# Change line 61 from:
for a in soup.select("a[href*='/story/']"):

# To:
for a in soup.select("a[href*='/story/'], a[href*='nabulsi.co/story/']"):
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest tests/test_category_index.py::test_parse_stories_from_html_absolute_urls -v`

Expected: PASS

---

### Task 3: Run full test suite and rebuild surah 112

**Files:**
- Output: `pipeline/output/112.json`

- [ ] **Step 5: Run full test suite**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest`

Expected: All tests pass

- [ ] **Step 6: Rebuild surah 112 and verify coverage**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run python -m src.main --surah 112`

Expected: Coverage > 0% (previously 0%)

- [ ] **Step 7: Commit changes**

```bash
git add pipeline/src/tafsir/category_index.py pipeline/tests/test_category_index.py pipeline/output/112.json
git commit -m "fix: parse absolute story URLs in category pages"
```
