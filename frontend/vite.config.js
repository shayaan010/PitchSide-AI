import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/query': 'http://127.0.0.1:8000',
      '/ingest': 'http://127.0.0.1:8000',
      '/articles': 'http://127.0.0.1:8000',
    },
  },
})
