import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { toArabicNum } from '../utils/arabic'

export default function SurahList() {
  const { index } = useData()
  const [filter, setFilter] = useState('')

  const filtered = index.filter(s =>
    s.name.includes(filter) ||
    String(s.surah_id).includes(filter)
  )

  if (index.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-center text-xl font-arabic mb-8" style={{ color: 'var(--accent)' }}>
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </p>

      <h1
        className="text-2xl font-bold mb-4 arabic-text text-center"
        style={{ color: 'var(--text-primary)' }}
      >
        سور القرآن الكريم
      </h1>

      <input
        type="text"
        placeholder="ابحث عن سورة..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full mb-6 px-4 py-2.5 rounded-xl text-sm border-0 outline-none arabic-text transition-colors"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
        }}
      />

      <div>
        {filtered.map(surah => (
          <Link
            key={surah.surah_id}
            to={`/surah/${surah.surah_id}`}
            className="flex items-center justify-between py-4 border-b transition-colors no-underline"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--hover-bg)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold w-8 text-center" style={{ color: 'var(--accent)' }}>
                {toArabicNum(surah.surah_id)}
              </span>
              <div>
                <h2 className="text-lg font-bold font-arabic">{surah.name}</h2>
                <p className="text-xs mt-0.5 arabic-text" style={{ color: 'var(--text-secondary)' }}>
                  {toArabicNum(surah.ayah_count)} آية
                </p>
              </div>
            </div>
            {surah.has_tafsir && (
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }}
              >
                تفسير
              </span>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center mt-8 arabic-text" style={{ color: 'var(--text-secondary)' }}>
          لا توجد نتائج
        </p>
      )}
    </div>
  )
}
