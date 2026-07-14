import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import AyahCard from './AyahCard'

export default function SurahView() {
  const { id } = useParams()
  const surahId = parseInt(id, 10)
  const { getSurah, index } = useData()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const surahMeta = index.find(s => s.surah_id === surahId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    getSurah(surahId)
      .then(data => {
        if (!cancelled) setSurah(data)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [surahId, getSurah])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }}></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--text-secondary)' }}>خطأ: {error}</p>
        <Link to="/" className="mt-4 inline-block" style={{ color: 'var(--accent)' }}>العودة للرئيسية</Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/" className="text-sm mb-4 inline-block" style={{ color: 'var(--accent)' }}>
        ← العودة للسور
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-arabic" style={{ color: 'var(--text-primary)' }}>
          سورة {surahMeta?.name || surah?.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {surah?.ayahs?.length || surahMeta?.ayah_count} آية
        </p>
      </div>

      <div>
        {surah?.ayahs?.map(ayah => (
          <AyahCard key={ayah.number} ayah={ayah} surahId={surahId} />
        ))}
      </div>
    </div>
  )
}
