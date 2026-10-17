import type { DurableObjectState } from '@cloudflare/workers-types'
import { Registry } from '../storage/registry'
import type { RunSnapshot, RunSummary } from '../../../shared/protocol'
import { durableDatabase } from './database'
import type { WorkerEnv } from './env'
import { parseArenaQuery } from '../api'

export class ArenaRegistry {
  private registry: Registry
  private backfillTask: Promise<void> | null = null
  constructor(
    private state: DurableObjectState,
    private env: WorkerEnv,
  ) {
    this.registry = new Registry(durableDatabase(state.storage))
  }

  private async backfill() {
    if (this.backfillTask) return this.backfillTask
    this.backfillTask = (async () => {
      const pending = this.registry.arena.pending(10)
      // Persist a retry before reading another object, including request-triggered backfills.
      if (pending.length) await this.state.storage.setAlarm(Date.now() + 1000)
      for (const id of pending) {
        const response = await this.env.BENCHMARK_RUN.getByName(id).fetch('https://run/')
        if (!response.ok) throw new Error('Historical run unavailable')
        const run = (await response.json()) as RunSnapshot | null
        if (run) this.registry.arena.index(run)
        else this.registry.arena.unavailable(id)
      }
      if (this.registry.arena.pending(1).length)
        await this.state.storage.setAlarm(Date.now() + 1000)
    })().finally(() => {
      this.backfillTask = null
    })
    return this.backfillTask
  }

  async alarm() {
    await this.backfill()
  }

  async fetch(request: Request) {
    if (request.method === 'POST') {
      const run = (await request.json()) as RunSnapshot | RunSummary
      if ('config' in run) this.registry.arena.index(run)
      else {
        this.registry.upsert(run)
        await this.state.storage.setAlarm(Date.now() + 1000)
      }
      return Response.json({ saved: true })
    }
    const url = new URL(request.url)
    if (url.pathname === '/leaderboard' || url.pathname === '/history') {
      await this.backfill()
      const query = parseArenaQuery(url.searchParams)
      return Response.json(
        url.pathname === '/leaderboard'
          ? this.registry.arena.leaderboard(query)
          : this.registry.arena.history(query),
      )
    }
    return Response.json(this.registry.list())
  }
}
