import { describe, it, expect } from 'vitest'
import { searchLocal } from './search'

describe('searchLocal', () => {
  const mockIndex = [
    { text: 'الحمد لله', tafsir_short: 'تفسير 1', tafsir_long: 'شرح كامل' },
    { text: 'قل هو الله أحد', tafsir_short: 'تفسير 2', tafsir_long: 'شرح الإخلاص' },
    { text: 'تبارك الذي', tafsir_short: '', tafsir_long: 'تفصيل الملك' },
  ]

  it('returns empty array for empty query', () => {
    expect(searchLocal('', mockIndex)).toEqual([])
  })

  it('returns empty array for null index', () => {
    expect(searchLocal('test', null)).toEqual([])
  })

  it('matches text field', () => {
    const results = searchLocal('الحمد', mockIndex)
    expect(results).toHaveLength(1)
    expect(results[0].text).toBe('الحمد لله')
  })

  it('matches tafsir_short field', () => {
    const results = searchLocal('تفسير', mockIndex)
    expect(results).toHaveLength(2)
  })

  it('matches tafsir_long field', () => {
    const results = searchLocal('تفصيل', mockIndex)
    expect(results).toHaveLength(1)
    expect(results[0].text).toBe('تبارك الذي')
  })

  it('caps results at 50', () => {
    const bigIndex = Array.from({ length: 60 }, (_, i) => ({
      text: `آية ${i}`,
      tafsir_short: '',
      tafsir_long: '',
    }))
    const results = searchLocal('آية', bigIndex)
    expect(results).toHaveLength(50)
  })
})
