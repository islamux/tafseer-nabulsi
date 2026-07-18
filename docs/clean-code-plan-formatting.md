# Clean Code Plan — Formatting Round (Round 2)

> Audit of the recent Arabic-text-formatting work (commit `0e5cca7`) using the `clean-code-guard` skill.
> Round 1 (`docs/clean-code-plan.md`) cleaned the original codebase. This round audits **only the new/changed code** from the formatting feature.

Scope: `arabic.js`, `tafsir.js`, `data.js`, `AyahCard.jsx`, `SurahView.jsx`, `BismillahHeader.jsx`, `TafsirText.jsx`.

Execution order: **P1 → P2 → P3** (kill duplication of knowledge first, then SRP, then consistency).

---

## P1 — DRY: duplicated knowledge (rule 11) [HIGH]

The same domain/range knowledge is expressed in multiple places.

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| D1 | Waqf-mark Unicode range `\u06d6-\u06dc\u06de` written twice: inline in split regex **and** in `WAQF_MARKS` constant. If the mark set changes, both must update. | `arabic.js:4` + `arabic.js:8` | Extract `const WAQF_MARKS_SRC = '\\u06d6-\\u06dc\\u06de'`; build both the `WAQF_MARKS` test regex and the split regex from it. One source of truth. |
| D2 | Bracket glyph size `1.15em` hardcoded twice (opening + closing `﴿﴾`). | `AyahCard.jsx:23,32` | Extract a CSS class `.verse-bracket { font-size: 1.15em }` or a local `const BRACKET_SCALE = '1.15em'`. |
| D3 | Surah-number badge uses inline `backgroundColor: var(--accent); color: var(--text-on-accent)` — this is **exactly** the `.badge-accent` class established in Round 1. | `SurahView.jsx:60` | Replace inline style with `badge-accent` class. |
| D4 | `text-secondary` color applied via inline style instead of the `.text-secondary` class that exists for this. | `SurahView.jsx:67` | Use `className="... text-secondary"`. |
| D5 | **Domain rule spread:** "surah 1 basmala = verse 1, surah 9 = no basmala" is encoded in 3 places: `SurahView.jsx:76` (`!== 1 && !== 9`), `data.js:21` (`id !== 1`), `AyahCard.jsx:13` (`surahId === 1`). | scattered | Add `web/src/utils/quran.js` with `hasSeparateBismillah(surahId)` (= `id !== 1 && id !== 9`) and `bismalaIsVerseOne(surahId)` (= `id === 1`). All three call sites use the helpers. |

---

## P2 — SRP: loadSurah does fetch + transform (rule 7) [HIGH]

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| S1 | `loadSurah` now has two responsibilities: fetch+cache **and** basmala-content transformation. Display/normalization logic lives in the data-access layer. | `data.js:16-26` | Extract `function normalizeSurah(surahData, id)` that applies the basmala strip (and future per-surah normalization). `loadSurah` calls it once after fetch. Keeps fetch concern separate from transform concern; both stay in the API module but are individually testable. |

---

## P3 — Consistency / dead code / defensive guards [MEDIUM]

| ID | Issue | Location | Fix |
|----|-------|----------|-----|
| C1 | Unused `arr` parameter in reduce callback. | `arabic.js:8` `(acc, part, i, arr)` | Drop `arr` — reduce only needs `(acc, part, i)`. |
| C2 | Over-defensive `typeof text !== 'string'` guard. Callers always pass strings (JSON `ayah.text` or test strings); the `!text` null-guard already covers null/undefined (documented by tests). | `arabic.js:23` | Drop the typeof check; keep `if (!text) return text`. Trust the contract (rule 16). |
| C3 | Inline `lineHeight: 1` — Tailwind has `leading-none` for this. | `AyahCard.jsx:36` | Replace with `leading-none` class. |
| C4 | Inline `borderColor: var(--border)` on every AyahCard. | `AyahCard.jsx:18` | Add `.ayah-border { border-color: var(--border) }` component class, use alongside `border-b`. (Borderline — only one site, but the pattern repeats conceptually.) |
| C5 | Index-based React `key={i}` in TafsirText paragraph list. | `TafsirText.jsx:11` | Acceptable for a static list (paragraphs never reorder), but prefix the key for clarity: `key={`p${i}`}`. Low priority. |

---

## What passed the audit (no action)

- **`splitTafsirParagraphs`** (`tafsir.js`) — clean, single responsibility, testable, no magic leaks. ✓
- **`TafsirText.jsx`** / **`BismillahHeader.jsx`** — small, focused, composed (stitch pattern). ✓
- **No AI failure modes:** no swallowed errors (#15), no hardcoded success returns (#18), imports verified (#17), boundary cases covered by tests incl. the trailing-kasra case caught during TDD (#20). ✓
- **Tests:** 33/33, TDD throughout, real behavior not mocks. ✓
- **No comments added** (matches AGENTS.md convention). ✓

---

## Verification

After each phase: `pnpm test` (must stay 33/33) + `pnpm build`.

- P1 is pure refactor — observable behavior unchanged (same renders, same test output).
- P2 is pure refactor — `loadSurah` returns identical data; `normalizeSurah` is internal.
- P3 is cleanup — no behavior change.

All three phases preserve observable behavior (rule 23). No bug fixes bundled.
