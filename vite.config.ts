import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { debugLoggerPlugin } from './vite-debug-plugin'
import { localVideosPlugin } from './vite-local-videos-plugin'

// https://vite.dev/config/
export default defineConfig({
  base: '/golfswing/',
  plugins: [react(), tailwindcss(), debugLoggerPlugin(), localVideosPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
