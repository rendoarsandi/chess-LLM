import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { nativeTermuxRuntime } from './termux-runtime.mjs'

// Native workerd and browser checks belong on a supported desktop or CI host.
const action = process.argv[2]
let native = null
if (process.platform === 'android' && ['preview', 'deploy', 'dry-run'].includes(action)) {
  try {
    native = nativeTermuxRuntime()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
if (process.platform === 'android' && !native) {
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
if (native) {
  commands.preview = ['scripts/termux-runtime.mjs', 'preview']
  commands.deploy = [native.cli, 'deploy']
  commands['dry-run'] = [native.cli, 'deploy', '--dry-run']
}
const command = commands[action]
if (!command) {
  console.error('Unknown desktop check.')
  process.exit(1)
}
const root = fileURLToPath(new URL('../', import.meta.url))
const child = spawn(process.execPath, [...command, ...process.argv.slice(3)], {
  cwd: root,
  stdio: 'inherit',
  env: native?.env ?? process.env,
})
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('error', (error) => {
  console.error(error.message)
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
