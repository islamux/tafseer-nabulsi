import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SurahView from './SurahView'

vi.mock('../contexts/DataContext', () => {
  const fakeIndex = [{ surah_id: 1, name: 'الفاتحة', ayah_count: 7, has_tafsir: true }]
  const fakeSurah = {
    surah_id: 1,
    name: 'الفاتحة',
    ayahs: [
      { number: 1, text: 'بسم الله', tafsir_short: '', tafsir_long: '' },
      { number: 2, text: 'الحمد لله', tafsir_short: '', tafsir_long: '' },
    ],
  }
  return {
    useData: () => ({
      fetchSurah: vi.fn().mockResolvedValue(fakeSurah),
      index: fakeIndex,
      readingProgress: {},
      saveReadingProgress: vi.fn(),
    }),
  }
})

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    toggleFavorite: vi.fn(),
    isFavorite: () => false,
  }),
}))

describe('SurahView', () => {
  afterEach(() => cleanup())

  it('renders ayahs and wires data-ayah nodes after load', async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={['/surah/1']}>
        <Routes>
          <Route path="/surah/:id" element={<SurahView />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await findByText('سورة الفاتحة')).toBeInTheDocument()
    expect(document.querySelector('[data-ayah="1"]')).toBeTruthy()
    expect(document.querySelector('[data-ayah="2"]')).toBeTruthy()
  })
})
