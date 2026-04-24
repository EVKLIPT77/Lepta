import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/azbyka': {
        target: 'https://azbyka.ru',
        changeOrigin: true,
        rewrite: () => '/days/widgets/presentations.json'
      }
    }
  }
})