const DATA_BASE = '/data'

let indexCache = null
const surahCache = new Map()

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
  const surahData = await resp.json()
  surahCache.set(id, surahData)
  return surahData
}

async function loadAllSurahs(onProgress) {
  const surahIndex = await loadIndex()
  const total = surahIndex.length
  const loaded = []

  for (let i = 0; i < total; i++) {
    const surahId = surahIndex[i].surah_id
    const surahData = await loadSurah(surahId)
    loaded.push(surahData)
    if (onProgress) onProgress(i + 1, total)
  }

  return loaded
}

export { loadAllSurahs }
