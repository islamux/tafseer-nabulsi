import { describe, it, expect, beforeEach } from 'vitest'
import { mergeFavorites } from './FavoritesContext'

describe('FavoritesContext serialization', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips Set to Array and back', () => {
    const favorites = { '1': new Set([1, 2, 3]) }
    const serialized = JSON.stringify(
      Object.fromEntries(
        Object.entries(favorites).map(([k, v]) => [k, [...v]])
      )
    )
    localStorage.setItem('tafsir-favorites', serialized)

    const raw = localStorage.getItem('tafsir-favorites')
    const parsed = JSON.parse(raw)
    const restored = {}
    for (const [surahId, ayahs] of Object.entries(parsed)) {
      restored[surahId] = new Set(ayahs)
    }
    expect(restored['1']).toEqual(new Set([1, 2, 3]))
  })

  it('falls back to empty object on corrupt JSON', () => {
    localStorage.setItem('tafsir-favorites', '{invalid json}')
    const raw = localStorage.getItem('tafsir-favorites')
    let result = {}
    try {
      const parsed = JSON.parse(raw)
      for (const [surahId, ayahs] of Object.entries(parsed)) {
        result[surahId] = new Set(ayahs)
      }
    } catch {
      result = {}
    }
    expect(result).toEqual({})
  })
})

describe('mergeFavorites (sync merge — no data loss)', () => {
  it('unions local and remote, keeping entries only on one side', () => {
    const local = { '2': new Set([5, 6]), '3': new Set([1]) }
    const remote = { '2': new Set([6, 7]), '4': new Set([9]) }
    expect(mergeFavorites(local, remote)).toEqual({
      '2': new Set([5, 6, 7]),
      '3': new Set([1]),
      '4': new Set([9]),
    })
  })

  it('handles empty inputs', () => {
    expect(mergeFavorites({}, {})).toEqual({})
    expect(mergeFavorites({ '1': new Set([1]) }, {})).toEqual({ '1': new Set([1]) })
    expect(mergeFavorites({}, { '1': new Set([1]) })).toEqual({ '1': new Set([1]) })
  })
})
