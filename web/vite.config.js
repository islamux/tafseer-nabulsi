import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function resolveApiOrigin() {
  if (process.env.VITE_API_ORIGIN !== undefined) return process.env.VITE_API_ORIGIN
  const base = process.env.VITE_API_BASE
  if (base) {
    try { return new URL(base).origin } catch { return '' }
  }
  return ''
}

function cspApiOriginPlugin() {
  const origin = resolveApiOrigin()
  return {
    name: 'csp-api-origin',
    transformIndexHtml(html) {
      return html.replaceAll('__CSP_API_ORIGIN__', origin)
    },
  }
}

export default defineConfig({
  base: '/tafseer-nabulsi/',
  plugins: [react(), cspApiOriginPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
