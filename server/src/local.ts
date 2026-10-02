import { serve } from '@hono/node-server'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createApi } from './api'
import { LocalPlatform } from './local-platform'
import { OpenRouterProvider } from './providers/openrouter'
import { NodeDatabase } from './storage/node-database'
import { attachLiveSockets } from './local-websocket'
import type { Server } from 'node:http'

const directory = resolve(process.env.GAMEBENCH_DATA_DIR ?? '../.local')
mkdirSync(directory, { recursive: true })
const database = new NodeDatabase(resolve(directory, 'gamebench.sqlite'))
const platform = new LocalPlatform(
  database,
  new OpenRouterProvider(process.env),
  process.env.ADMIN_API_TOKEN,
  !!process.env.OPENROUTER_API_KEY,
)
const api = createApi(() => platform)
const port = Number(process.env.PORT ?? 3001)
const server = serve({ fetch: api.fetch, hostname: '127.0.0.1', port }, () =>
  console.log(`GameBench API: http://127.0.0.1:${port}`),
)
const sockets = attachLiveSockets(server as Server, platform)
platform.start()

for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    platform.stop()
    sockets.close()
    server.close()
    process.exit(0)
  })
