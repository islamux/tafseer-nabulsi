import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'

export default function SurahList() {
  const { index } = useData()
  const [filter, setFilter] = useState('')

  const filtered = index.filter(s =>
    s.name.includes(filter) ||
    String(s.surah_id).includes(filter)
  )

  return (
    <div>
      <h1
        className="text-2xl font-bold mb-4 font-arabic rtl-text"
        style={{ color: 'var(--text-primary)' }}
      >
        سور القرآن الكريم
      </h1>

      <input
        type="text"
        placeholder="ابحث عن سورة..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full mb-6 px-4 py-2.5 rounded-xl text-sm border-0 outline-none font-arabic rtl-text"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map(surah => (
          <Link
            key={surah.surah_id}
            to={`/surah/${surah.surah_id}`}
            className="block p-4 rounded-xl transition-shadow hover:shadow-md no-underline"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm opacity-60">{surah.surah_id}</span>
              {surah.has_tafsir && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  تفسير
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold font-arabic rtl-text mt-1">{surah.name}</h2>
            <p className="text-xs opacity-60 mt-1 font-arabic rtl-text">{surah.ayah_count} آية</p>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center opacity-60 mt-8 font-arabic rtl-text" style={{ color: 'var(--text-secondary)' }}>
          لا توجد نتائج
        </p>
      )}
    </div>
  )
}
