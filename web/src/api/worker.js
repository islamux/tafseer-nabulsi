const API_BASE = import.meta.env.VITE_API_BASE || ''
const DEVICE_KEY = 'tafsir-device-id'

export function getDeviceId() {
  if (!API_BASE) return null
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
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

export async function fetchBookmarks(deviceId) {
  const data = await api(`/bookmarks?device_id=${encodeURIComponent(deviceId)}`)
  return data?.bookmarks ?? null
}

export async function addBookmark(deviceId, surahId, ayahNumber) {
  return api('/bookmarks', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, surah_id: surahId, ayah_number: ayahNumber }),
  })
}

export async function removeBookmark(deviceId, surahId, ayahNumber) {
  return api('/bookmarks', {
    method: 'DELETE',
    body: JSON.stringify({ device_id: deviceId, surah_id: surahId, ayah_number: ayahNumber }),
  })
}

export async function fetchProgress(deviceId) {
  const data = await api(`/progress?device_id=${encodeURIComponent(deviceId)}`)
  return data?.progress ?? null
}

export async function saveProgress(deviceId, surahId, ayahNumber) {
  return api('/progress', {
    method: 'PUT',
    body: JSON.stringify({ device_id: deviceId, surah_id: surahId, last_ayah_number: ayahNumber }),
  })
}
