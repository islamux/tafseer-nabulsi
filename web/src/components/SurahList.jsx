import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import { toArabicNum } from '../utils/arabic'
import Spinner from './Spinner'

export default function SurahList() {
  const { index, indexError } = useData()
  const [filter, setFilter] = useState('')

  const filtered = index.filter(s =>
    s.name.includes(filter) ||
    String(s.surah_id).includes(filter)
  )

  if (indexError) {
    return (
      <div className="text-center py-20">
        <p className="text-6xl mb-4">⚠️</p>
        <p className="arabic-text mb-4 text-secondary">
          تعذّر تحميل البيانات: {indexError}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg text-sm font-medium arabic-text badge-accent"
        >
          إعادة المحاولة
        </button>
      </div>
    )
  }

  if (index.length === 0) {
    return <Spinner />
  }

  return (
    <div>
      <p className="text-center text-xl arabic-text mb-8 text-accent">
        بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
      </p>

      <h1 className="text-2xl font-bold mb-4 arabic-text text-center text-primary">
        سور القرآن الكريم
      </h1>

      <input
        type="text"
        placeholder="ابحث عن سورة..."
        value={filter}
        onChange={e => setFilter(e.target.value)}
        className="w-full mb-6 px-4 py-2.5 rounded-xl text-sm border-0 outline-none arabic-text transition-colors input-style"
      />

      <div>
        {filtered.map(surah => (
          <Link
            key={surah.surah_id}
            to={`/surah/${surah.surah_id}`}
            className="surah-row flex items-center justify-between py-4 border-b transition-colors no-underline text-primary"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold w-8 text-center text-accent">
                {toArabicNum(surah.surah_id)}
              </span>
              <div>
                <h2 className="text-lg font-bold arabic-text">{surah.name}</h2>
                <p className="text-xs mt-0.5 arabic-text text-secondary">
                  {toArabicNum(surah.ayah_count)} آية
                </p>
              </div>
            </div>
            {surah.has_tafsir && (
              <span className="text-xs px-2 py-1 rounded-full badge-accent">
                تفسير
              </span>
            )}
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center mt-8 arabic-text text-secondary">
          لا توجد نتائج
        </p>
      )}
    </div>
  )
}
