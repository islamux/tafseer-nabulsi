/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        arabic: ['"Noto Naskh Arabic"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        verse: 'var(--verse-text)',
        'verse-glyph': 'var(--verse-glyph)',
        tafsir: 'var(--tafsir-text)',
      },
    },
  },
  plugins: [],
}
