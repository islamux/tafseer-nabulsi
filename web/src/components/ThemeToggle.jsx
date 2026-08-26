import { useTheme } from '../contexts/ThemeContext'

const ICONS = {
  light: '☀️',
  dark: '🌙',
  sepia: '📜',
}

const LABELS = {
  light: 'فاتح',
  dark: 'داكن',
  sepia: 'سيبيا',
}

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  const label = LABELS[theme]

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors input-style"
      aria-label={`السمة الحالية: ${label}. اضغط للتبديل.`}
      title={`Current: ${label}. Click to switch.`}
    >
      <span aria-hidden="true">{ICONS[theme]}</span>
      <span className="hidden sm:inline" aria-hidden="true">{label}</span>
    </button>
  )
}
