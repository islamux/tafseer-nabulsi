import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import App from './App'

const fakeIndex = [
  { surah_id: 1, name: 'الفاتحة', ayah_count: 7, has_tafsir: true },
  { surah_id: 2, name: 'البقرة', ayah_count: 286, has_tafsir: true },
]

describe('App integration', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/tafseer-nabulsi/')
  })
  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
    window.history.replaceState({}, '', '/')
  })

  it('shows error UI on fetch failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'))
    const { findByText } = render(<App />)
    expect(await findByText(/تعذّر تحميل البيانات/, {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('renders surah list at /tafseer-nabulsi/', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => fakeIndex,
    })
    const { findByText } = render(<App />)
    expect(await findByText('الفاتحة', {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it('shows NotFound for unknown routes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => fakeIndex,
    })
    window.history.replaceState({}, '', '/tafseer-nabulsi/unknown-route')
    const { findByText } = render(<App />)
    expect(await findByText(/الصفحة غير موجودة/, {}, { timeout: 5000 })).toBeInTheDocument()
  })
})
