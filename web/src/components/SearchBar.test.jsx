import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SearchBar from './SearchBar'

const mockSearch = vi.fn()
vi.mock('../contexts/SearchContext', () => ({
  useSearch: () => ({
    search: mockSearch,
    isBuildingIndex: false,
    searchProgress: 0,
  }),
}))

function renderWithRouter(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('SearchBar', () => {
  beforeEach(() => {
    mockSearch.mockReset()
  })

  afterEach(() => vi.restoreAllMocks())

  it('renders search input and button', () => {
    renderWithRouter(<SearchBar />)
    expect(screen.getByPlaceholderText('ابحث في النص أو التفسير...')).toBeInTheDocument()
    expect(screen.getByText('بحث')).toBeInTheDocument()
  })

  it('shows error state on search failure', async () => {
    mockSearch.mockRejectedValue(new Error('timeout'))
    renderWithRouter(<SearchBar />)
    fireEvent.change(screen.getByPlaceholderText('ابحث في النص أو التفسير...'), { target: { value: 'test' } })
    fireEvent.keyDown(screen.getByPlaceholderText('ابحث في النص أو التفسير...'), { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByText(/تعذّر البحث/)).toBeInTheDocument()
    })
  })

  it('shows empty results message', async () => {
    mockSearch.mockResolvedValue([])
    renderWithRouter(<SearchBar />)
    fireEvent.change(screen.getByPlaceholderText('ابحث في النص أو التفسير...'), { target: { value: 'xyz' } })
    fireEvent.keyDown(screen.getByPlaceholderText('ابحث في النص أو التفسير...'), { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByText(/لا توجد نتائج/)).toBeInTheDocument()
    })
  })

  it('does not search on empty query', () => {
    renderWithRouter(<SearchBar />)
    fireEvent.keyDown(screen.getByPlaceholderText('ابحث في النص أو التفسير...'), { key: 'Enter' })
    expect(mockSearch).not.toHaveBeenCalled()
  })
})
