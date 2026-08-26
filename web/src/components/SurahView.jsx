import { useEffect, useRef, useState } from 'react'
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
  const { fetchSurah, index, readingProgress, saveReadingProgress } = useData()
  const [surah, setSurah] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const ayahEls = useRef({})
  const lastSeenAyah = useRef(0)

  const surahMeta = index.find(surah => surah.surah_id === surahId)
  const valid = isValidSurahId(surahId)

  useEffect(() => {
    if (!valid) return
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
  }, [surahId, fetchSurah, valid])

  useEffect(() => {
    if (!surah) return
    const saved = readingProgress[surahId]
    if (saved && saved > 1 && ayahEls.current[saved]) {
      ayahEls.current[saved].scrollIntoView({ block: 'start' })
    }
  }, [surah])

  useEffect(() => {
    if (!surah) return
    lastSeenAyah.current = 0
    let timer = null
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const num = Number(entry.target.dataset.ayah)
            if (num > lastSeenAyah.current) {
              lastSeenAyah.current = num
              if (timer) clearTimeout(timer)
              timer = setTimeout(() => saveReadingProgress(surahId, num), 1500)
            }
          }
        }
      },
      { rootMargin: '0px 0px -75% 0px', threshold: 0 }
    )
    for (const el of Object.values(ayahEls.current)) {
      if (el) observer.observe(el)
    }
    return () => {
      if (timer) clearTimeout(timer)
      observer.disconnect()
    }
  }, [surah])

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
          <div
            key={ayah.number}
            id={`ayah-${ayah.number}`}
            data-ayah={ayah.number}
            ref={el => {
              ayahEls.current[ayah.number] = el
            }}
          >
            <AyahCard ayah={ayah} surahId={surahId} />
          </div>
        ))}
      </div>
    </div>
  )
}
