import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { FavoritesProvider } from './contexts/FavoritesContext'
import { DataProvider } from './contexts/DataContext'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import SurahList from './components/SurahList'
import SurahView from './components/SurahView'
import SearchBar from './components/SearchBar'
import NotFound from './components/NotFound'

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <FavoritesProvider>
          <DataProvider>
            <BrowserRouter>
              <Layout>
                <Routes>
                  <Route path="/" element={<SurahList />} />
                  <Route path="/surah/:id" element={<SurahView />} />
                  <Route path="/search" element={<SearchBar />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </BrowserRouter>
          </DataProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
