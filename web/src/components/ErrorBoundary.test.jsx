import { describe, it, expect, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ErrorBoundary from './ErrorBoundary'

function ThrowingChild() {
  throw new Error('test error')
}

function WorkingChild() {
  return <div>works</div>
}

describe('ErrorBoundary', () => {
  afterEach(() => cleanup())

  it('renders children when no error', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <WorkingChild />
      </ErrorBoundary>
    )
    expect(getByText('works')).toBeInTheDocument()
  })

  it('renders error fallback when child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getByText } = render(
      <MemoryRouter>
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      </MemoryRouter>
    )
    expect(getByText('حدث خطأ')).toBeInTheDocument()
    expect(getByText('test error')).toBeInTheDocument()
    expect(getByText('العودة للرئيسية')).toBeInTheDocument()
    spy.mockRestore()
  })
})
