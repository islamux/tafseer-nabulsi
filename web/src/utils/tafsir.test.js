import { describe, it, expect } from 'vitest'
import { parseTafsir } from './tafsir'

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
