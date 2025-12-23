import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
    // Prevent database interference by running tests sequentially
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    // Prevent long-running tests from hanging the suite
    testTimeout: 10000,
  },
})
