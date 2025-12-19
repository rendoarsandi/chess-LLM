import { games, players, moves as movesTable } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { GameService } from './game.service'
import { Player } from './player.interface'
import { alias } from 'drizzle-orm/sqlite-core'

export class GameLoopService {
  constructor(
    private db: any,
    private gameService: GameService,
    private player: Player
  ) {}

  async runIteration() {
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

      if (currentPlayerType === 'llm') {
        // Fetch move history
        const gameMoves = await this.db.select()
          .from(movesTable)
          .where(eq(movesTable.gameId, game.id))
          .orderBy(movesTable.moveNumber)
        
        const history = gameMoves.map((m: any) => m.move)

        const move = await this.player.makeMove(game.fen, history)
        if (move) {
          try {
            await this.gameService.makeMove(game.id, move)
            console.log(`[GameLoop] Made move ${move} in game ${game.id}`)
          } catch (e) {
            console.error(`[GameLoop] Error applying move in game ${game.id}:`, e)
          }
        } else {
          console.warn(`[GameLoop] Player failed to provide a move for game ${game.id}`)
        }
      }
    }
  }

  start(intervalMs: number = 5000) {
    console.log(`[GameLoop] Starting background loop with interval ${intervalMs}ms`)
    setInterval(async () => {
      try {
        await this.runIteration()
      } catch (e) {
        console.error('[GameLoop] Error in iteration:', e)
      }
    }, intervalMs)
  }
}
