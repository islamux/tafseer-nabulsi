import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'

afterEach(() => {
  cleanup()
  window.history.replaceState({}, '', '/')
})

function RouterTree({ basename }) {
  const routerProps = basename ? { basename } : {}
  return (
    <BrowserRouter {...routerProps}>
      <Routes>
        <Route path="/" element={<div>HOME</div>} />
        <Route path="*" element={<div>NOTFOUND</div>} />
      </Routes>
    </BrowserRouter>
  )
}

describe('routing on GitHub Pages project sub-path', () => {
  it('WITH basename: matches "/" at /tafseer-nabulsi/', () => {
    window.history.replaceState({}, '', '/tafseer-nabulsi/')
    const { getByText, queryByText } = render(<RouterTree basename="/tafseer-nabulsi/" />)
    expect(getByText('HOME')).toBeInTheDocument()
    expect(queryByText('NOTFOUND')).not.toBeInTheDocument()
  })

  it('WITHOUT basename: falls through to * (reproduces the bug)', () => {
    window.history.replaceState({}, '', '/tafseer-nabulsi/')
    const { getByText, queryByText } = render(<RouterTree />)
    expect(getByText('NOTFOUND')).toBeInTheDocument()
    expect(queryByText('HOME')).not.toBeInTheDocument()
  })
})
