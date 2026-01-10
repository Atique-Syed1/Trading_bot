import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    hmr: {
      overlay: true,
      clientPort: 5173,
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Let Vite handle chunking automatically to avoid load order issues
        manualChunks: undefined,
      },
    },
    // Increase warning limit
    chunkSizeWarningLimit: 1000,
  },
})
