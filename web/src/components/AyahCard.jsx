import { useState } from 'react'
import { useFavorites } from '../contexts/FavoritesContext'
import { toArabicNum } from '../utils/arabic'
import { parseTafsir } from '../utils/tafsir'

export default function AyahCard({ ayah, surahId }) {
  const [expanded, setExpanded] = useState(false)
  const { toggleFavorite, isFavorite } = useFavorites()
  const isFav = isFavorite(surahId, ayah.number)
  const favLabel = isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'
  const { year, body: tafsirBody } = parseTafsir(ayah.tafsir_long || '')

  return (
    <div className="py-6 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="text-center">
        <p className="text-2xl leading-[2.2] arabic-text text-primary">
          <span className="text-accent">﴿</span>
          {'\u00A0'}{ayah.text}{'\u00A0'}
          <span className="text-accent">﴾</span>
          {'\u00A0'}
          <span className="inline-block w-7 h-7 rounded-full text-xs font-bold align-middle text-center leading-7 badge-accent">
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
            <div className="mt-4 p-4 rounded-lg text-right" style={{ backgroundColor: 'var(--tafsir-tint)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-accent">التفسير</span>
                {year && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold badge-accent">
                    {toArabicNum(year)}
                  </span>
                )}
              </div>
              <p className="text-base leading-loose arabic-text whitespace-pre-line text-primary">
                {toArabicNum(tafsirBody)}
              </p>
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
