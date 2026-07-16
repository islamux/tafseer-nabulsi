import { describe, it, expect } from 'vitest'
import { toArabicNum } from './arabic'

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
