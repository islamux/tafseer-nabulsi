import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Layout({ children }) {
  const location = useLocation()

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-bold font-arabic rtl-text" style={{ color: 'var(--accent)' }}>
            تفسير النابلسي
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/search"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline"
            style={{
              backgroundColor: location.pathname === '/search' ? 'var(--accent)' : 'transparent',
              color: location.pathname === '/search' ? '#fff' : 'var(--text-primary)',
            }}
          >
            <span>🔍</span>
            <span className="hidden sm:inline">Search</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
