import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': { target: process.env.GAMEBENCH_API_ORIGIN ?? 'http://127.0.0.1:3001', ws: true },
    },
  },
  test: { include: ['src/**/*.test.{ts,tsx}'], environment: 'jsdom' },
})
