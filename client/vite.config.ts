import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Vite Proxy] API Error:', err);
          });
        },
      },
      '/ws': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('[Vite Proxy] WS Error:', err);
          });
          proxy.on('proxyReqWs', (_proxyReq, _req, _socket, _options, _head) => {
            console.log('[Vite Proxy] Forwarding WS upgrade request');
          });
        },
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // @ts-expect-error - vitest configuration is not officially supported in vite config type
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
})
