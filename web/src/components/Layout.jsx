import { NavLink } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <NavLink to="/" className="flex items-center gap-2 no-underline">
          <span className="text-xl font-bold arabic-text text-accent">
            تفسير النابلسي
          </span>
        </NavLink>

        <div className="flex items-center gap-3">
          <NavLink
            to="/search"
            className={({ isActive }) =>
              `flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors no-underline ${isActive ? 'badge-accent' : 'text-primary'}`
            }
          >
            <span>🔍</span>
            <span className="hidden sm:inline arabic-text">بحث</span>
          </NavLink>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
