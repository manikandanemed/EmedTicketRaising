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
        target: 'https://icdextract.emedlogix.com/ticket-system',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ticket-system/, ''),
      },
      '/ticket-system/uploads': {
        target: 'https://icdextract.emedlogix.com/ticket-system',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ticket-system/, ''),
      }
    }
  }
}));
