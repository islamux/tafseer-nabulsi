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

    it('generates and stores a new token on first call', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { getDeviceId } = await import('./worker')
      const id = getDeviceId()
      expect(id).toBeTruthy()
      expect(typeof id).toBe('string')
      expect(localStorage.getItem('tafsir-device-token')).toBe(id)
    })

    it('returns stored token on subsequent calls', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { getDeviceId } = await import('./worker')
      const first = getDeviceId()
      const second = getDeviceId()
      expect(first).toBe(second)
    })

    it('migrates legacy device_id to token', async () => {
      localStorage.setItem('tafsir-device-id', 'old-uuid-value')
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { getDeviceId } = await import('./worker')
      const id = getDeviceId()
      expect(id).toBe('old-uuid-value')
      expect(localStorage.getItem('tafsir-device-token')).toBe('old-uuid-value')
    })

    it('returns null when localStorage throws', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { getDeviceId } = await import('./worker')
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('private') })
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
      const result = await fetchBookmarks('test-token')
      expect(result).toEqual([{ surah_id: 1, ayah_number: 1 }])
      const [, opts] = globalThis.fetch.mock.calls[0]
      expect(opts.headers['Authorization']).toBe('Bearer test-token')
    })

    it('returns null on fetch error', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { fetchBookmarks } = await import('./worker')
      globalThis.fetch.mockRejectedValue(new Error('network'))
      const result = await fetchBookmarks('test-token')
      expect(result).toBeNull()
    })

    it('returns null on non-ok response', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { fetchBookmarks } = await import('./worker')
      globalThis.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'auth required' }),
      })
      const result = await fetchBookmarks('bad-token')
      expect(result).toBeNull()
    })
  })

  describe('addBookmark', () => {
    it('sends POST with Authorization header and correct body', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { addBookmark } = await import('./worker')
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      await addBookmark('my-token', 2, 5)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/bookmarks',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
          body: JSON.stringify({ surah_id: 2, ayah_number: 5 }),
        })
      )
    })
  })

  describe('removeBookmark', () => {
    it('sends DELETE with Authorization header', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { removeBookmark } = await import('./worker')
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      await removeBookmark('my-token', 2, 5)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/bookmarks',
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
          body: JSON.stringify({ surah_id: 2, ayah_number: 5 }),
        })
      )
    })
  })

  describe('fetchProgress', () => {
    it('sends GET with Authorization header', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { fetchProgress } = await import('./worker')
      globalThis.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ progress: [{ surah_id: 1, last_ayah_number: 7 }] }),
      })
      const result = await fetchProgress('my-token')
      expect(result).toEqual([{ surah_id: 1, last_ayah_number: 7 }])
      const [url, opts] = globalThis.fetch.mock.calls[0]
      expect(url).toContain('/progress')
      expect(opts.headers['Authorization']).toBe('Bearer my-token')
    })
  })

  describe('saveProgress', () => {
    it('sends PUT with Authorization header', async () => {
      vi.resetModules()
      vi.stubEnv('VITE_API_BASE', 'https://example.com/api')
      const { saveProgress } = await import('./worker')
      globalThis.fetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
      await saveProgress('my-token', 3, 10)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://example.com/api/progress',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({ Authorization: 'Bearer my-token' }),
          body: JSON.stringify({ surah_id: 3, last_ayah_number: 10 }),
        })
      )
    })
  })
})
