import { describe, it, expect } from 'vitest'
import { searchLocal } from './search'

describe('searchLocal', () => {
  const mockIndex = [
    { text: 'الحمد لله', tafsir_short: 'تفسير 1', tafsir_long: 'شرح كامل' },
    { text: 'قل هو الله احد', tafsir_short: 'تفسير 2', tafsir_long: 'شرح الاخلاص' },
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
      text: `اية ${i}`,
      tafsir_short: '',
      tafsir_long: '',
    }))
    const results = searchLocal('اية', bigIndex)
    expect(results).toHaveLength(50)
  })

  it('matches diacritized text with undiacritized query', () => {
    const vocalizedIndex = [
      { text: 'بسم الله الرحمن الرحيم', tafsir_short: '', tafsir_long: '' },
    ]
    const results = searchLocal('بسم الله', vocalizedIndex)
    expect(results).toHaveLength(1)
  })

  it('matches alef-madda and alef-hamza variants', () => {
    const index = [
      { text: 'امن الرسول', tafsir_short: '', tafsir_long: '' },
    ]
    expect(searchLocal('امن', index)).toHaveLength(1)
  })

  it('matches diacritized tafsir_short field', () => {
    const index = [
      { text: 'some text', tafsir_short: 'تفسير مبسط', tafsir_long: '' },
    ]
    expect(searchLocal('تفسير مبسط', index)).toHaveLength(1)
  })
})
