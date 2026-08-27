import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SurahView from './SurahView'
import { useData } from '../contexts/DataContext'

const fakeSurah = {
  surah_id: 1,
  name: 'الفاتحة',
  ayahs: [
    { number: 1, text: 'بسم الله', tafsir_short: '', tafsir_long: '' },
    { number: 2, text: 'الحمد لله', tafsir_short: '', tafsir_long: '' },
  ],
}

vi.mock('../contexts/DataContext', () => ({
  useData: vi.fn(() => ({
    fetchSurah: vi.fn().mockResolvedValue(fakeSurah),
    index: [{ surah_id: 1, name: 'الفاتحة', ayah_count: 7, has_tafsir: true }],
  })),
}))

vi.mock('../contexts/ProgressContext', () => ({
  useProgress: vi.fn(() => ({
    readingProgress: {},
    saveReadingProgress: vi.fn(),
  })),
}))

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: vi.fn(() => ({
    toggleFavorite: vi.fn(),
    isFavorite: () => false,
  })),
}))

describe('SurahView', () => {
  afterEach(() => cleanup())

  it('renders ayahs after load', async () => {
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

  it('shows error message on fetch failure', async () => {
    useData.mockReturnValue({
      fetchSurah: vi.fn().mockRejectedValue(new Error('network error')),
      index: [{ surah_id: 1, name: 'الفاتحة', ayah_count: 7, has_tafsir: true }],
    })
    const { findByText } = render(
      <MemoryRouter initialEntries={['/surah/1']}>
        <Routes>
          <Route path="/surah/:id" element={<SurahView />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await findByText(/خطأ/)).toBeInTheDocument()
    expect(await findByText('العودة للرئيسية')).toBeInTheDocument()
  })

  it('shows NotFound for invalid surah ID', async () => {
    const { findByText } = render(
      <MemoryRouter initialEntries={['/surah/999']}>
        <Routes>
          <Route path="/surah/:id" element={<SurahView />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await findByText(/الصفحة غير موجودة/)).toBeInTheDocument()
  })
})
