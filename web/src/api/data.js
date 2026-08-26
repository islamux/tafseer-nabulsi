import { stripLeadingBasmala } from '../utils/arabic'
import { hasSeparateBismillah } from '../utils/quran'

const DATA_BASE = import.meta.env.VITE_DATA_BASE || (import.meta.env.DEV ? '/data' : null)

if (!DATA_BASE) {
  throw new Error(
    'VITE_DATA_BASE must be set for production builds. ' +
    'Set it in your .env or pass it to the build command: ' +
    'VITE_DATA_BASE=https://your-r2-url/data pnpm build'
  )
}
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
  const loaded = new Array(total)
  const BATCH_SIZE = 8

  for (let start = 0; start < total; start += BATCH_SIZE) {
    const batch = surahIndex.slice(start, start + BATCH_SIZE)
    const results = await Promise.all(
      batch.map((s, i) => loadSurah(s.surah_id).then(data => { loaded[start + i] = data }))
    )
    if (onProgress) onProgress(Math.min(start + BATCH_SIZE, total), total)
  }

  return loaded
}

export { loadAllSurahs }
