import { stripLeadingBasmala } from '../utils/arabic'
import { hasSeparateBismillah } from '../utils/quran'

const DATA_BASE = import.meta.env.VITE_DATA_BASE || '/data'

let indexCache = null
const surahCache = new Map()

export async function loadIndex() {
  if (indexCache) return indexCache
  const resp = await fetch(`${DATA_BASE}/_index.json`)
  if (!resp.ok) throw new Error(`Failed to load index: ${resp.status}`)
  indexCache = await resp.json()
  return indexCache
}

function normalizeSurah(surahData, id) {
  if (hasSeparateBismillah(id) && surahData.ayahs[0]) {
    surahData.ayahs[0].text = stripLeadingBasmala(surahData.ayahs[0].text)
  }
  return surahData
}

export async function loadSurah(id) {
  if (surahCache.has(id)) return surahCache.get(id)
  const resp = await fetch(`${DATA_BASE}/${id}.json`)
  if (!resp.ok) throw new Error(`Failed to load surah ${id}: ${resp.status}`)
  const surahData = normalizeSurah(await resp.json(), id)
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
