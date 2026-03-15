import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Forward all /api/* requests from Vite dev server (port 5173)
      // to the FastAPI backend (port 8000).
      // This means VITE_API_BASE_URL does NOT need to be set in .env —
      // axios uses '' (same-origin) and Vite proxies it to :8000.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})