const ALLOWED_ORIGINS = [
  'https://islamux.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors },
  })
}

function error(msg, status, cors) {
  return json({ error: msg }, status, cors)
}

async function parseBody(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

function isValidSurah(n) {
  return Number.isInteger(n) && n >= 1 && n <= 114
}

function isValidAyah(n) {
  return Number.isInteger(n) && n > 0
}

function isValidDeviceId(id) {
  return typeof id === 'string' && id.length >= 8 && id.length <= 128
}

async function signDeviceId(deviceId, secret) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(deviceId))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function verifyToken(token, secret) {
  const dotIndex = token.lastIndexOf('.')
  if (dotIndex === -1) return null
  const deviceId = token.slice(0, dotIndex)
  const providedSig = token.slice(dotIndex + 1)
  const expectedSig = await signDeviceId(deviceId, secret)
  if (providedSig.length !== expectedSig.length) return null
  let mismatch = 0
  for (let i = 0; i < providedSig.length; i++) {
    mismatch |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
  }
  if (mismatch !== 0) return null
  if (!isValidDeviceId(deviceId)) return null
  return deviceId
}

async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  return verifyToken(token, env.DEVICE_SECRET)
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '')

    try {
      if (path === '/api/bookmarks' && request.method === 'GET') {
        const deviceId = await authenticate(request, env)
        if (!deviceId) return error('authentication required', 401, cors)
        const { results } = await env.DB.prepare(
          'SELECT surah_id, ayah_number, created_at FROM bookmarks WHERE device_id = ? ORDER BY surah_id, ayah_number'
        ).bind(deviceId).all()
        return json({ bookmarks: results }, 200, cors)
      }

      if (path === '/api/bookmarks' && request.method === 'POST') {
        const deviceId = await authenticate(request, env)
        if (!deviceId) return error('authentication required', 401, cors)
        const body = await parseBody(request)
        if (!body) return error('invalid JSON body', 400, cors)
        const { surah_id, ayah_number } = body
        if (!isValidSurah(surah_id) || !isValidAyah(ayah_number)) {
          return error('surah_id (1-114) and ayah_number (>0) required', 400, cors)
        }
        await env.DB.prepare(
          'INSERT OR IGNORE INTO bookmarks (device_id, surah_id, ayah_number) VALUES (?, ?, ?)'
        ).bind(deviceId, surah_id, ayah_number).run()
        return json({ ok: true }, 201, cors)
      }

      if (path === '/api/bookmarks' && request.method === 'DELETE') {
        const deviceId = await authenticate(request, env)
        if (!deviceId) return error('authentication required', 401, cors)
        const body = await parseBody(request)
        if (!body) return error('invalid JSON body', 400, cors)
        const { surah_id, ayah_number } = body
        if (!isValidSurah(surah_id) || !isValidAyah(ayah_number)) {
          return error('surah_id (1-114) and ayah_number (>0) required', 400, cors)
        }
        await env.DB.prepare(
          'DELETE FROM bookmarks WHERE device_id = ? AND surah_id = ? AND ayah_number = ?'
        ).bind(deviceId, surah_id, ayah_number).run()
        return json({ ok: true }, 200, cors)
      }

      if (path === '/api/progress' && request.method === 'GET') {
        const deviceId = await authenticate(request, env)
        if (!deviceId) return error('authentication required', 401, cors)
        const { results } = await env.DB.prepare(
          'SELECT surah_id, last_ayah_number, updated_at FROM reading_progress WHERE device_id = ? ORDER BY surah_id'
        ).bind(deviceId).all()
        return json({ progress: results }, 200, cors)
      }

      if (path === '/api/progress' && request.method === 'PUT') {
        const deviceId = await authenticate(request, env)
        if (!deviceId) return error('authentication required', 401, cors)
        const body = await parseBody(request)
        if (!body) return error('invalid JSON body', 400, cors)
        const { surah_id, last_ayah_number } = body
        if (!isValidSurah(surah_id) || !isValidAyah(last_ayah_number)) {
          return error('surah_id (1-114) and last_ayah_number (>0) required', 400, cors)
        }
        await env.DB.prepare(
          `INSERT INTO reading_progress (device_id, surah_id, last_ayah_number, updated_at)
           VALUES (?, ?, ?, datetime('now'))
           ON CONFLICT(device_id, surah_id) DO UPDATE
           SET last_ayah_number = excluded.last_ayah_number, updated_at = excluded.updated_at`
        ).bind(deviceId, surah_id, last_ayah_number).run()
        return json({ ok: true }, 200, cors)
      }

      return error('not found', 404, cors)
    } catch (err) {
      console.error('Worker error:', err.message)
      return json({ error: 'internal error' }, 500, cors)
    }
  },
}
