import { games, players, moves as movesTable } from '../db/schema'
import { eq } from 'drizzle-orm'
import { GameService } from './game.service'
import { Player } from './player.interface'
import { alias } from 'drizzle-orm/sqlite-core'
import { logger } from './logger'
import { SocketService } from './socket.service'
import { AlarmService } from './alarm.service'

export class GameLoopService {
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
    })
    .from(games)
    .where(eq(games.id, gameId))
    .leftJoin(whitePlayer, eq(games.whitePlayerId, whitePlayer.id))
    .leftJoin(blackPlayer, eq(games.blackPlayerId, blackPlayer.id))

    if (gameResults.length === 0) return;
    const game = gameResults[0];

    if (game.status !== 'ongoing') {
      this.alarmService.cancelAlarm(`game:${game.id}`);
      return;
    }

    const turn = game.fen.split(' ')[1]
    const currentPlayerType = turn === 'w' ? game.whitePlayerType : game.blackPlayerType
    const currentPlayerId = turn === 'w' ? game.whitePlayerId : game.blackPlayerId

    const STOCKFISH_IDS = [
      '00000000-0000-0000-0000-000000000010',
      '00000000-0000-0000-0000-000000000011',
      '00000000-0000-0000-0000-000000000012'
    ];

    // If it's a human player, we just wait (no auto-move)
    if (currentPlayerType === 'human') {
      return;
    }

    // If it's a client-side Stockfish player, we emit REQUEST_MOVE and wait
    if (currentPlayerId && STOCKFISH_IDS.includes(currentPlayerId)) {
      if (this.socketService) {
        logger.info(`[GameLoop] Requesting move from client for Stockfish player ${currentPlayerId} in game ${game.id}`)
        this.socketService.broadcast(game.id, { 
          type: 'REQUEST_MOVE', 
          gameId: game.id, 
          fen: game.fen,
          constraints: { depth: 18 } // Standard depth
        })
      }
      // Re-poll in 5 seconds to ensure we don't get stuck if client disconnects/misses it
      this.alarmService.setAlarm(`game:${game.id}`, 5000, () => this.advanceGame(game.id));
      return;
    }

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
        
        // Schedule next move check
        this.alarmService.setAlarm(`game:${game.id}`, 2000, () => this.advanceGame(game.id));
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