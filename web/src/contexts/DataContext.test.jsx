import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { DataProvider, useData } from './DataContext'
import { createElement } from 'react'

vi.mock('../api/data', () => ({
  loadIndex: vi.fn(),
  loadSurah: vi.fn(),
}))

vi.mock('../api/worker', () => ({
  getDeviceId: vi.fn(() => null),
  fetchProgress: vi.fn(() => Promise.resolve(null)),
  saveProgress: vi.fn(),
}))

function wrapper({ children }) {
  return createElement(DataProvider, null, children)
}

describe('DataContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws when useData is used outside provider', () => {
    expect(() => renderHook(() => useData())).toThrow('useData must be used within DataProvider')
  })

  it('returns empty index on mount', async () => {
    const { loadIndex } = await import('../api/data')
    loadIndex.mockResolvedValue([])
    const { result } = renderHook(() => useData(), { wrapper })
    expect(result.current.index).toEqual([])
    expect(result.current.indexError).toBeNull()
  })

  it('populates index after loadIndex resolves', async () => {
    const { loadIndex } = await import('../api/data')
    const mockIndex = [{ surah_id: 1, name: 'الفاتحة' }]
    loadIndex.mockResolvedValue(mockIndex)
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => {
      expect(result.current.index).toEqual(mockIndex)
    })
  })

  it('sets indexError when loadIndex rejects', async () => {
    const { loadIndex } = await import('../api/data')
    loadIndex.mockRejectedValue(new Error('network fail'))
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => {
      expect(result.current.indexError).toBe('network fail')
    })
  })

  it('populates readingProgress from fetchProgress', async () => {
    const { loadIndex } = await import('../api/data')
    const { getDeviceId, fetchProgress } = await import('../api/worker')
    loadIndex.mockResolvedValue([])
    getDeviceId.mockReturnValue('test-device')
    fetchProgress.mockResolvedValue([{ surah_id: 2, last_ayah_number: 5 }])
    const { result } = renderHook(() => useData(), { wrapper })
    await waitFor(() => {
      expect(result.current.readingProgress).toEqual({ 2: 5 })
    })
  })

  it('saveReadingProgress updates state', async () => {
    const { loadIndex } = await import('../api/data')
    loadIndex.mockResolvedValue([])
    const { result } = renderHook(() => useData(), { wrapper })
    act(() => {
      result.current.saveReadingProgress(3, 10)
    })
    expect(result.current.readingProgress).toEqual({ 3: 10 })
  })
})
