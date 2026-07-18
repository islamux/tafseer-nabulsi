import { useState } from 'react'
import { useFavorites } from '../contexts/FavoritesContext'
import { toArabicNum, splitAyahSegments } from '../utils/arabic'
import { basmalaIsFirstAyah } from '../utils/quran'
import { parseTafsir } from '../utils/tafsir'
import TafsirText from './TafsirText'

const BRACKET_SCALE = '1.15em'

export default function AyahCard({ ayah, surahId }) {
  const [expanded, setExpanded] = useState(false)
  const { toggleFavorite, isFavorite } = useFavorites()
  const isFav = isFavorite(surahId, ayah.number)
  const favLabel = isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'
  const { year, body: tafsirBody } = parseTafsir(ayah.tafsir_long || '')
  const isBasmalah = ayah.number === 1 && basmalaIsFirstAyah(surahId)

  const segments = splitAyahSegments(ayah.text)

  return (
    <div className={`py-6 border-b ${isBasmalah ? 'mb-2' : ''}`} style={{ borderColor: 'var(--border)' }}>
      <div className="text-center">
        <p
          className={`arabic-text text-verse ${isBasmalah ? 'text-3xl leading-[2.6]' : 'text-2xl leading-[2.2]'}`}
        >
          <span className="text-verse-glyph" style={{ fontSize: BRACKET_SCALE }}>﴿</span>
          {'\u00A0'}
          {segments.map((seg, i) => (
            <span key={i}>
              {seg}
              {i < segments.length - 1 && <br />}
            </span>
          ))}
          {'\u00A0'}
          <span className="text-verse-glyph" style={{ fontSize: BRACKET_SCALE }}>﴾</span>
          {'\u00A0'}
          <span
            className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold badge-accent leading-none align-middle"
          >
            {toArabicNum(ayah.number)}
          </span>
        </p>
      </div>

      {ayah.tafsir_short && (
        <p className="mt-4 text-sm text-center arabic-text text-secondary">
          {toArabicNum(ayah.tafsir_short)}
        </p>
      )}

      {ayah.tafsir_long && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium underline arabic-text transition-opacity hover:opacity-70 text-accent"
          >
            {expanded ? 'إخفاء التفسير' : 'عرض التفسير الكامل'}
          </button>
          {expanded && (
            <div className="mt-4 p-5 rounded-lg text-right" style={{ backgroundColor: 'var(--tafsir-tint)' }}>
              <div className="flex items-center gap-2 mb-4 justify-center">
                <span className="text-xs font-bold text-accent">التفسير</span>
                {year && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold badge-accent">
                    {toArabicNum(year)}
                  </span>
                )}
              </div>
              <TafsirText body={tafsirBody} />
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-center">
        <button
          onClick={() => toggleFavorite(surahId, ayah.number)}
          className="text-xl transition-transform hover:scale-110"
          title={favLabel}
          aria-label={favLabel}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  )
}
