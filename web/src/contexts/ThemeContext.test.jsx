import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

function ThemeDisplay() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>cycle</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('sets data-theme attribute on mount', () => {
    render(
      <ThemeProvider>
        <div>child</div>
      </ThemeProvider>
    )
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('toggleTheme cycles light → dark → sepia → light', async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('light')
    await screen.getByText('cycle').click()
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    await screen.getByText('cycle').click()
    expect(screen.getByTestId('theme').textContent).toBe('sepia')
    await screen.getByText('cycle').click()
    expect(screen.getByTestId('theme').textContent).toBe('light')
  })

  it('persists theme to localStorage', async () => {
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    )
    await screen.getByText('cycle').click()
    expect(localStorage.getItem('tafsir-theme')).toBe('dark')
  })

  it('reads stored theme on mount', () => {
    localStorage.setItem('tafsir-theme', 'sepia')
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    )
    expect(screen.getByTestId('theme').textContent).toBe('sepia')
  })

  it('throws when useTheme is used outside provider', () => {
    expect(() => render(<ThemeDisplay />)).toThrow('useTheme must be used within ThemeProvider')
  })
})
