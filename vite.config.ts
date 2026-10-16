import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const raiz = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(raiz, './src'),
    },
  },
  server: {
    proxy: {
      '/api-stripe': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (caminho) => caminho.replace(/^\/api-stripe/, ''),
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
