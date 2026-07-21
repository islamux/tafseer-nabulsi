import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loadIndex, loadSurah } from '../api/data'
import { getDeviceId, fetchProgress, saveProgress } from '../api/worker'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [index, setIndex] = useState([])
  const [indexError, setIndexError] = useState(null)
  const [readingProgress, setReadingProgress] = useState({})

  useEffect(() => {
    loadIndex().then(setIndex).catch(err => setIndexError(err.message))
  }, [])

  useEffect(() => {
    const did = getDeviceId()
    if (!did) return
    fetchProgress(did).then(rows => {
      if (!rows) return
      const map = {}
      for (const r of rows) {
        map[r.surah_id] = r.last_ayah_number
      }
      setReadingProgress(map)
    })
  }, [])

  const fetchSurah = useCallback(async (id) => {
    return loadSurah(id)
  }, [])

  const saveReadingProgress = useCallback((surahId, ayahNumber) => {
    setReadingProgress(prev => ({ ...prev, [surahId]: ayahNumber }))
    const did = getDeviceId()
    if (did) saveProgress(did, surahId, ayahNumber)
  }, [])

  return (
    <DataContext.Provider value={{ index, indexError, fetchSurah, readingProgress, saveReadingProgress }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
