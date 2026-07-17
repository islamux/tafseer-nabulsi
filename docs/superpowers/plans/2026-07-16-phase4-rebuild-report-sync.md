# Phase 4: Rebuild, Report, Wire to Web

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove gap truncation, add per-surah diagnostics, rebuild all surahs, and sync to web.

**Architecture:** Update `builder.py` to emit full gap list and per-surah stats, run full build, copy output to web/public/data.

**Tech Stack:** Python, shell commands

---

### Task 1: Remove gap truncation and add per-surah diagnostics

**Files:**
- Modify: `pipeline/src/merge/builder.py:76-99`

- [ ] **Step 1: Update generate_report to include per-surah stats and full gap list**

```python
def generate_report(surahs_data: list[dict]) -> dict:
    """Generate a coverage report after building all surahs."""
    total_ayahs = 0
    with_tafsir = 0
    without_tafsir = 0
    gaps = []
    per_surah = []

    for s in surahs_data:
        surah_ayahs = len(s["ayahs"])
        surah_with_tafsir = sum(1 for a in s["ayahs"] if a["tafsir_long"])
        total_ayahs += surah_ayahs
        with_tafsir += surah_with_tafsir
        
        for a in s["ayahs"]:
            if not a["tafsir_long"]:
                without_tafsir += 1
                gaps.append(f"{s['surah_id']}:{a['number']}")
        
        per_surah.append({
            "surah_id": s["surah_id"],
            "name": s["name"],
            "ayah_count": surah_ayahs,
            "with_tafsir": surah_with_tafsir,
            "coverage_pct": round(surah_with_tafsir / surah_ayahs * 100, 1) if surah_ayahs else 0,
        })

    return {
        "total_ayahs": total_ayahs,
        "with_tafsir": with_tafsir,
        "without_tafsir": without_tafsir,
        "coverage_pct": round(with_tafsir / total_ayahs * 100, 1) if total_ayahs else 0,
        "gaps": gaps,  # full list, no truncation
        "total_gaps": len(gaps),
        "per_surah": per_surah,
    }
```

- [ ] **Step 2: Run tests to verify no regressions**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run pytest`

Expected: All tests pass

---

### Task 2: Run full build for all 114 surahs

**Files:**
- Output: `pipeline/output/*.json`

- [ ] **Step 3: Run full build**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && uv run python -m src.main --all`

Expected: Builds all 114 surahs, generates `_report.json` with coverage stats

- [ ] **Step 4: Check coverage report**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/pipeline && cat output/_report.json | python -m json.tool | head -20`

Expected: Shows coverage percentage and gap count

---

### Task 3: Sync output to web/public/data

**Files:**
- Web data: `web/public/data/`

- [ ] **Step 5: Copy pipeline output to web data**

Run: `cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/web && npm run copy-data`

Expected: Copies all JSON files from pipeline/output/ to web/public/data/

- [ ] **Step 6: Verify sync**

Run: `ls /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi/web/public/data/ | wc -l`

Expected: ~116 files (114 surahs + _index.json + _report.json)

---

### Task 4: Commit and push

**Files:**
- None

- [ ] **Step 7: Commit all changes**

```bash
cd /media/islamux/Variety/JavaScriptProjects/tafseer-nabulsi
git add pipeline/src/merge/builder.py
git commit -m "feat: remove gap truncation, add per-surah diagnostics to report"
```

- [ ] **Step 8: Push to remote**

```bash
git push origin main
```
