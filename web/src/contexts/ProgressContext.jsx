import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { getDeviceId, fetchProgress, saveProgress } from '../api/worker'

const ProgressContext = createContext()

export function ProgressProvider({ children }) {
  const [readingProgress, setReadingProgress] = useState({})

  useEffect(() => {
    const did = getDeviceId()
    if (!did) return
    fetchProgress(did).then(rows => {
      if (!rows) return
      const map = {}
      for (const r of rows) {
        map[r.surah_id] = r.last_ayah_number
      }
      setReadingProgress(prev => {
        const merged = { ...prev }
        for (const [k, v] of Object.entries(map)) {
          if (!(k in merged) || merged[k] < v) {
            merged[k] = v
          }
        }
        return merged
      })
    })
  }, [])

  const saveReadingProgress = useCallback((surahId, ayahNumber) => {
    setReadingProgress(prev => ({ ...prev, [surahId]: ayahNumber }))
    const did = getDeviceId()
    if (did) saveProgress(did, surahId, ayahNumber)
  }, [])

  return (
    <ProgressContext.Provider value={{ readingProgress, saveReadingProgress }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
