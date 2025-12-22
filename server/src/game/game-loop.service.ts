import { games, players, moves as movesTable } from '../db/schema'
import { eq } from 'drizzle-orm'
import { GameService } from './game.service'
import { Player } from './player.interface'
import { alias } from 'drizzle-orm/sqlite-core'
import { logger } from './logger'
import { SocketService } from './socket.service'
import { AlarmService } from './alarm.service'

export class GameLoopService {
  private lastRequestTime: Map<string, number> = new Map()

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private db: any,
    private gameService: GameService,
    private player: Player,
    private socketService?: SocketService,
    private alarmService: AlarmService = new AlarmService()
  ) {}

  async advanceGame(gameId: string) {
    const whitePlayer = alias(players, 'whitePlayer')
    const blackPlayer = alias(players, 'blackPlayer')

    const gameResults = await this.db.select({
      id: games.id,
      fen: games.fen,
      status: games.status,
      whitePlayerId: games.whitePlayerId,
      blackPlayerId: games.blackPlayerId,
      whitePlayerType: whitePlayer.type,
      blackPlayerType: blackPlayer.type,
      updatedAt: games.updatedAt,
    })
    .from(games)
    .where(eq(games.id, gameId))
    .leftJoin(whitePlayer, eq(games.whitePlayerId, whitePlayer.id))
    .leftJoin(blackPlayer, eq(games.blackPlayerId, blackPlayer.id))

    if (gameResults.length === 0) return;
    const game = gameResults[0];

    if (game.status !== 'ongoing') {
      this.alarmService.cancelAlarm(`game:${game.id}`);
      this.lastRequestTime.delete(game.id);
      return;
    }

    const turn = game.fen.split(' ')[1]
    const currentPlayerType = turn === 'w' ? game.whitePlayerType : game.blackPlayerType
    const currentPlayerId = turn === 'w' ? game.whitePlayerId : game.blackPlayerId

    const STOCKFISH_LOW_ID = '00000000-0000-0000-0000-000000000010'
    const STOCKFISH_MED_ID = '00000000-0000-0000-0000-000000000011'
    const STOCKFISH_HIGH_ID = '00000000-0000-0000-0000-000000000012'
    const STOCKFISH_VERY_HIGH_ID = '00000000-0000-0000-0000-000000000013'

    const STOCKFISH_IDS = [
      STOCKFISH_LOW_ID,
      STOCKFISH_MED_ID,
      STOCKFISH_HIGH_ID,
      STOCKFISH_VERY_HIGH_ID
    ];

    // If it's a human player, we just wait (no auto-move)
    if (currentPlayerType === 'human') {
      return;
    }

    // If it's a client-side Stockfish player, we emit REQUEST_MOVE and wait
    if (currentPlayerId && STOCKFISH_IDS.includes(currentPlayerId)) {
      const now = Date.now()
      const lastRequest = this.lastRequestTime.get(game.id) || 0
      
      // Check for timeout (60 seconds)
      const timeSinceLastUpdate = now - game.updatedAt.getTime()
      if (timeSinceLastUpdate > 60000) {
        logger.warn(`[GameLoop] Timeout detected for player ${currentPlayerId} in game ${game.id}`)
        const winnerId = turn === 'w' ? game.blackPlayerId : game.whitePlayerId
        await this.gameService.finishGame(game.id, winnerId, 'timeout')
        this.lastRequestTime.delete(game.id)
        this.alarmService.cancelAlarm(`game:${game.id}`)
        return
      }

      // Determine constraints based on Stockfish level
      let constraints = { depth: 18, skillLevel: 20, movetime: 1000 }
      if (currentPlayerId === STOCKFISH_LOW_ID) {
        constraints = { depth: 6, skillLevel: 12, movetime: 500 }
      } else if (currentPlayerId === STOCKFISH_MED_ID) {
        constraints = { depth: 8, skillLevel: 15, movetime: 1000 }
      } else if (currentPlayerId === STOCKFISH_HIGH_ID) {
        constraints = { depth: 10, skillLevel: 18, movetime: 1500 }
      } else if (currentPlayerId === STOCKFISH_VERY_HIGH_ID) {
        constraints = { depth: 22, skillLevel: 20, movetime: 3000 }
      }

      // Throttle requests: only re-send every 2 seconds if we haven't received a move
      if (now - lastRequest > 2000) {
        if (this.socketService) {
          logger.info(`[GameLoop] Requesting move from client for Stockfish player ${currentPlayerId} (Skill: ${constraints.skillLevel}, Depth: ${constraints.depth}) in game ${game.id}`)
          this.socketService.broadcast(game.id, { 
            type: 'REQUEST_MOVE', 
            gameId: game.id, 
            fen: game.fen,
            constraints
          })
          this.lastRequestTime.set(game.id, now)
        }
      }
      
      // Re-poll in 1 second to check if we need to re-request or if game state changed
      this.alarmService.setAlarm(`game:${game.id}`, 1000, () => this.advanceGame(game.id));
      return;
    }

    // Clear last request time if we are not in a Stockfish turn anymore
    this.lastRequestTime.delete(game.id)

    // Broadcast thinking status for server-side players
    if (this.socketService) {
      this.socketService.broadcast(game.id, { type: 'STATUS', status: 'thinking' })
    }

    // Fetch move history
    const gameMoves = await this.db.select()
      .from(movesTable)
      .where(eq(movesTable.gameId, game.id))
      .orderBy(movesTable.moveNumber)
    
    const history = gameMoves.map((m: { move: string }) => m.move)

    // Resolve player: registry first, then fallback to default
    const player = this.gameService.getPlayer(currentPlayerId!) || this.player
    
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
        const thinking = player.getLastThinking ? player.getLastThinking() : {}
        const result = await this.gameService.makeMove(game.id, move, { ...thinking, thinkingMs })
        logger.info(`[GameLoop] Made move ${result.san} in game ${game.id} (${thinkingMs}ms)`)
        
        // Schedule next move check - reduced to 100ms for faster gameplay
        this.alarmService.setAlarm(`game:${game.id}`, 100, () => this.advanceGame(game.id));
      } catch (e) {
        logger.error(`[GameLoop] Error applying move "${move}" in game ${game.id}:`, e)
        // Retry later
        this.alarmService.setAlarm(`game:${game.id}`, 5000, () => this.advanceGame(game.id));
      }
    } else {
      logger.warn(`[GameLoop] Player failed to provide a move for game ${game.id}`)
      // Retry later
      this.alarmService.setAlarm(`game:${game.id}`, 5000, () => this.advanceGame(game.id));
    }
  }

  async runIteration() {
    const ongoingGames = await this.db.select({ id: games.id })
      .from(games)
      .where(eq(games.status, 'ongoing'))

    for (const game of ongoingGames) {
      if (!this.alarmService.hasAlarm(`game:${game.id}`)) {
        await this.advanceGame(game.id);
      }
    }
  }

  private isRunning: boolean = false;

  start(intervalMs: number = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`[GameLoop] Starting background monitor with interval ${intervalMs}ms`)
    
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
