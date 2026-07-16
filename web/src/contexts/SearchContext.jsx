import { createContext, useContext, useState, useCallback } from 'react'
import { buildSearchIndex, searchLocal } from '../api/search'

const SearchContext = createContext()

export function SearchProvider({ children }) {
  const [searchIndex, setSearchIndex] = useState(null)
  const [isBuildingIndex, setIsBuildingIndex] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)

  const search = useCallback(async (query) => {
    if (!query) return []
    let idx = searchIndex
    if (!idx) {
      setIsBuildingIndex(true)
      try {
        idx = await buildSearchIndex((done, total) => {
          setSearchProgress(Math.round((done / total) * 100))
        })
        setSearchIndex(idx)
      } finally {
        setIsBuildingIndex(false)
      }
    }
    return searchLocal(query, idx)
  }, [searchIndex])

  return (
    <SearchContext.Provider value={{ search, isBuildingIndex, searchProgress }}>
      {children}
    </SearchContext.Provider>
  )
}

export function useSearch() {
  const ctx = useContext(SearchContext)
  if (!ctx) throw new Error('useSearch must be used within SearchProvider')
  return ctx
}
