import { useState } from 'react'
import { useFavorites } from '../contexts/FavoritesContext'
import { toArabicNum } from '../utils/arabic'

export default function AyahCard({ ayah, surahId }) {
  const [expanded, setExpanded] = useState(false)
  const { toggleFavorite, isFavorite } = useFavorites()
  const fav = isFavorite(surahId, ayah.number)

  return (
    <div className="py-6 border-b" style={{ borderColor: 'var(--border)' }}>
      <div className="text-center">
        <p className="text-2xl leading-[2.2] font-arabic" style={{ color: 'var(--text-primary)' }}>
          <span style={{ color: 'var(--accent)' }}>﴿</span>
          {'\u00A0'}{ayah.text}{'\u00A0'}
          <span style={{ color: 'var(--accent)' }}>﴾</span>
          {'\u00A0'}
          <span
            className="inline-block w-7 h-7 rounded-full text-xs font-bold align-middle text-center leading-7"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }}
          >
            {toArabicNum(ayah.number)}
          </span>
        </p>
      </div>

      {ayah.tafsir_short && (
        <p className="mt-4 text-sm text-center font-arabic" style={{ color: 'var(--text-secondary)' }}>
          {ayah.tafsir_short}
        </p>
      )}

      {ayah.tafsir_long && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium underline arabic-text transition-opacity hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            {expanded ? 'إخفاء التفسير' : 'عرض التفسير الكامل'}
          </button>
          {expanded && (() => {
            const dateMatch = ayah.tafsir_long.match(/^(\d{4})-\d{2}-\d{2}\s*/)
            const year = dateMatch ? dateMatch[1] : null
            const body = dateMatch ? ayah.tafsir_long.slice(dateMatch[0].length) : ayah.tafsir_long
            return (
              <div className="mt-4 p-4 rounded-lg text-right" style={{ backgroundColor: 'var(--tafsir-tint)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>التفسير</span>
                  {year && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }}
                    >
                      {toArabicNum(year)}
                    </span>
                  )}
                </div>
                <p className="text-base leading-loose font-arabic whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
                  {body}
                </p>
              </div>
            )
          })()}
        </div>
      )}

      <div className="mt-3 flex justify-center">
        <button
          onClick={() => toggleFavorite(surahId, ayah.number)}
          className="text-xl transition-transform hover:scale-110"
          title={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          aria-label={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          {fav ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  )
}
