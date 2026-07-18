import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import AyahCard from './AyahCard'
import BismillahHeader from './BismillahHeader'
import Spinner from './Spinner'
import { toArabicNum } from '../utils/arabic'

export default function SurahView() {
  const { id } = useParams()
  const surahId = parseInt(id, 10)
  const { fetchSurah, index } = useData()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const surahMeta = index.find(surah => surah.surah_id === surahId)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchSurah(surahId)
      .then(surahData => {
        if (!cancelled) setSurah(surahData)
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [surahId, fetchSurah])

  if (loading) {
    return <Spinner />
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="arabic-text text-secondary">خطأ: {error}</p>
        <Link to="/" className="mt-4 inline-block arabic-text text-accent">العودة للرئيسية</Link>
      </div>
    )
  }

  return (
    <div>
      <Link to="/" className="text-sm mb-4 inline-block arabic-text text-accent">
        العودة للسور ←
      </Link>

      <div className="text-center mb-10">
        <span
          className="inline-flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold mb-4"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }}
        >
          {toArabicNum(surahId)}
        </span>
        <h1 className="text-4xl font-bold arabic-text text-primary mb-2">
          سورة {surahMeta?.name || surah?.name}
        </h1>
        <p className="text-sm arabic-text" style={{ color: 'var(--text-secondary)' }}>
          {toArabicNum(surah?.ayahs?.length ?? surahMeta?.ayah_count)} آية
        </p>
        <div
          className="mx-auto mt-6 w-24 h-0.5 rounded-full opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      </div>

      {surahId !== 1 && surahId !== 9 && <BismillahHeader />}

      <div>
        {surah?.ayahs?.map(ayah => (
          <AyahCard key={ayah.number} ayah={ayah} surahId={surahId} />
        ))}
      </div>
    </div>
  )
}
