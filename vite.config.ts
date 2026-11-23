import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // /api diteruskan ke `pnpm dev:api`. Bila server itu tidak jalan, aplikasi otomatis masuk mode demo.
  // changeOrigin: false WAJIB — Host harus tetap localhost:5173 supaya cocok dengan Origin
  // browser; kalau diganti, pemeriksaan CSRF di server menolak semua POST/PUT/DELETE (403).
  server: { port: 5173, proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: false } } },
})
