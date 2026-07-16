import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import AyahCard from './AyahCard'
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

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold arabic-text text-primary">
          سورة {surahMeta?.name || surah?.name}
        </h1>
        <p className="text-sm mt-1 arabic-text text-secondary">
          {toArabicNum(surah?.ayahs?.length ?? surahMeta?.ayah_count)} آية
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
