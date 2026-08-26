import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { DataProvider, useData } from './DataContext'

describe('DataContext', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    globalThis.fetch = vi.fn()
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('throws when useData is used outside provider', async () => {
    const { useData } = await import('./DataContext')
    expect(() => renderHook(() => useData())).toThrow('useData must be used within DataProvider')
  })

  it('loads index on mount', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([{ surah_id: 1, name: 'الفاتحة', ayah_count: 7, has_tafsir: true }]),
    })
    const { DataProvider, useData } = await import('./DataContext')
    const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>
    const { result } = renderHook(() => useData(), { wrapper })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.index).toHaveLength(1)
    expect(result.current.index[0].surah_id).toBe(1)
  })

  it('sets indexError on fetch failure', async () => {
    globalThis.fetch.mockRejectedValue(new Error('network'))
    const { DataProvider, useData } = await import('./DataContext')
    const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>
    const { result } = renderHook(() => useData(), { wrapper })
    await act(async () => { await vi.advanceTimersByTimeAsync(0) })
    expect(result.current.indexError).toBe('network')
    expect(result.current.index).toEqual([])
  })

  it('exposes fetchSurah function', async () => {
    const { DataProvider, useData } = await import('./DataContext')
    const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>
    const { result } = renderHook(() => useData(), { wrapper })
    expect(typeof result.current.fetchSurah).toBe('function')
  })
})
