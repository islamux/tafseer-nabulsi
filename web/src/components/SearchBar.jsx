import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSearch } from '../contexts/SearchContext'
import { toArabicNum } from '../utils/arabic'

export default function SearchBar() {
  const { search, isBuildingIndex, searchProgress } = useSearch()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState(null)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearched(true)
    setSearchError(null)
    try {
      const searchResults = await search(query.trim())
      setResults(searchResults)
    } catch (err) {
      setSearchError(err.message)
      setResults([])
    }
  }, [query, search])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleSearch()
  }, [handleSearch])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 arabic-text text-primary">
        البحث في القرآن والتفسير
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="ابحث في النص أو التفسير..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm border-0 outline-none arabic-text input-style"
        />
        <button
          onClick={handleSearch}
          disabled={isBuildingIndex}
          className="px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 arabic-text transition-opacity hover:opacity-90 badge-accent"
        >
          {isBuildingIndex ? `جاري التحميل... ${toArabicNum(searchProgress)}%` : 'بحث'}
        </button>
      </div>

      {isBuildingIndex && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3 border-accent"></div>
          <p className="text-sm arabic-text text-secondary">
            جاري تحميل البيانات... {toArabicNum(searchProgress)}%
          </p>
        </div>
      )}

      {!isBuildingIndex && searchError && (
        <p className="text-center py-8 arabic-text text-secondary">
          تعذّر البحث: {searchError}
        </p>
      )}

      {!isBuildingIndex && !searchError && searched && results.length === 0 && (
        <p className="text-center py-8 arabic-text text-secondary">
          لا توجد نتائج لـ "{query}"
        </p>
      )}

      {!isBuildingIndex && !searchError && results.length > 0 && (
        <div>
          <p className="text-sm mb-4 arabic-text text-secondary">
            {toArabicNum(results.length)} نتيجة
          </p>
          {results.map((result, idx) => (
            <Link
              key={`${result.surah_id}-${result.ayah_number}-${idx}`}
              to={`/surah/${result.surah_id}`}
              className="block p-4 rounded-xl mb-3 transition-shadow hover:shadow-md no-underline input-style"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold arabic-text text-accent">
                  سورة {result.surah_name} — آية {toArabicNum(result.ayah_number)}
                </span>
              </div>
              <p className="text-sm arabic-text line-clamp-2 text-primary">
                {result.text}
              </p>
              {(result.tafsir_short || result.tafsir_long) && (
                <p className="text-xs mt-1 arabic-text line-clamp-2 opacity-70 text-secondary">
                  {toArabicNum(result.tafsir_short || result.tafsir_long.slice(0, 150))}...
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
