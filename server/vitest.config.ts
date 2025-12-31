import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    watch: false,
    include: ['src/**/*.test.ts'],
    setupFiles: ['./vitest.setup.ts'],
    environment: 'node',
    // Prevent database interference by running tests strictly sequentially
    pool: 'forks',
    fileParallelism: false,
    // Prevent long-running tests from hanging the suite
    testTimeout: 10000,
  },
})
