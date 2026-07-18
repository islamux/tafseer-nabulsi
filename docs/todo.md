# Todo

## Completed

- [x] Create plan to complete missing ayahs and tafseer (branch: `fix/close-remaining-gaps`)
  - Range inheritance in builder.py — uncovered ayahs inherit from nearest covering range
  - Parser improvements for edge cases (comma-separated, bare numbers)
  - Full pipeline rebuild: **100% coverage (6236/6236 ayahs, 0 gaps)**
  - All 16 web tests pass, production build succeeds

## Open

(none)

## Done (this session)

- [x] Improve ayah/text formatting on surah/1 (best practices for Arabic text rendering)
  - Bismillah on a separate line: `BismillahHeader` for surahs ≠ 1,9; Al-Fatiha verse 1 styled as basmala header (no duplication); At-Tawbah (9) excluded per sunnah
  - Verse color: new `--verse-text` / `--verse-glyph` tokens (light/dark/sepia), wired via `tailwind.config.js` (`text-verse`, `text-verse-glyph`) — Tailwind SSOT usage, CSS vars remain for 3-theme switching
  - Readable text division: TDD `splitAyahSegments()` breaks long verses at Quranic waqf marks (`ۖۗۘۙۚۛۜ`); max-width column on tafsir block; larger line-height
  - Typography: `font-kerning`, `font-variant-ligatures`, `text-rendering` on `.arabic-text`
  - Tests: 21 pass (16 → 21), production build succeeds
