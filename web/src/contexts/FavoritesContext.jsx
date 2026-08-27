import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { getDeviceId, fetchBookmarks, addBookmark, removeBookmark } from '../api/worker'

const FavoritesContext = createContext()

const STORAGE_KEY = 'tafsir-favorites'
const TOMBSTONE_KEY = 'tafsir-favorites-tombstones'

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
  const obj = {}
  for (const [surahId, ayahSet] of Object.entries(favorites)) {
    obj[surahId] = [...ayahSet]
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
}

function loadTombstones() {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function saveTombstones(tombstones) {
  localStorage.setItem(TOMBSTONE_KEY, JSON.stringify([...tombstones]))
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

export function mergeFavorites(local, remote, tombstones = new Set()) {
  const merged = {}
  for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    const allAyahs = new Set([...(local[key] || []), ...(remote[key] || [])])
    for (const ayah of allAyahs) {
      if (!tombstones.has(`${key}:${ayah}`)) {
        if (!merged[key]) merged[key] = new Set()
        merged[key].add(ayah)
      }
    }
  }
  return merged
}

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState(loadFavorites)
  const [deviceId, setDeviceId] = useState(null)
  const [storageError, setStorageError] = useState(false)
  const localAtMountRef = useRef(favorites)
  const tombstonesRef = useRef(loadTombstones())

  useEffect(() => {
    const did = getDeviceId()
    setDeviceId(did)
    if (!did) return
    let cancelled = false
    fetchBookmarks(did).then(bookmarks => {
      if (cancelled || !bookmarks) return
      const remote = remoteToFavorites(bookmarks)
      const tombstones = tombstonesRef.current
      setFavorites(prev => mergeFavorites(prev, remote, tombstones))

      const local = localAtMountRef.current
      for (const key of Object.keys(local)) {
        const remoteSet = remote[key]
        for (const ayah of local[key]) {
          if (!tombstones.has(`${key}:${ayah}`)) {
            if (!remoteSet || !remoteSet.has(ayah)) {
              addBookmark(did, Number(key), ayah)
            }
          }
        }
      }

      for (const t of tombstones) {
        const [sId, aNum] = t.split(':')
        const rSet = remote[sId]
        if (!rSet || !rSet.has(Number(aNum))) {
          tombstones.delete(t)
        }
      }
      saveTombstones(tombstones)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    try {
      saveFavorites(favorites)
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }, [favorites])

  const lastToggleRef = useRef(null)

  const toggleFavorite = useCallback((surahId, ayahNumber) => {
    setFavorites(prev => {
      const key = String(surahId)
      const current = prev[key] || new Set()
      const next = new Set(current)
      const adding = !next.has(ayahNumber)
      if (adding) {
        next.add(ayahNumber)
        tombstonesRef.current.delete(`${key}:${ayahNumber}`)
      } else {
        next.delete(ayahNumber)
        tombstonesRef.current.add(`${key}:${ayahNumber}`)
      }
      saveTombstones(tombstonesRef.current)
      lastToggleRef.current = { surahId, ayahNumber, adding }
      return { ...prev, [key]: next }
    })
  }, [])

  useEffect(() => {
    const toggle = lastToggleRef.current
    if (!toggle || !deviceId) return
    lastToggleRef.current = null
    if (toggle.adding) {
      addBookmark(deviceId, toggle.surahId, toggle.ayahNumber)
    } else {
      removeBookmark(deviceId, toggle.surahId, toggle.ayahNumber)
    }
  }, [favorites, deviceId])

  const isFavorite = useCallback((surahId, ayahNumber) => {
    const key = String(surahId)
    return favorites[key]?.has(ayahNumber) || false
  }, [favorites])

  return (
    <FavoritesContext.Provider value={{ toggleFavorite, isFavorite, storageError }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
