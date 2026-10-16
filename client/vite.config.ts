import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { localRuntime } from '../server/src/vite-runtime'

export default defineConfig({
  plugins: [localRuntime(), tanstackStart(), react()],
  server: {
    host: '127.0.0.1',
    proxy: process.env.GAMEBENCH_API_ORIGIN
      ? {
          '/api': { target: process.env.GAMEBENCH_API_ORIGIN, ws: true },
        }
      : undefined,
  },
})
