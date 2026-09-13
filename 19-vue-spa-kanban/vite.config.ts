import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // Dev server on 5019, production preview of dist/ on 8019 (same port nginx uses in Docker).
  server: { port: 5019, strictPort: true, host: true },
  preview: { port: 8019, strictPort: true, host: true },
  build: { sourcemap: false },
})
