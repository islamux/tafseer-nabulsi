# Ayah & Text Formatting — Summary

> Session: 2026-07-18
> Goal: Improve Arabic text rendering on `surah/1` following best practices from major Quran sites (quran.com et al.)

## Decisions (from user input + best-practice research)

| Requirement | Decision |
|---|---|
| 1. Bismillah on its own line | `BismillahHeader` component; rendered for all surahs except Al-Fatiha (verse 1 is the basmala — no duplication) and At-Tawbah (9, per sunnah) |
| 2. Verse text in a different color | New `--verse-text` / `--verse-glyph` tokens (dark olive-green, light variant for dark theme), tafsir stays lighter |
| 3. Comfortably readable text | Both: readable column/max-width **and** breaking long verses at Quranic waqf marks (`ۖۗۘۙۚۛۜ`) |
| Styling approach | Tailwind SSOT for new/modified components only; CSS variables remain for 3-theme switching |

## Files Changed (7)

| File | Change |
|---|---|
| `web/src/utils/arabic.js` | New `splitAyahSegments()` — splits verse text at Quranic pause marks, keeps mark with preceding segment |
| `web/src/utils/arabic.test.js` | 5 new TDD tests (RED → GREEN): no marks, empty, single mark, multiple marks, all waqf marks |
| `web/src/index.css` | `--verse-text` / `--verse-glyph` for light/dark/sepia; typography on `.arabic-text` (`font-kerning`, `font-variant-ligatures`, `text-rendering`); removed leftover `.basmalah-ayah` |
| `web/tailwind.config.js` | Registered `verse` + `verse-glyph` colors mapped to CSS vars (`text-verse`, `text-verse-glyph`) |
| `web/src/components/BismillahHeader.jsx` | **New** — reusable basmala header on its own line |
| `web/src/components/AyahCard.jsx` | Verse color (`text-verse`), segment breaking via `splitAyahSegments`, basmala styling for Al-Fatiha verse 1 |
| `web/src/components/SurahView.jsx` | Conditional `<BismillahHeader />` — shown when `surahId !== 1 && surahId !== 9` |

## Key Implementation Details

### `splitAyahSegments(text)` — `web/src/utils/arabic.js`
- Splits at Unicode waqf marks U+06D6–U+06DC, U+06DE
- Keeps each mark attached to its preceding segment
- Trims whitespace around segments
- Returns single-element array when no marks present

### Bismillah rendering rules
- **Surah 1 (Al-Fatiha):** verse 1 *is* the basmala → styled in-place as a prominent header (larger font, `text-3xl leading-[2.6]`), retains its number badge + tafsir button. No separate generic header (would duplicate).
- **Surah 9 (At-Tawbah):** no basmala per sunnah → no header.
- **All other surahs:** `<BismillahHeader />` renders the decorative, unnumbered basmala line.

### Verse color tokens
| Theme | `--verse-text` | `--verse-glyph` |
|---|---|---|
| Light | `#14241c` (dark forest) | `#1b5e20` |
| Dark | `#d4e8db` (soft green) | `#4db6ac` |
| Sepia | `#2d3b2e` | `#00796b` |

## Verification
- `pnpm test`: **21/21 pass** (16 → 21, +5 new TDD tests)
- `pnpm build`: succeeds (60 modules, 11.35 kB CSS, 247.54 kB JS)

## How this follows best practice
- **Bismillah as unnumbered header line** = quran.com convention; neutral across scholarly schools on whether basmala is verse 1.
- **No duplication for Al-Fatiha** = our data counts basmala as verse 1 with its own tafsir, so it's styled as the header rather than repeated.
- **Distinct verse color** = clear visual separation between revealed text (verse) and human explanation (tafsir).
- **Breaking at waqf marks** = driven by the Quranic text itself, not heuristics.

## Status
Complete. Updated `docs/todo.md` to reflect this work.
