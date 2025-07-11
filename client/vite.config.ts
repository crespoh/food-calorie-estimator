import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: 'dist',         // ✅ required by Vercel
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://food-calorie-estimator-production.up.railway.app',
        changeOrigin: true,
      },
    },
  },
});