import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import { SearchProvider, useSearch } from './SearchContext'

vi.mock('../api/search', () => ({
  buildSearchIndex: vi.fn(),
  searchLocal: vi.fn(),
}))

import { buildSearchIndex, searchLocal } from '../api/search'

function TestConsumer() {
  const { search, isBuildingIndex, searchProgress } = useSearch()
  return (
    <div>
      <span data-testid="building">{String(isBuildingIndex)}</span>
      <span data-testid="progress">{searchProgress}</span>
      <button onClick={() => search('test')}>search</button>
    </div>
  )
}

describe('SearchContext', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('provides search, isBuildingIndex, searchProgress', () => {
    const { getByTestId } = render(
      <SearchProvider>
        <TestConsumer />
      </SearchProvider>
    )
    expect(getByTestId('building').textContent).toBe('false')
    expect(getByTestId('progress').textContent).toBe('0')
  })

  it('throws when used outside provider', () => {
    expect(() => render(<TestConsumer />)).toThrow(/useSearch must be used within SearchProvider/)
  })

  it('returns empty array for empty query', async () => {
    let result = undefined
    function EmptyQueryConsumer() {
      const { search } = useSearch()
      return (
        <button onClick={async () => { result = await search(''); }}>
          click
        </button>
      )
    }
    const { getByRole } = render(
      <SearchProvider>
        <EmptyQueryConsumer />
      </SearchProvider>
    )
    await getByRole('button').click()
    await waitFor(() => expect(result).toEqual([]))
    expect(buildSearchIndex).not.toHaveBeenCalled()
  })
})
