import { createApi } from '../api'
import { CloudflarePlatform } from './platform'
import type { WorkerEnv } from './env'

const api = createApi<WorkerEnv>((env) => new CloudflarePlatform(env))

export { BenchmarkRun } from './run-object'
export { ArenaRegistry } from './registry-object'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    if (new URL(request.url).pathname.startsWith('/api/')) return api.fetch(request, env)
    return env.ASSETS.fetch(request.url, {
      method: request.method,
      headers: Object.fromEntries(request.headers),
    })
  },
}
