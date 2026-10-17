import type { LiveEvent, RunConfig, RunSnapshot } from '../../shared/protocol'
import type { ArenaQuery, HistoryQuery } from '../../shared/arena'
import type { Platform } from './core/platform'
import type { ModelProvider } from './core/provider'
import { BenchmarkRunner, RunConflict } from './core/runner'
import { games } from './games/chess'
import { Registry } from './storage/registry'
import { RunStore } from './storage/run-store'
import type { Database } from './storage/database'
import { exportRun } from './core/export'
import type { McpOperation } from '../../shared/mcp'
import { McpMatchService } from './core/mcp-match'

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
    new RunStore(db, 'schema')
    let cursor = ''
    while (true) {
      const rows = db.query<{ id: string; document: string }>(
        'SELECT id, document FROM run_state WHERE id > ? ORDER BY id LIMIT 25',
        cursor,
      )
      if (!rows.length) break
      for (const row of rows) this.registry.arena.index(JSON.parse(row.document) as RunSnapshot)
      cursor = rows[rows.length - 1].id
    }
    for (const row of db.query<{ id: string }>(
      'SELECT r.id FROM runs r LEFT JOIN run_state s ON s.id = r.id WHERE s.id IS NULL',
    ))
      this.registry.arena.unavailable(row.id)
    this.health = { providerConfigured, adminConfigured: !!adminToken, runtime: 'local' as const }
  }
  listModels() {
    return this.provider.listModels()
  }
  async listRuns() {
    return this.registry.list()
  }
  async leaderboard(query: ArenaQuery) {
    return this.registry.arena.leaderboard(query)
  }
  async history(query: HistoryQuery) {
    return this.registry.arena.history(query)
  }
  async getRun(id: string) {
    return new RunStore(this.db, id).read()
  }
  async createRun(id: string, config: RunConfig) {
    const run = this.getRunner(id, config).create(id, config)
    this.registry.arena.index(run)
    return run
  }
  async command(id: string, action: 'pause' | 'resume' | 'cancel') {
    const run = await this.getRun(id)
    if (!run) throw new RunConflict('Run not found.')
    const current = this.getRunner(id, run.config).command(action)
    this.registry.arena.index(current)
    this.emit(id, { type: 'snapshot', run: current })
    return current
  }
  async attempts(id: string, matchId?: string) {
    return new RunStore(this.db, id).attempts(matchId)
  }
  async exportRun(id: string) {
    return exportRun(new RunStore(this.db, id))
  }

  issueMcpCredentials(id: string) {
    return new McpMatchService(new RunStore(this.db, id)).issueCredentials()
  }

  async mcp(id: string, token: string, operation: McpOperation) {
    const reply = await new McpMatchService(new RunStore(this.db, id)).execute(token, operation)
    if (operation.type === 'join' || operation.type === 'move') {
      const run = new RunStore(this.db, id).read()!
      this.registry.arena.index(run)
      this.emit(id, { type: 'snapshot', run })
    }
    return reply
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
    if (!run || run.config.execution === 'mcp') return
    await this.getRunner(id, run.config).tick()
    const current = (await this.getRun(id)) as RunSnapshot
    this.latestProgress.delete(id)
    this.registry.arena.index(current)
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
          "SELECT id FROM run_state WHERE (json_extract(document, '$.status') = 'running' OR json_extract(document, '$.pending') IS NOT NULL) AND COALESCE(json_extract(document, '$.config.execution'), 'api') != 'mcp'",
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
