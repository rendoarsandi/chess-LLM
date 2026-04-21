/// <reference types="@cloudflare/workers-types" />

import { createD1Database } from '../db/d1'
import { GameManager } from '../game/game-manager'
import { GameService } from '../game/game.service'
import { MatchmakingService } from '../game/matchmaking.service'
import { CloudflareEnv, cloudflareMatchmakingConfig } from './env'

export class ArenaScheduler {
  constructor(
    private state: DurableObjectState,
    private env: CloudflareEnv,
  ) {}

  async fetch(request: Request) {
    const url = new URL(request.url)

    if (url.pathname.endsWith('/status')) {
      const service = this.createMatchmakingService()
      return Response.json(await service.getStatus())
    }

    if (url.pathname.endsWith('/run')) {
      return Response.json(await this.runOnce(), { status: 201 })
    }

    if (url.pathname.endsWith('/start')) {
      await this.scheduleNext()
      return Response.json({ scheduled: true })
    }

    return new Response('Not found', { status: 404 })
  }

  async alarm() {
    await this.runOnce()
    await this.scheduleNext()
  }

  private async runOnce() {
    const service = this.createMatchmakingService()
    return service.createNextMatch()
  }

  private async scheduleNext() {
    const service = this.createMatchmakingService()
    await this.state.storage.setAlarm(Date.now() + service.getIntervalMs())
  }

  private createMatchmakingService() {
    const db = createD1Database(this.env.DB)
    const gameService = new GameService(db, new GameManager())
    return new MatchmakingService(db, gameService, cloudflareMatchmakingConfig(this.env))
  }
}
