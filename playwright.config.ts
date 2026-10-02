import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
        (process.platform === 'android'
          ? '/data/data/com.termux/files/usr/bin/chromium-browser'
          : undefined),
      args: ['--no-sandbox'],
    },
  },
  webServer: [
    {
      command: 'npx tsx server/test/ui-server.ts',
      url: 'http://127.0.0.1:3002/api/health',
      timeout: 60000,
    },
    {
      command: 'GAMEBENCH_API_ORIGIN=http://127.0.0.1:3002 npm run dev -w client -- --port 5174',
      url: 'http://127.0.0.1:5174',
      timeout: 60000,
    },
  ],
})
