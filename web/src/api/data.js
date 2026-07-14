const DATA_BASE = '/data'

let indexCache = null
let surahCache = new Map()
let searchIndexCache = null

export async function loadIndex() {
  if (indexCache) return indexCache
  const resp = await fetch(`${DATA_BASE}/_index.json`)
  if (!resp.ok) throw new Error(`Failed to load index: ${resp.status}`)
  indexCache = await resp.json()
  return indexCache
}

export async function loadSurah(id) {
  if (surahCache.has(id)) return surahCache.get(id)
  const resp = await fetch(`${DATA_BASE}/${id}.json`)
  if (!resp.ok) throw new Error(`Failed to load surah ${id}: ${resp.status}`)
  const data = await resp.json()
  surahCache.set(id, data)
  return data
}

export async function loadAllSurahs(onProgress) {
  const index = await loadIndex()
  const total = index.length
  const loaded = []

  for (let i = 0; i < total; i++) {
    const surahId = index[i].surah_id
    const data = await loadSurah(surahId)
    loaded.push(data)
    if (onProgress) onProgress(i + 1, total)
  }

  return loaded
}

export async function buildSearchIndex(onProgress) {
  if (searchIndexCache) return searchIndexCache
  const allSurahs = await loadAllSurahs(onProgress)

  searchIndexCache = allSurahs.flatMap(surah =>
    surah.ayahs.map(ayah => ({
      surah_id: surah.surah_id,
      surah_name: surah.name,
      ayah_number: ayah.number,
      text: ayah.text || '',
      tafsir_short: ayah.tafsir_short || '',
      tafsir_long: ayah.tafsir_long || '',
    }))
  )

  return searchIndexCache
}

export function searchLocal(query, index) {
  if (!query || !index) return []
  const q = query.toLowerCase()
  return index.filter(entry =>
    entry.text.toLowerCase().includes(q) ||
    entry.tafsir_short.toLowerCase().includes(q) ||
    entry.tafsir_long.toLowerCase().includes(q)
  ).slice(0, 50)
}
