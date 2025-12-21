import { games, players, moves as movesTable, llmConfigurations } from '../db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { GameService } from './game.service'
import { Player } from './player.interface'
import { alias } from 'drizzle-orm/sqlite-core'
import { logger } from './logger'

export class GameLoopService {
  constructor(
    private db: any,
    private gameService: GameService,
    private player: Player
  ) {}

  async runIteration() {
    // 1. Advance ongoing games
    await this.advanceGames()
  }

  private async advanceGames() {
    const whitePlayer = alias(players, 'whitePlayer')
    const blackPlayer = alias(players, 'blackPlayer')

    const ongoingGames = await this.db.select({
      id: games.id,
      fen: games.fen,
      status: games.status,
      whitePlayerId: games.whitePlayerId,
      blackPlayerId: games.blackPlayerId,
      whitePlayerType: whitePlayer.type,
      blackPlayerType: blackPlayer.type,
    })
    .from(games)
    .where(eq(games.status, 'ongoing'))
    .leftJoin(whitePlayer, eq(games.whitePlayerId, whitePlayer.id))
    .leftJoin(blackPlayer, eq(games.blackPlayerId, blackPlayer.id))

    for (const game of ongoingGames) {
      const turn = game.fen.split(' ')[1]
      const currentPlayerType = turn === 'w' ? game.whitePlayerType : game.blackPlayerType
      const currentPlayerId = turn === 'w' ? game.whitePlayerId : game.blackPlayerId

      // Allow any player that is NOT human to make a move automatically
      if (currentPlayerType !== 'human') {
        // Fetch move history
        const gameMoves = await this.db.select()
          .from(movesTable)
          .where(eq(movesTable.gameId, game.id))
          .orderBy(movesTable.moveNumber)
        
        const history = gameMoves.map((m: any) => m.move)

        // Resolve player: registry first, then fallback to default
        const player = this.gameService.getPlayer(currentPlayerId) || this.player
        
        const startTime = Date.now()
        let move = null
        try {
            move = await player.makeMove(game.fen, history)
        } catch (e) {
            logger.error(`[GameLoop] Error calling makeMove for ${currentPlayerId}:`, e)
        }
        const thinkingMs = Date.now() - startTime

        if (move) {
          try {
            // Check if player provides thinking data (e.g. GeminiPlayer)
            const thinking = (player as any).getLastThinking ? (player as any).getLastThinking() : {}
            const result = await this.gameService.makeMove(game.id, move, { ...thinking, thinkingMs })
            logger.info(`[GameLoop] Made move ${result.san} in game ${game.id} (${thinkingMs}ms)`)
          } catch (e) {
            logger.error(`[GameLoop] Error applying move "${move}" in game ${game.id}:`, e)
          }
        } else {
          logger.warn(`[GameLoop] Player failed to provide a move for game ${game.id}`)
        }
      }
    }
  }

  private isRunning: boolean = false;

  start(intervalMs: number = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[GameLoop] Starting background loop with interval ${intervalMs}ms`)
    
    const loop = async () => {
      if (!this.isRunning) return;
      try {
        await this.runIteration()
      } catch (e) {
        logger.error('[GameLoop] Error in iteration:', e)
      } finally {
        setTimeout(loop, intervalMs)
      }
    }
    
    loop()
  }

  stop() {
    this.isRunning = false;
  }
}
