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
        manualChunks: (id) => {
          // Node modules chunking
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react';
            }
            // Charts
            if (id.includes('lightweight-charts')) {
              return 'vendor-lightweight-charts';
            }
            if (id.includes('recharts') || id.includes('d3-')) {
              return 'vendor-recharts';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // Export utilities
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas';
            }
            if (id.includes('jspdf')) {
              return 'vendor-jspdf';
            }
            // Markdown & sanitization
            if (id.includes('dompurify') || id.includes('react-markdown') || id.includes('remark') || id.includes('unified') || id.includes('micromark') || id.includes('mdast') || id.includes('hast')) {
              return 'vendor-markdown';
            }
            // i18n
            if (id.includes('i18next')) {
              return 'vendor-i18n';
            }
            // Other smaller vendor libs
            return 'vendor-misc';
          }
          
          // App code chunking by feature
          if (id.includes('/components/dashboard/')) {
            return 'feature-dashboard';
          }
          if (id.includes('/components/scanner/')) {
            return 'feature-scanner';
          }
          if (id.includes('/components/portfolio/')) {
            return 'feature-portfolio';
          }
          if (id.includes('/components/settings/')) {
            return 'feature-settings';
          }
          if (id.includes('/components/backtest/')) {
            return 'feature-backtest';
          }
        },
      },
    },
    // Increase warning limit (after optimization)
    chunkSizeWarningLimit: 500,
  },
})
