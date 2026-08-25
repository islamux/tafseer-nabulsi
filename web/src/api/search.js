import { loadAllSurahs } from './data'

const SEARCH_FIELDS = ['text', 'tafsir_short', 'tafsir_long']
const MAX_RESULTS = 50

const TASHKEEL_RE = /[\u064b-\u065f\u0670\u06d6-\u06dc\u06df-\u06e8]/g
const ALEF_RE = /[\u0622\u0623\u0625\u0671]/g

function normalizeArabic(str) {
  return str
    .toLowerCase()
    .replace(TASHKEEL_RE, '')
    .replace(ALEF_RE, '\u0627')
}

let searchIndexCache = null

export async function buildSearchIndex(onProgress) {
  if (searchIndexCache) return searchIndexCache
  const allSurahs = await loadAllSurahs(onProgress)

  searchIndexCache = allSurahs.flatMap(surah =>
    surah.ayahs.map(ayah => ({
      surah_id: surah.surah_id,
      surah_name: surah.name,
      ayah_number: ayah.number,
      ...Object.fromEntries(
        SEARCH_FIELDS.map(field => [field, normalizeArabic(ayah[field] || '')])
      ),
    }))
  )

  return searchIndexCache
}

export function searchLocal(query, searchIndex) {
  if (!query || !searchIndex) return []
  const q = normalizeArabic(query)
  return searchIndex.filter(entry =>
    SEARCH_FIELDS.some(field => entry[field]?.includes(q))
  ).slice(0, MAX_RESULTS)
}
