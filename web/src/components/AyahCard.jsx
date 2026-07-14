import { useState } from 'react'
import { useFavorites } from '../contexts/FavoritesContext'

export default function AyahCard({ ayah, surahId }) {
  const [expanded, setExpanded] = useState(false)
  const { toggleFavorite, isFavorite } = useFavorites()
  const fav = isFavorite(surahId, ayah.number)

  return (
    <div
      className="p-4 rounded-xl mb-3 transition-shadow"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          {ayah.number}
        </span>
        <p className="text-lg leading-relaxed font-arabic flex-1" style={{ color: 'var(--text-primary)' }}>
          {ayah.text}
        </p>
      </div>

      {ayah.tafsir_short && (
        <p className="mt-3 text-sm opacity-80 font-arabic" style={{ color: 'var(--text-secondary)' }}>
          {ayah.tafsir_short}
        </p>
      )}

      {ayah.tafsir_long && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-medium underline"
            style={{ color: 'var(--accent)' }}
          >
            {expanded ? 'إخفاء التفسير' : 'عرض التفسير الكامل'}
          </button>
          {expanded && (
            <p className="mt-2 text-sm leading-relaxed font-arabic whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
              {ayah.tafsir_long}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => toggleFavorite(surahId, ayah.number)}
          className="text-xl transition-transform hover:scale-110"
          title={fav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
        >
          {fav ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  )
}
