import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loadIndex, loadSurah, buildSearchIndex, searchLocal } from '../api/data'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [index, setIndex] = useState([])
  const [surahCache, setSurahCache] = useState(new Map())
  const [searchIndex, setSearchIndex] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)

  useEffect(() => {
    loadIndex().then(setIndex).catch(console.error)
  }, [])

  const getSurah = useCallback(async (id) => {
    if (surahCache.has(id)) return surahCache.get(id)
    const data = await loadSurah(id)
    setSurahCache(prev => new Map(prev).set(id, data))
    return data
  }, [surahCache])

  const search = useCallback(async (query) => {
    if (!query) return []
    let idx = searchIndex
    if (!idx) {
      setSearchLoading(true)
      idx = await buildSearchIndex((done, total) => {
        setSearchProgress(Math.round((done / total) * 100))
      })
      setSearchIndex(idx)
      setSearchLoading(false)
    }
    return searchLocal(query, idx)
  }, [searchIndex])

  return (
    <DataContext.Provider value={{
      index,
      getSurah,
      search,
      searchLoading,
      searchProgress,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
