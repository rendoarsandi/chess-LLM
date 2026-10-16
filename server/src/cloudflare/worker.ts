import handler from '../../../client/dist/server/server.js'
import { CloudflarePlatform } from './platform'
import type { WorkerEnv } from './env'

export { BenchmarkRun } from './run-object'
export { ArenaRegistry } from './registry-object'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    return handler.fetch(request, { context: { platform: new CloudflarePlatform(env) } })
  },
}
