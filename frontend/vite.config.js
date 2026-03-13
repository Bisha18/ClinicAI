import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Tailwind v4 uses a Vite plugin instead of PostCSS.
// No tailwind.config.js or postcss.config.js needed.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),   // ← Tailwind v4 Vite plugin
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})