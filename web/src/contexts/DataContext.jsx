import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { loadIndex, loadSurah } from '../api/data'

const DataContext = createContext()

export function DataProvider({ children }) {
  const [index, setIndex] = useState([])
  const [indexError, setIndexError] = useState(null)

  useEffect(() => {
    loadIndex().then(setIndex).catch(err => setIndexError(err.message))
  }, [])

  const fetchSurah = useCallback(async (id) => {
    return loadSurah(id)
  }, [])

  return (
    <DataContext.Provider value={{ index, indexError, fetchSurah }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
