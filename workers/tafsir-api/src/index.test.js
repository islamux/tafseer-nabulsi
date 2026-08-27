import { describe, it, expect, vi, beforeEach } from 'vitest'
import worker from './index.js'

function makeRequest(path, opts = {}) {
  const url = `https://worker.dev${path}`
  return new Request(url, {
    method: opts.method || 'GET',
    headers: {
      Origin: 'http://localhost:5173',
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
}

function mockDB() {
  const chain = {
    bind: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue({ results: [] }),
    run: vi.fn().mockResolvedValue({}),
    first: vi.fn().mockResolvedValue(null),
  }
  return { prepare: vi.fn(() => chain) }
}

describe('Worker API', () => {
  let db

  beforeEach(() => {
    db = mockDB()
  })

  async function handle(path, opts = {}) {
    const req = makeRequest(path, opts)
    return worker.fetch(req, { DB: db })
  }

  describe('CORS', () => {
    it('returns 204 on OPTIONS', async () => {
      const res = await handle('/api/bookmarks', { method: 'OPTIONS' })
      expect(res.status).toBe(204)
    })

    it('allows known origin', async () => {
      const res = await handle('/api/bookmarks')
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
    })

    it('falls back to first allowed origin for unknown', async () => {
      const req = makeRequest('/api/bookmarks', { headers: { Origin: 'https://evil.com' } })
      const res = await worker.fetch(req, { DB: db })
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://islamux.github.io')
    })
  })

  describe('Authentication', () => {
    it('returns 401 without Authorization header', async () => {
      const res = await handle('/api/bookmarks')
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toBe('authentication required')
    })

    it('returns 401 with malformed Bearer token', async () => {
      const res = await handle('/api/bookmarks', {
        headers: { Authorization: 'Basic abc' },
      })
      expect(res.status).toBe(401)
    })

    it('accepts valid Bearer token', async () => {
      const res = await handle('/api/bookmarks', {
        headers: { Authorization: 'Bearer test-device-id' },
      })
      expect(res.status).toBe(200)
    })
  })

  describe('Routing', () => {
    it('returns 404 for unknown path', async () => {
      const res = await handle('/api/unknown', {
        headers: { Authorization: 'Bearer test' },
      })
      expect(res.status).toBe(404)
    })

    it('returns 404 for wrong method', async () => {
      const res = await handle('/api/bookmarks', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer test' },
      })
      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/bookmarks', () => {
    it('returns bookmarks list', async () => {
      db.prepare().all.mockResolvedValue({
        results: [{ surah_id: 1, ayah_number: 1 }],
      })
      const res = await handle('/api/bookmarks', {
        headers: { Authorization: 'Bearer device-12345678' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.bookmarks).toHaveLength(1)
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('FROM bookmarks WHERE device_id')
      )
    })
  })

  describe('POST /api/bookmarks', () => {
    it('creates a bookmark', async () => {
      const res = await handle('/api/bookmarks', {
        method: 'POST',
        headers: { Authorization: 'Bearer device-12345678' },
        body: { surah_id: 1, ayah_number: 1 },
      })
      expect(res.status).toBe(201)
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO bookmarks')
      )
    })

    it('rejects invalid surah_id', async () => {
      const res = await handle('/api/bookmarks', {
        method: 'POST',
        headers: { Authorization: 'Bearer device-12345678' },
        body: { surah_id: 0, ayah_number: 1 },
      })
      expect(res.status).toBe(400)
    })

    it('rejects missing body', async () => {
      const req = makeRequest('/api/bookmarks', {
        method: 'POST',
        headers: { Authorization: 'Bearer device-12345678' },
      })
      const res = await worker.fetch(req, { DB: db })
      expect(res.status).toBe(400)
    })
  })

  describe('DELETE /api/bookmarks', () => {
    it('deletes a bookmark', async () => {
      const res = await handle('/api/bookmarks', {
        method: 'DELETE',
        headers: { Authorization: 'Bearer device-12345678' },
        body: { surah_id: 1, ayah_number: 1 },
      })
      expect(res.status).toBe(200)
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM bookmarks')
      )
    })
  })

  describe('GET /api/progress', () => {
    it('returns progress list', async () => {
      db.prepare().all.mockResolvedValue({
        results: [{ surah_id: 2, last_ayah_number: 50 }],
      })
      const res = await handle('/api/progress', {
        headers: { Authorization: 'Bearer device-12345678' },
      })
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.progress).toHaveLength(1)
    })
  })

  describe('PUT /api/progress', () => {
    it('saves progress', async () => {
      const res = await handle('/api/progress', {
        method: 'PUT',
        headers: { Authorization: 'Bearer device-12345678' },
        body: { surah_id: 2, last_ayah_number: 50 },
      })
      expect(res.status).toBe(200)
      expect(db.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO reading_progress')
      )
    })

    it('rejects invalid last_ayah_number', async () => {
      const res = await handle('/api/progress', {
        method: 'PUT',
        headers: { Authorization: 'Bearer device-12345678' },
        body: { surah_id: 2, last_ayah_number: 0 },
      })
      expect(res.status).toBe(400)
    })
  })

  describe('Error handling', () => {
    it('returns 500 on DB failure', async () => {
      db.prepare().all.mockRejectedValue(new Error('DB connection lost'))
      const res = await handle('/api/bookmarks', {
        headers: { Authorization: 'Bearer device-12345678' },
      })
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body.error).toBe('internal error')
    })
  })
})
