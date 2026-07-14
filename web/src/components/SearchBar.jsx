import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'

export default function SearchBar() {
  const { search, searchLoading, searchProgress } = useData()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearched(true)
    const res = await search(query.trim())
    setResults(res)
  }, [query, search])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 font-arabic" style={{ color: 'var(--text-primary)' }}>
        البحث في القرآن والتفسير
      </h1>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="ابحث في النص أو التفسير..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm border-0 outline-none font-arabic"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searchLoading}
          className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)' }}
        >
          {searchLoading ? `جاري التحميل... ${searchProgress}%` : 'بحث'}
        </button>
      </div>

      {searchLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-3" style={{ borderColor: 'var(--accent)' }}></div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            جاري تحميل البيانات... {searchProgress}%
          </p>
        </div>
      )}

      {!searchLoading && searched && results.length === 0 && (
        <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          لا توجد نتائج لـ "{query}"
        </p>
      )}

      {!searchLoading && results.length > 0 && (
        <div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            {results.length} نتيجة
          </p>
          {results.map((r, i) => (
            <Link
              key={`${r.surah_id}-${r.ayah_number}-${i}`}
              to={`/surah/${r.surah_id}`}
              className="block p-4 rounded-xl mb-3 transition-shadow hover:shadow-md no-underline"
              style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                  سورة {r.surah_name} — آية {r.ayah_number}
                </span>
              </div>
              <p className="text-sm font-arabic line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                {r.text}
              </p>
              {(r.tafsir_short || r.tafsir_long) && (
                <p className="text-xs mt-1 font-arabic line-clamp-2 opacity-70" style={{ color: 'var(--text-secondary)' }}>
                  {r.tafsir_short || r.tafsir_long.slice(0, 150)}...
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
