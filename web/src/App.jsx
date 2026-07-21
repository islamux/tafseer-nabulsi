import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { DataProvider } from './contexts/DataContext'
import { SearchProvider } from './contexts/SearchContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import SurahList from './components/SurahList'
import Spinner from './components/Spinner'

const SurahView = lazy(() => import('./components/SurahView'))
const SearchBar = lazy(() => import('./components/SearchBar'))
const NotFound = lazy(() => import('./components/NotFound'))

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <FavoritesProvider>
          <DataProvider>
            <SearchProvider>
              <BrowserRouter basename={import.meta.env.BASE_URL}>
                <Layout>
                  <Suspense fallback={<Spinner />}>
                    <Routes>
                      <Route path="/" element={<SurahList />} />
                      <Route path="/surah/:id" element={<SurahView />} />
                      <Route path="/search" element={<SearchBar />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </Layout>
              </BrowserRouter>
            </SearchProvider>
          </DataProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
