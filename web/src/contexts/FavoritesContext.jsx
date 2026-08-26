import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
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

export function mergeFavorites(local, remote) {
  const merged = {}
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    merged[key] = new Set([...(local[key] || []), ...(remote[key] || [])])
  }
  return merged
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadFavorites)
  const [deviceId, setDeviceId] = useState(null)
  const localAtMountRef = useRef(favorites)

  useEffect(() => {
    const did = getDeviceId()
    setDeviceId(did)
    if (!did) return
    let cancelled = false
    fetchBookmarks(did).then(bookmarks => {
      if (cancelled || !bookmarks) return
      const remote = remoteToFavorites(bookmarks)
      setFavorites(prev => mergeFavorites(prev, remote))
      const local = localAtMountRef.current
      for (const key of Object.keys(local)) {
        const remoteSet = remote[key]
        for (const ayah of local[key]) {
          if (!remoteSet || !remoteSet.has(ayah)) {
            addBookmark(did, Number(key), ayah)
          }
        }
      }
    })
    return () => { cancelled = true }
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
