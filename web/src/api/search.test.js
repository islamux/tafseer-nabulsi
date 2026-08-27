import { describe, it, expect, vi, afterEach } from 'vitest'
import { searchLocal, buildSearchIndex } from './search'

describe('searchLocal', () => {
  const mockIndex = [
    { surah_id: 1, surah_name: 'الفاتحة', ayah_number: 1, text: 'بسم الله', tafsir_short: 'مقدمة', tafsir_long: 'شرح مفصل' },
    { surah_id: 112, surah_name: 'الإخلاص', ayah_number: 1, text: 'قل هو الله احد', tafsir_short: 'توحيد', tafsir_long: 'شرح الاخلاص' },
    { surah_id: 67, surah_name: 'الملك', ayah_number: 1, text: 'تبارك الذي', tafsir_short: '', tafsir_long: 'تفصيل الملك' },
  ]

  it('returns empty array for empty query', () => {
    expect(searchLocal('', mockIndex)).toEqual([])
  })

  it('returns empty array for null index', () => {
    expect(searchLocal('test', null)).toEqual([])
  })

  it('matches text field', () => {
    const results = searchLocal('بسم', mockIndex)
    expect(results).toHaveLength(1)
    expect(results[0].text).toBe('بسم الله')
  })

  it('matches tafsir_short field', () => {
    const results = searchLocal('توحيد', mockIndex)
    expect(results).toHaveLength(1)
  })

  it('matches tafsir_long field', () => {
    const results = searchLocal('تفصيل', mockIndex)
    expect(results).toHaveLength(1)
    expect(results[0].text).toBe('تبارك الذي')
  })

  it('caps results at 50', () => {
    const bigIndex = Array.from({ length: 60 }, (_, i) => ({
      surah_id: 1, surah_name: 'test', ayah_number: i + 1,
      text: `آية ${i}`, tafsir_short: '', tafsir_long: '',
    }))
    const results = searchLocal('آية', bigIndex)
    expect(results).toHaveLength(50)
  })

  it('returns surah metadata in results', () => {
    const results = searchLocal('بسم', mockIndex)
    expect(results[0].surah_id).toBe(1)
    expect(results[0].surah_name).toBe('الفاتحة')
    expect(results[0].ayah_number).toBe(1)
  })

  it('is case insensitive via pre-normalized index', () => {
    const index = [
      { surah_id: 1, surah_name: 'test', ayah_number: 1, text: 'بسم الله', tafsir_short: '', tafsir_long: '' },
    ]
    expect(searchLocal('بسم', index)).toHaveLength(1)
  })
})

describe('buildSearchIndex', () => {
  afterEach(() => vi.restoreAllMocks())

  it('fetches _search_index.json from DATA_BASE', async () => {
    vi.resetModules()
    const { buildSearchIndex: freshBuild } = await import('./search')
    const fakeIndex = [
      { surah_id: 1, surah_name: 'الفاتحة', ayah_number: 1, text: 'بسم الله', tafsir_short: '', tafsir_long: '' },
    ]
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => fakeIndex,
    })
    const result = await freshBuild()
    expect(result).toEqual(fakeIndex)
    expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining('_search_index.json'))
  })
})
