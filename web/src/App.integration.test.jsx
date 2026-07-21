import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import App from './App'

const fakeIndex = [
  { surah_id: 1, name: 'الفاتحة', ayah_count: 7, has_tafsir: true },
  { surah_id: 2, name: 'البقرة', ayah_count: 286, has_tafsir: true },
]

describe('App full render at /tafseer-nabulsi/', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => fakeIndex,
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
    window.history.replaceState({}, '', '/')
  })

  it('renders the surah list with data (not NotFound)', async () => {
    window.history.replaceState({}, '', import.meta.env.BASE_URL)
    const { findByText, queryByText } = render(<App />)

    expect(await findByText('سور القرآن الكريم', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(await findByText('الفاتحة', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(queryByText('الصفحة غير موجودة')).not.toBeInTheDocument()
  })
})
