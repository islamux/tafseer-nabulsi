import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('api/worker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn()
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('getDeviceId', () => {
    it('returns null when API_BASE is empty', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', '')
      const { getDeviceId } = await import('./worker')
      expect(getDeviceId()).toBeNull()
    })
  })

  describe('fetchBookmarks', () => {
    it('returns bookmarks array on success', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { fetchBookmarks } = await import('./worker')
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ bookmarks: [{ surah_id: 1, ayah_number: 1 }] }),
      })
      const result = await fetchBookmarks('test-device-id')
      expect(result).toEqual([{ surah_id: 1, ayah_number: 1 }])
    })

    it('returns null on fetch error', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { fetchBookmarks } = await import('./worker')
      globalThis.fetch.mockRejectedValue(new Error('network'))
      const result = await fetchBookmarks('test-device-id')
      expect(result).toBeNull()
    })

    it('returns null on non-ok response', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { fetchBookmarks } = await import('./worker')
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'internal' }),
      })
      const result = await fetchBookmarks('test-device-id')
      expect(result).toBeNull()
    })
  })

  describe('addBookmark', () => {
    it('sends POST with correct body', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { addBookmark } = await import('./worker')
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      await addBookmark('dev-1', 2, 5)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/bookmarks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ device_id: 'dev-1', surah_id: 2, ayah_number: 5 }),
        })
      )
    })
  })

  describe('removeBookmark', () => {
    it('sends DELETE with correct body', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { removeBookmark } = await import('./worker')
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      await removeBookmark('dev-1', 2, 5)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/bookmarks',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ device_id: 'dev-1', surah_id: 2, ayah_number: 5 }),
        })
      )
    })
  })

  describe('fetchProgress', () => {
    it('returns progress on success', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { fetchProgress } = await import('./worker')
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ progress: [{ surah_id: 1, ayah_number: 7 }] }),
      })
      const result = await fetchProgress('dev-1')
      expect(result).toEqual([{ surah_id: 1, ayah_number: 7 }])
    })
  })

  describe('saveProgress', () => {
    it('sends PUT with correct body', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { saveProgress } = await import('./worker')
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      await saveProgress('dev-1', 3, 10)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/progress',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ device_id: 'dev-1', surah_id: 3, last_ayah_number: 10 }),
        })
      )
    })
  })
})
