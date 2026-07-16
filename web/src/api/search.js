import { loadAllSurahs } from './data'

const SEARCH_FIELDS = ['text', 'tafsir_short', 'tafsir_long']
const MAX_RESULTS = 50

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
        SEARCH_FIELDS.map(field => [field, ayah[field] || ''])
      ),
    }))
  )

  return searchIndexCache
}

export function searchLocal(query, searchIndex) {
  if (!query || !searchIndex) return []
  const q = query.toLowerCase()
  return searchIndex.filter(entry =>
    SEARCH_FIELDS.some(field => entry[field]?.toLowerCase().includes(q))
  ).slice(0, MAX_RESULTS)
}
