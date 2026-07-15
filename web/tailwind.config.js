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
        primary: {
          light: '#00897b',
          dark: '#4db6ac',
          sepia: '#00796b',
        },
      },
    },
  },
  plugins: [],
}
