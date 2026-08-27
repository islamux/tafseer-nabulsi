const DATA_BASE = import.meta.env.VITE_DATA_BASE || (import.meta.env.DEV ? '/data' : null)
const MAX_RESULTS = 50

let searchIndexCache = null

export async function buildSearchIndex(onProgress) {
  if (searchIndexCache) return searchIndexCache
  if (onProgress) onProgress(1, 1)
  const resp = await fetch(`${DATA_BASE}/_search_index.json`)
  if (!resp.ok) throw new Error(`Failed to load search index: ${resp.status}`)
  searchIndexCache = await resp.json()
  if (onProgress) onProgress(1, 1)
  return searchIndexCache
}

export function searchLocal(query, searchIndex) {
  if (!query || !searchIndex) return []
  const q = query.toLowerCase()
  return searchIndex.filter(entry =>
    entry.text?.includes(q) ||
    entry.tafsir_short?.includes(q) ||
    entry.tafsir_long?.includes(q)
  ).slice(0, MAX_RESULTS)
}
