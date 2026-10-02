import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.toml' },
      miniflare: {
        bindings: { ADMIN_API_TOKEN: 'fixture-admin', OPENROUTER_API_KEY: 'fixture-key' },
      },
    }),
  ],
  test: { include: ['tests/cloudflare/**/*.test.js'], testTimeout: 20000 },
})
