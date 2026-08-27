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

async function authenticate(request, env) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}

function validateBookmark(body) {
  if (!body) return 'invalid JSON body'
  if (!isValidSurah(body.surah_id) || !isValidAyah(body.ayah_number)) {
    return 'surah_id (1-114) and ayah_number (>0) required'
  }
  return null
}

function validateProgress(body) {
  if (!body) return 'invalid JSON body'
  if (!isValidSurah(body.surah_id) || !isValidAyah(body.last_ayah_number)) {
    return 'surah_id (1-114) and last_ayah_number (>0) required'
  }
  return null
}

const routes = [
  { method: 'GET', path: '/api/bookmarks', handler: async (request, env, deviceId, cors) => {
    const { results } = await env.DB.prepare(
      'SELECT surah_id, ayah_number, created_at FROM bookmarks WHERE device_id = ? ORDER BY surah_id, ayah_number LIMIT 500'
    ).bind(deviceId).all()
    return json({ bookmarks: results }, 200, cors)
  }},
  { method: 'POST', path: '/api/bookmarks', handler: async (request, env, deviceId, cors) => {
    const body = await parseBody(request)
    const err = validateBookmark(body)
    if (err) return error(err, 400, cors)
    await env.DB.prepare(
      'INSERT OR IGNORE INTO bookmarks (device_id, surah_id, ayah_number) VALUES (?, ?, ?)'
    ).bind(deviceId, body.surah_id, body.ayah_number).run()
    return json({ ok: true }, 201, cors)
  }},
  { method: 'DELETE', path: '/api/bookmarks', handler: async (request, env, deviceId, cors) => {
    const body = await parseBody(request)
    const err = validateBookmark(body)
    if (err) return error(err, 400, cors)
    await env.DB.prepare(
      'DELETE FROM bookmarks WHERE device_id = ? AND surah_id = ? AND ayah_number = ?'
    ).bind(deviceId, body.surah_id, body.ayah_number).run()
    return json({ ok: true }, 200, cors)
  }},
  { method: 'GET', path: '/api/progress', handler: async (request, env, deviceId, cors) => {
    const { results } = await env.DB.prepare(
      'SELECT surah_id, last_ayah_number, updated_at FROM reading_progress WHERE device_id = ? ORDER BY surah_id LIMIT 500'
    ).bind(deviceId).all()
    return json({ progress: results }, 200, cors)
  }},
  { method: 'PUT', path: '/api/progress', handler: async (request, env, deviceId, cors) => {
    const body = await parseBody(request)
    const err = validateProgress(body)
    if (err) return error(err, 400, cors)
    await env.DB.prepare(
      `INSERT INTO reading_progress (device_id, surah_id, last_ayah_number, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(device_id, surah_id) DO UPDATE
       SET last_ayah_number = excluded.last_ayah_number, updated_at = excluded.updated_at`
    ).bind(deviceId, body.surah_id, body.last_ayah_number).run()
    return json({ ok: true }, 200, cors)
  }},
]

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '')
    const method = request.method

    try {
      const route = routes.find(r => r.path === path && r.method === method)
      if (!route) return error('not found', 404, cors)

      const deviceId = await authenticate(request, env)
      if (!deviceId) return error('authentication required', 401, cors)

      return await route.handler(request, env, deviceId, cors)
    } catch (err) {
      console.error('Worker error:', err.message)
      return json({ error: 'internal error' }, 500, cors)
    }
  },
}
