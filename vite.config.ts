import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   base: command === 'serve' ? '/' : '/ticket-system/',
// })

export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'serve' ? '/' : '/ticket-system/',
  server: {
    proxy: {
      '/ticket-system/api': {
        target: 'http://127.0.0.1:5298',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ticket-system/, ''),
      },
      '/ticket-system/uploads': {
        target: 'http://127.0.0.1:5298',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ticket-system/, ''),
      },
      '/api': {
        target: 'http://127.0.0.1:5298',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5298',
        changeOrigin: true,
      }
    }
  }
}));
