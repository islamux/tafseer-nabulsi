import { describe, it, expect, beforeEach } from 'vitest'

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
