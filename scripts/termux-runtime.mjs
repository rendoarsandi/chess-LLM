import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream, existsSync } from 'node:fs'
import { mkdir, rename } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const release = {
  tag: 'termux-aarch64-20260914.47.1',
  filename: 'wrangler_4.131.2_aarch64.deb',
  sha256: 'e680d57222a34240f3ae5be5635bf9da562fc097b369cdc476c626d69d7cdf15',
}
const runtime = join(root, '.local/native-runtime/data/data/com.termux/files/usr/lib/wrangler')

async function sha256(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

export function nativeTermuxRuntime() {
  const binary = join(runtime, 'native/workerd')
  if (!existsSync(binary))
    throw new Error('Run npm run setup:termux to prepare the native Android runtime.')
  const check = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 10000 })
  if (check.status !== 0 || check.stdout.trim() !== 'workerd 2026-09-11') {
    throw new Error(
      'The pinned native workerd failed its version check. Run npm run setup:termux again.',
    )
  }
  return {
    cli: join(runtime, 'bin/wrangler.js'),
    env: {
      ...process.env,
      WRANGLER_HOME: runtime,
      WORKERD_BINARY_PATH: binary,
      MINIFLARE_WORKERD_PATH: binary,
      ESBUILD_BINARY_PATH: join(runtime, 'native/esbuild'),
      WRANGLER_SEND_METRICS: 'false',
    },
  }
}

async function setup() {
  if (process.platform !== 'android' || process.arch !== 'arm64') {
    throw new Error('This optional runtime is for native Termux on Android arm64.')
  }
  const archive = join(root, '.local', release.filename)
  await mkdir(dirname(archive), { recursive: true })
  if (!existsSync(archive) || (await sha256(archive)) !== release.sha256) {
    const url = `https://github.com/adybag14-cyber/termux-python/releases/download/${release.tag}/${release.filename}`
    console.log(`Downloading the pinned community Android runtime from ${url}`)
    const response = await fetch(url, { signal: AbortSignal.timeout(180000) })
    if (!response.ok || !response.body)
      throw new Error(`Runtime download failed: HTTP ${response.status}`)
    const temporary = archive + '.part'
    await pipeline(response.body, createWriteStream(temporary))
    if ((await sha256(temporary)) !== release.sha256)
      throw new Error('Runtime checksum mismatch; nothing was extracted.')
    await rename(temporary, archive)
  }
  const result = spawnSync('dpkg-deb', ['-x', archive, join(root, '.local/native-runtime')], {
    stdio: 'inherit',
  })
  if (result.status !== 0)
    throw new Error('Native runtime extraction failed. Termux dpkg-deb is required.')
  nativeTermuxRuntime()
  console.log('Prepared native workerd 2026-09-11 and Wrangler 4.131.2 in .local/native-runtime.')
  console.log('No system package or global tool was replaced. Run npm run dev:cloudflare.')
}

async function preview() {
  const native = nativeTermuxRuntime()
  const frontendEnv = { ...process.env, GAMEBENCH_API_ORIGIN: 'http://127.0.0.1:8787' }
  delete frontendEnv.ESBUILD_BINARY_PATH
  console.log('Native workerd API: http://127.0.0.1:8787 · Vite frontend: http://127.0.0.1:5173')
  console.log('This community build uses compatibility date 2026-09-11 for local preview.')
  const children = [
    spawn(
      process.execPath,
      [
        native.cli,
        'dev',
        '--local',
        '--ip',
        '127.0.0.1',
        '--port',
        '8787',
        '--compatibility-date',
        '2026-09-11',
        '--persist-to',
        '.local/native-state',
      ],
      { cwd: root, env: native.env, stdio: 'inherit' },
    ),
    // Static assets use fibers missing in the community workerd build. Vite serves
    // the frontend and WASM while API/WebSockets still use real Durable Objects.
    spawn(
      process.execPath,
      [
        join(root, 'node_modules/vite/bin/vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        '5173',
        '--strictPort',
      ],
      {
        cwd: join(root, 'client'),
        env: frontendEnv,
        stdio: 'inherit',
      },
    ),
  ]
  let stopping = false
  function stop() {
    if (stopping) return
    stopping = true
    children.forEach((child) => child.kill('SIGTERM'))
  }
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop)
  await Promise.all(
    children.map(
      (child) =>
        new Promise((resolve) => {
          child.on('error', (error) => {
            console.error(error.message)
            process.exitCode = 1
            stop()
          })
          child.on('exit', (code) => {
            if (!stopping) {
              process.exitCode = code ?? 1
              stop()
            }
            resolve()
          })
        }),
    ),
  )
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    if (process.argv[2] === 'setup') await setup()
    else if (process.argv[2] === 'preview') await preview()
    else throw new Error('Use setup or preview.')
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
