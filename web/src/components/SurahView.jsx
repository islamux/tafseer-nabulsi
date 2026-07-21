import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useData } from '../contexts/DataContext'
import AyahCard from './AyahCard'
import BismillahHeader from './BismillahHeader'
import Spinner from './Spinner'
import NotFound from './NotFound'
import { toArabicNum } from '../utils/arabic'
import { hasSeparateBismillah } from '../utils/quran'

const TOTAL_SURAHS = 114
const isValidSurahId = (id) => Number.isInteger(id) && id >= 1 && id <= TOTAL_SURAHS

export default function SurahView() {
  const { id } = useParams()
  const surahId = parseInt(id, 10)
  const { fetchSurah, index, saveReadingProgress } = useData()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const surahMeta = index.find(surah => surah.surah_id === surahId)
  const valid = isValidSurahId(surahId)

  useEffect(() => {
    if (!valid) return
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchSurah(surahId)
      .then(surahData => {
        if (!cancelled) {
          setSurah(surahData)
          saveReadingProgress(surahId, 1)
        }
      })
      .catch(err => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [surahId, fetchSurah, valid])

  if (!valid) return <NotFound />

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
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold mb-4 badge-accent">
          {toArabicNum(surahId)}
        </span>
        <h1 className="text-4xl font-bold arabic-text text-primary mb-2">
          سورة {surahMeta?.name || surah?.name}
        </h1>
        <p className="text-sm arabic-text text-secondary">
          {toArabicNum(surah?.ayahs?.length ?? surahMeta?.ayah_count)} آية
        </p>
        <div
          className="mx-auto mt-6 w-24 h-0.5 rounded-full opacity-40"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      </div>

      {hasSeparateBismillah(surahId) && <BismillahHeader />}

      <div>
        {surah?.ayahs?.map(ayah => (
          <AyahCard key={ayah.number} ayah={ayah} surahId={surahId} />
        ))}
      </div>
    </div>
  )
}
