import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const FavoritesContext = createContext()

const STORAGE_KEY = 'tafsir-favorites'

function loadFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const result = {}
    for (const [surahId, ayahs] of Object.entries(parsed)) {
      result[surahId] = new Set(ayahs)
    }
    return result
  } catch {
    return {}
  }
}

function saveFavorites(favorites) {
  const obj = {}
  for (const [surahId, ayahSet] of Object.entries(favorites)) {
    obj[surahId] = [...ayahSet]
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadFavorites)

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const toggleFavorite = useCallback((surahId, ayahNumber) => {
    setFavorites(prev => {
      const key = String(surahId)
      const current = prev[key] || new Set()
      const next = new Set(current)
      if (next.has(ayahNumber)) {
        next.delete(ayahNumber)
      } else {
        next.add(ayahNumber)
      }
      return { ...prev, [key]: next }
    })
  }, [])

  const isFavorite = useCallback((surahId, ayahNumber) => {
    const key = String(surahId)
    return favorites[key]?.has(ayahNumber) || false
  }, [favorites])

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
