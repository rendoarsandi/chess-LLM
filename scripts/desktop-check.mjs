import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Native workerd and browser checks belong on a supported desktop or CI host.
if (process.platform === 'android') {
  console.error(
    'This check requires desktop Linux, macOS, Windows, or CI. On Termux, use npm run test:light. No browser or workerd process was started.',
  )
  process.exit(1)
}

const commands = {
  browser: ['node_modules/@playwright/test/cli.js', 'test'],
  cloudflare: ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.cloudflare.config.ts'],
  preview: ['node_modules/wrangler/bin/wrangler.js', 'dev'],
  deploy: ['node_modules/wrangler/bin/wrangler.js', 'deploy'],
  'dry-run': ['node_modules/wrangler/bin/wrangler.js', 'deploy', '--dry-run'],
}
const command = commands[process.argv[2]]
if (!command) {
  console.error('Unknown desktop check.')
  process.exit(1)
}
const root = fileURLToPath(new URL('../', import.meta.url))
const child = spawn(process.execPath, [...command, ...process.argv.slice(3)], {
  cwd: root,
  stdio: 'inherit',
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
