import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Dev convenience: the vite server (hot reload) forwards API calls to the
  // wrangler server (Functions + D1), so either port gives the full app.
  server: {
    proxy: {
      '/api': 'http://localhost:8788',
    },
  },
})
