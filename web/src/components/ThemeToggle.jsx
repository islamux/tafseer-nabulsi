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

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors input-style"
      title={`Current: ${LABELS[theme]}. Click to switch.`}
    >
      <span>{ICONS[theme]}</span>
      <span className="hidden sm:inline">{LABELS[theme]}</span>
    </button>
  )
}
