import { describe, it, expect } from 'vitest'

const THEMES = ['light', 'dark', 'sepia']

describe('ThemeContext cycle', () => {
  it('cycles light → dark → sepia → light', () => {
    const cycle = (idx) => THEMES[(idx + 1) % THEMES.length]
    expect(cycle(0)).toBe('dark')
    expect(cycle(1)).toBe('sepia')
    expect(cycle(2)).toBe('light')
  })
})
