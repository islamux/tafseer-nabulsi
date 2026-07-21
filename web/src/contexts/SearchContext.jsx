import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { buildSearchIndex, searchLocal } from '../api/search'

const SearchContext = createContext()

export function SearchProvider({ children }) {
  const [searchIndex, setSearchIndex] = useState(null)
  const [isBuildingIndex, setIsBuildingIndex] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const inflightRef = useRef(null)

  const search = useCallback(async (query) => {
    if (!query) return []
    let idx = searchIndex
    if (!idx) {
      if (!inflightRef.current) {
        setIsBuildingIndex(true)
        inflightRef.current = buildSearchIndex((done, total) => {
          setSearchProgress(Math.round((done / total) * 100))
        }).then(built => {
          setSearchIndex(built)
          return built
        }).finally(() => {
          setIsBuildingIndex(false)
          inflightRef.current = null
        })
      }
      idx = await inflightRef.current
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
