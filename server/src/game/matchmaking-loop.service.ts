import { logger } from './logger'
import { MatchmakingService } from './matchmaking.service'

export class MatchmakingLoopService {
  private isRunning = false

  constructor(private matchmakingService: MatchmakingService) {}

  async runIteration() {
    const result = await this.matchmakingService.createNextMatch()
    if (result.created) {
      logger.info(`[MatchmakingLoop] Created arena game ${result.gameId}`)
    }
  }

  start(intervalMs: number = this.matchmakingService.getIntervalMs()) {
    if (this.isRunning) return
    this.isRunning = true
    logger.info(`[MatchmakingLoop] Starting arena matchmaking with interval ${intervalMs}ms`)

    const loop = async () => {
      if (!this.isRunning) return
      try {
        await this.runIteration()
      } catch (e) {
        logger.error('[MatchmakingLoop] Error in iteration:', e)
      } finally {
        setTimeout(loop, intervalMs)
      }
    }

    loop()
  }

  stop() {
    this.isRunning = false
  }
}
