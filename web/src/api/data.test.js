import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../utils/arabic', () => ({
  stripLeadingBasmala: vi.fn(text => text.replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '')),
}))

vi.mock('../utils/quran', () => ({
  hasSeparateBismillah: vi.fn(id => id !== 1 && id !== 9),
}))

describe('api/data', () => {
  let fetchJson, loadIndex, loadSurah

  beforeEach(async () => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn()
    vi.resetModules()
    const mod = await import('./data')
    fetchJson = mod.loadIndex ? mod : null
    loadIndex = mod.loadIndex
    loadSurah = mod.loadSurah
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('loadIndex', () => {
    it('fetches and returns index data', async () => {
      const mockIndex = [{ surah_id: 1, name: 'الفاتحة', ayah_count: 7 }]
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockIndex) })
      const result = await loadIndex()
      expect(result).toEqual(mockIndex)
    })

    it('caches index on second call', async () => {
      const mockIndex = [{ surah_id: 1, name: 'الفاتحة', ayah_count: 7 }]
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockIndex) })
      await loadIndex()
      await loadIndex()
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })

    it('throws on non-ok response', async () => {
      globalThis.fetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(loadIndex()).rejects.toThrow('500')
    })
  })

  describe('loadSurah', () => {
    it('fetches and normalizes surah data', async () => {
      const mockSurah = {
        surah_id: 2,
        name: 'البقرة',
        ayahs: [{ number: 1, text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ الم', tafsir_short: '', tafsir_long: '', media: {} }],
      }
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockSurah) })
      const result = await loadSurah(2)
      expect(result.ayahs[0].text).toBe('الم')
    })

    it('does not strip basmala for surah 1', async () => {
      const mockSurah = {
        surah_id: 1,
        name: 'الفاتحة',
        ayahs: [{ number: 1, text: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', tafsir_short: '', tafsir_long: '', media: {} }],
      }
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockSurah) })
      const result = await loadSurah(1)
      expect(result.ayahs[0].text).toContain('بِسْمِ')
    })

    it('caches surah on second call', async () => {
      const mockSurah = {
        surah_id: 3,
        name: 'آل عمران',
        ayahs: [{ number: 1, text: 'الم', tafsir_short: '', tafsir_long: '', media: {} }],
      }
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockSurah) })
      await loadSurah(3)
      await loadSurah(3)
      expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    })
  })
})
