import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/query': 'http://localhost:8000',
      '/ingest': 'http://localhost:8000',
      '/articles': 'http://localhost:8000',
    },
  },
})
