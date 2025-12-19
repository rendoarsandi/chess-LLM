import { games, players } from '../db/schema'
import { eq, and, or } from 'drizzle-orm'
import { GameService } from './game.service'
import { RandomPlayer } from './random-player'
import { alias } from 'drizzle-orm/sqlite-core'

export class GameLoopService {
  constructor(
    private db: any,
    private gameService: GameService,
    private randomPlayer: RandomPlayer
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
        const move = this.randomPlayer.makeMove(game.fen)
        if (move) {
          try {
            await this.gameService.makeMove(game.id, move)
            console.log(`[GameLoop] Made move ${move} in game ${game.id}`)
          } catch (e) {
            console.error(`[GameLoop] Error making move in game ${game.id}:`, e)
          }
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
