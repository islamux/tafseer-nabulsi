import { describe, it, expect } from 'vitest'
import { parseTafsir, splitTafsirParagraphs } from './tafsir'

describe('parseTafsir', () => {
  it('extracts year and body from date-prefixed tafsir', () => {
    const input = '1985-09-06 الحمد لله رب العالمين'
    const { year, body } = parseTafsir(input)
    expect(year).toBe('1985')
    expect(body).toBe('الحمد لله رب العالمين')
  })

  it('returns null year when no date prefix', () => {
    const input = 'الحمد لله رب العالمين'
    const { year, body } = parseTafsir(input)
    expect(year).toBeNull()
    expect(body).toBe(input)
  })

  it('handles empty string', () => {
    const { year, body } = parseTafsir('')
    expect(year).toBeNull()
    expect(body).toBe('')
  })
})

describe('splitTafsirParagraphs', () => {
  it('returns empty array for empty or whitespace-only string', () => {
    expect(splitTafsirParagraphs('')).toEqual([])
    expect(splitTafsirParagraphs('   ')).toEqual([])
  })

  it('returns single paragraph for one sentence', () => {
    expect(splitTafsirParagraphs('الحمد لله رب العالمين.'))
      .toEqual(['الحمد لله رب العالمين.'])
  })

  it('groups short sentences into one paragraph', () => {
    const text = 'جملة أولى. جملة ثانية. جملة ثالثة.'
    expect(splitTafsirParagraphs(text)).toEqual([text])
  })

  it('splits into multiple paragraphs when exceeding max length', () => {
    const text = 'جملة طويلة جدا هنا. '.repeat(10).trim()
    const paras = splitTafsirParagraphs(text, 60)
    expect(paras.length).toBeGreaterThan(1)
    paras.forEach(p => expect(p.length).toBeLessThan(120))
  })

  it('strips trailing "الملف مدقق" meta marker', () => {
    const text = 'التفسير الحقيقي هنا. الملف مدقق والحمد لله رب العالمين'
    expect(splitTafsirParagraphs(text)).toEqual(['التفسير الحقيقي هنا.'])
  })

  it('splits on Arabic question mark and exclamation', () => {
    const paras = splitTafsirParagraphs('هل فهمت؟ نعم! جيد جدا.', 5)
    expect(paras).toHaveLength(3)
  })
})
