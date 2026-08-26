const API_BASE = import.meta.env.VITE_API_BASE || ''
const TOKEN_KEY = 'tafsir-device-token'
const LEGACY_KEY = 'tafsir-device-id'

export function getDeviceId() {
  if (!API_BASE) return null
  try {
    let token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      token = localStorage.getItem(LEGACY_KEY) || crypto.randomUUID()
      localStorage.setItem(TOKEN_KEY, token)
    }
    return token
  } catch {
    return null
  }
}

async function api(path, options = {}) {
  if (!API_BASE) return null
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}))
      console.error(`Worker API ${resp.status}: ${body.error || resp.statusText}`)
      return null
    }
    return await resp.json()
  } catch (err) {
    console.error('Worker API error:', err)
    return null
  }
}

export async function fetchBookmarks(token) {
  const data = await api('/bookmarks', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  return data?.bookmarks ?? null
}

export async function addBookmark(token, surahId, ayahNumber) {
  return api('/bookmarks', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ surah_id: surahId, ayah_number: ayahNumber }),
  })
}

export async function removeBookmark(token, surahId, ayahNumber) {
  return api('/bookmarks', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ surah_id: surahId, ayah_number: ayahNumber }),
  })
}

export async function fetchProgress(token) {
  const data = await api('/progress', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  return data?.progress ?? null
}

export async function saveProgress(token, surahId, ayahNumber) {
  return api('/progress', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ surah_id: surahId, last_ayah_number: ayahNumber }),
  })
}
