import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-lightweight-charts': ['lightweight-charts'],
          'vendor-recharts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-html2canvas': ['html2canvas'],
          'vendor-dompurify': ['dompurify'],
        },
      },
    },
    // Increase warning limit slightly (we'll still optimize)
    chunkSizeWarningLimit: 600,
  },
})
