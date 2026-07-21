import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getDeviceId, fetchBookmarks, addBookmark, removeBookmark } from '../api/worker'

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
  } catch (e) {
    console.error('Failed to load favorites from localStorage:', e)
    return {}
  }
}

function saveFavorites(favorites) {
  try {
    const obj = {}
    for (const [surahId, ayahSet] of Object.entries(favorites)) {
      obj[surahId] = [...ayahSet]
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch (e) {
    console.error('Failed to save favorites to localStorage:', e)
  }
}

function remoteToFavorites(bookmarks) {
  const result = {}
  for (const b of bookmarks) {
    const key = String(b.surah_id)
    if (!result[key]) result[key] = new Set()
    result[key].add(b.ayah_number)
  }
  return result
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadFavorites)
  const [deviceId, setDeviceId] = useState(null)

  useEffect(() => {
    const did = getDeviceId()
    setDeviceId(did)
    if (!did) return
    fetchBookmarks(did).then(bookmarks => {
      if (bookmarks) setFavorites(remoteToFavorites(bookmarks))
    })
  }, [])

  useEffect(() => {
    saveFavorites(favorites)
  }, [favorites])

  const toggleFavorite = useCallback((surahId, ayahNumber) => {
    setFavorites(prev => {
      const key = String(surahId)
      const current = prev[key] || new Set()
      const next = new Set(current)
      const adding = !next.has(ayahNumber)
      if (adding) {
        next.add(ayahNumber)
      } else {
        next.delete(ayahNumber)
      }
      if (deviceId) {
        if (adding) {
          addBookmark(deviceId, surahId, ayahNumber)
        } else {
          removeBookmark(deviceId, surahId, ayahNumber)
        }
      }
      return { ...prev, [key]: next }
    })
  }, [deviceId])

  const isFavorite = useCallback((surahId, ayahNumber) => {
    const key = String(surahId)
    return favorites[key]?.has(ayahNumber) || false
  }, [favorites])

  return (
    <FavoritesContext.Provider value={{ toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
