import type { Plugin } from 'vite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { LocalPlatform } from './local-platform'
import { OpenRouterProvider } from './providers/openrouter'
import { NodeDatabase } from './storage/node-database'
import { attachLiveSockets } from './local-websocket'
import './request-context'

export function localRuntime(): Plugin {
  return {
    name: 'gamebench-local-runtime',
    apply: 'serve',
    configureServer(server) {
      if (process.env.GAMEBENCH_API_ORIGIN || !server.httpServer) return
      const directory = resolve(process.env.GAMEBENCH_DATA_DIR ?? '../.local')
      mkdirSync(directory, { recursive: true })
      const database = new NodeDatabase(resolve(directory, 'gamebench.sqlite'))
      const platform = new LocalPlatform(
        database,
        new OpenRouterProvider(process.env),
        process.env.ADMIN_API_TOKEN,
        !!process.env.OPENROUTER_API_KEY,
      )
      globalThis.__gamebenchPlatform = platform
      const sockets = attachLiveSockets(server.httpServer, platform)
      platform.start()
      server.httpServer.once('close', () => {
        platform.stop()
        sockets.close()
        database.close()
        if (globalThis.__gamebenchPlatform === platform) globalThis.__gamebenchPlatform = undefined
      })
    },
  }
}
