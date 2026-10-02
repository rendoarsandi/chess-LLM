import type { DurableObjectState, WebSocket as WorkerWebSocket } from '@cloudflare/workers-types'
import type { LiveEvent, RunConfig } from '../../../shared/protocol'
import { summarize } from '../../../shared/protocol'
import { BenchmarkRunner, RunConflict } from '../core/runner'
import { games } from '../games/chess'
import { OpenRouterProvider } from '../providers/openrouter'
import { RunStore } from '../storage/run-store'
import { durableDatabase } from './database'
import type { WorkerEnv } from './env'
import { exportRun } from '../core/export'

export class BenchmarkRun {
  private store: RunStore
  private runner: BenchmarkRunner | null = null
  private latestProgress: LiveEvent | null = null

  constructor(
    private ctx: DurableObjectState,
    private env: WorkerEnv,
  ) {
    this.store = new RunStore(durableDatabase(ctx.storage), 'run')
  }

  private getRunner(config: RunConfig) {
    this.runner ??= new BenchmarkRunner(
      this.store,
      games[config.gameId],
      new OpenRouterProvider(this.env),
      (event) => {
        this.latestProgress = event
        this.broadcast(event)
      },
    )
    return this.runner
  }

  async fetch(request: Request) {
    const url = new URL(request.url)
    try {
      if (url.pathname === '/initialize' && request.method === 'POST') {
        const { id, config } = (await request.json()) as { id: string; config: RunConfig }
        const run = this.getRunner(config).create(id, config)
        if (run.status === 'running') await this.ctx.storage.setAlarm(Date.now() + 1000)
        return Response.json(run)
      }
      const run = this.store.read()
      if (url.pathname === '/export') return exportRun(this.store)
      if (url.pathname === '/live') {
        if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
          return new Response('WebSocket upgrade required', { status: 426 })
        if (!run) return new Response('Run not found', { status: 404 })
        const pair = new WebSocketPair()
        this.ctx.acceptWebSocket(pair[1] as unknown as WorkerWebSocket)
        pair[1].send(JSON.stringify({ type: 'snapshot', run }))
        if (this.latestProgress) pair[1].send(JSON.stringify(this.latestProgress))
        return new Response(null, { status: 101, webSocket: pair[0] })
      }
      if (url.pathname === '/attempts')
        return Response.json(this.store.attempts(url.searchParams.get('matchId') ?? undefined))
      if (url.pathname === '/' && request.method === 'GET') return Response.json(run)
      if (!run) return new Response('Run not found', { status: 404 })
      const action = url.pathname.slice(1)
      if (
        request.method === 'POST' &&
        (action === 'pause' || action === 'resume' || action === 'cancel')
      ) {
        this.getRunner(run.config).command(action)
        this.latestProgress = null
        if (action === 'resume') await this.ctx.storage.setAlarm(Date.now() + 1000)
        else if (!run.pending) await this.ctx.storage.deleteAlarm()
        await this.publish()
        return Response.json(this.store.read())
      }
      return new Response('Not found', { status: 404 })
    } catch (error) {
      if (error instanceof RunConflict)
        return Response.json({ error: error.message }, { status: 409 })
      throw error
    }
  }

  async alarm() {
    const run = this.store.read()
    if (!run) return
    await this.getRunner(run.config).tick()
    this.latestProgress = null
    const current = this.store.read()!
    if (current.status === 'running') await this.ctx.storage.setAlarm(Date.now() + 1000)
    // If indexing fails, Cloudflare retries the alarm. Persisted turns are not repeated.
    await this.publish()
  }

  private async publish() {
    const run = this.store.read()!
    this.broadcast({ type: 'snapshot', run })
    const response = await this.env.ARENA_REGISTRY.getByName('global').fetch(
      'https://registry/runs',
      {
        method: 'POST',
        body: JSON.stringify(summarize(run)),
      },
    )
    if (!response.ok) throw new Error('Run index update failed')
  }

  private broadcast(event: LiveEvent) {
    const payload = JSON.stringify(event)
    for (const socket of this.ctx.getWebSockets()) {
      try {
        socket.send(payload)
      } catch {
        socket.close(1011, 'Reconnect for live updates')
      }
    }
  }
  webSocketMessage(socket: { send: (message: string) => void }, message: string | ArrayBuffer) {
    if (message === 'ping') socket.send('{"type":"pong"}')
  }
  webSocketClose(socket: { close: (code: number, reason: string) => void }, code: number) {
    socket.close(code, 'Connection closed')
  }
}
