import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // needed for Docker
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/callback': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'build'
  }
})
