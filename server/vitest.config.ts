import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
    // Optimize for speed
    pool: 'threads',
    // Top-level pool options for newer Vitest versions
    threads: {
      singleThread: false,
    },
    // Prevent long-running tests from hanging the suite
    testTimeout: 10000,
  },
})
