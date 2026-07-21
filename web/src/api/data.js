import { stripLeadingBasmala } from '../utils/arabic'
import { hasSeparateBismillah } from '../utils/quran'

const DATA_BASE = import.meta.env.VITE_DATA_BASE || '/data'
const FETCH_TIMEOUT_MS = 10_000

async function fetchJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const resp = await fetch(url, { signal: controller.signal })
    if (!resp.ok) throw new Error(`Failed to load ${url}: ${resp.status}`)
    return await resp.json()
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s: ${url}`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

let indexCache = null
const surahCache = new Map()

export async function loadIndex() {
  if (indexCache) return indexCache
  indexCache = await fetchJson(`${DATA_BASE}/_index.json`)
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
  const surahData = normalizeSurah(await fetchJson(`${DATA_BASE}/${id}.json`), id)
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
