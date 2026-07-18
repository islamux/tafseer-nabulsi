import { describe, it, expect } from 'vitest'
import { toArabicNum, splitAyahSegments, stripLeadingBasmala } from './arabic'

describe('toArabicNum', () => {
  it('converts single digit', () => {
    expect(toArabicNum(0)).toBe('٠')
    expect(toArabicNum(5)).toBe('٥')
    expect(toArabicNum(9)).toBe('٩')
  })

  it('converts multi-digit numbers', () => {
    expect(toArabicNum(123)).toBe('١٢٣')
    expect(toArabicNum(286)).toBe('٢٨٦')
  })

  it('converts string input with embedded digits', () => {
    expect(toArabicNum('سورة 2 الآية 14')).toBe('سورة ٢ الآية ١٤')
  })

  it('returns string without digits unchanged', () => {
    expect(toArabicNum('بسم الله')).toBe('بسم الله')
  })
})

describe('splitAyahSegments', () => {
  it('returns single segment when text has no pause marks', () => {
    expect(splitAyahSegments('بسم الله الرحمن الرحيم'))
      .toEqual(['بسم الله الرحمن الرحيم'])
  })

  it('wraps empty string in a single-element array', () => {
    expect(splitAyahSegments('')).toEqual([''])
  })

  it('keeps a single pause mark attached to the preceding segment', () => {
    expect(splitAyahSegments('أَوَّلٌۖ وَثَانٍ'))
      .toEqual(['أَوَّلٌۖ', 'وَثَانٍ'])
  })

  it('splits at multiple pause marks and trims whitespace around segments', () => {
    expect(splitAyahSegments('ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَۖ فِيهِۗ هُدًى'))
      .toEqual([
        'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَۖ',
        'فِيهِۗ',
        'هُدًى',
      ])
  })

  it('splits at each of the different waqf marks', () => {
    expect(splitAyahSegments('أَوَّلٌۖ ثَانٍۗ ثَالِثٌۘ'))
      .toEqual(['أَوَّلٌۖ', 'ثَانٍۗ', 'ثَالِثٌۘ'])
  })
})

describe('stripLeadingBasmala', () => {
  it('returns text unchanged when no basmala prefix', () => {
    expect(stripLeadingBasmala('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'))
      .toBe('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ')
  })

  it('returns null/undefined unchanged', () => {
    expect(stripLeadingBasmala(null)).toBeNull()
    expect(stripLeadingBasmala(undefined)).toBeUndefined()
  })

  it('returns empty string unchanged', () => {
    expect(stripLeadingBasmala('')).toBe('')
  })

  it('strips basmala with alef-wasla and standard diacritics (surah 2 style)', () => {
    const text = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الٓمٓ'
    expect(stripLeadingBasmala(text)).toBe('الٓمٓ')
  })

  it('strips basmala with shadda variant (surah 95/97 style)', () => {
    const text = 'بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ وَٱلتِّينِ'
    expect(stripLeadingBasmala(text)).toBe('وَٱلتِّينِ')
  })

  it('returns empty string when text is basmala only (surah 1 verse 1)', () => {
    const text = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
    expect(stripLeadingBasmala(text)).toBe('')
  })
})
