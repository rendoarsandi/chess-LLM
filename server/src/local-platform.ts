import type { LiveEvent, RunConfig, RunSnapshot } from '../../shared/protocol'
import { summarize } from '../../shared/protocol'
import type { Platform } from './core/platform'
import type { ModelProvider } from './core/provider'
import { BenchmarkRunner, RunConflict } from './core/runner'
import { games } from './games/chess'
import { Registry } from './storage/registry'
import { RunStore } from './storage/run-store'
import type { Database } from './storage/database'
import { exportRun } from './core/export'

/** Development host for the same runner/storage contract; production uses DO alarms. */
export class LocalPlatform implements Platform {
  health
  private registry: Registry
  private runners = new Map<string, BenchmarkRunner>()
  private timer: ReturnType<typeof setTimeout> | null = null
  private stopped = true
  private subscribers = new Map<string, Set<(event: LiveEvent) => void>>()
  private latestProgress = new Map<string, LiveEvent>()

  constructor(
    private db: Database,
    private provider: ModelProvider,
    public adminToken?: string,
    providerConfigured = false,
  ) {
    this.registry = new Registry(db)
    this.health = { providerConfigured, adminConfigured: !!adminToken, runtime: 'local' as const }
  }
  listModels() {
    return this.provider.listModels()
  }
  async listRuns() {
    return this.registry.list()
  }
  async getRun(id: string) {
    return new RunStore(this.db, id).read()
  }
  async createRun(id: string, config: RunConfig) {
    const run = this.getRunner(id, config).create(id, config)
    this.registry.upsert(summarize(run))
    return run
  }
  async command(id: string, action: 'pause' | 'resume' | 'cancel') {
    const run = await this.getRun(id)
    if (!run) throw new RunConflict('Run not found.')
    const current = this.getRunner(id, run.config).command(action)
    this.registry.upsert(summarize(current))
    this.emit(id, { type: 'snapshot', run: current })
    return current
  }
  async attempts(id: string, matchId?: string) {
    return new RunStore(this.db, id).attempts(matchId)
  }
  async exportRun(id: string) {
    return exportRun(new RunStore(this.db, id))
  }

  private getRunner(id: string, config: RunConfig) {
    if (!this.runners.has(id))
      this.runners.set(
        id,
        new BenchmarkRunner(
          new RunStore(this.db, id),
          games[config.gameId],
          this.provider,
          (event) => {
            this.latestProgress.set(id, event)
            this.emit(id, event)
          },
        ),
      )
    return this.runners.get(id)!
  }

  async tickRun(id: string) {
    const run = await this.getRun(id)
    if (!run) return
    await this.getRunner(id, run.config).tick()
    const current = (await this.getRun(id)) as RunSnapshot
    this.latestProgress.delete(id)
    this.registry.upsert(summarize(current))
    this.emit(id, { type: 'snapshot', run: current })
  }

  subscribe(id: string, callback: (event: LiveEvent) => void) {
    if (!this.subscribers.has(id)) this.subscribers.set(id, new Set())
    this.subscribers.get(id)!.add(callback)
    const run = new RunStore(this.db, id).read()
    if (run) callback({ type: 'snapshot', run })
    const progress = this.latestProgress.get(id)
    if (progress) callback(progress)
    return () => {
      this.subscribers.get(id)?.delete(callback)
      if (!this.subscribers.get(id)?.size) this.subscribers.delete(id)
    }
  }
  private emit(id: string, event: LiveEvent) {
    for (const callback of this.subscribers.get(id) ?? []) callback(event)
  }

  start() {
    if (!this.stopped) return
    this.stopped = false
    const tick = async () => {
      try {
        const pending = this.db.query<{ id: string }>(
          "SELECT id FROM run_state WHERE json_extract(document, '$.status') = 'running' OR json_extract(document, '$.pending') IS NOT NULL",
        )
        await Promise.all(pending.map((run) => this.tickRun(run.id)))
      } catch (error) {
        console.error('Local benchmark tick failed', error)
      }
      if (!this.stopped) this.timer = setTimeout(tick, 1000)
    }
    // Ensure tables exist even before the first experiment.
    new RunStore(this.db, 'schema')
    this.timer = setTimeout(tick, 1000)
  }
  stop() {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
  }
}
