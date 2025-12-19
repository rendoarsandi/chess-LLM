import { GameManager } from './game-manager'
import { games, moves } from '../db/schema'
import { eq, desc } from 'drizzle-orm'
import { randomUUID } from 'crypto'

export class GameService {
  constructor(private db: any, private gm: GameManager) {}

  async createGame(whitePlayerId: string, blackPlayerId: string) {
    const id = randomUUID()
    const initialState = this.gm.createNewGame(whitePlayerId, blackPlayerId)
    
    await this.db.insert(games).values({
      id,
      whitePlayerId,
      blackPlayerId,
      fen: initialState.fen,
      status: 'ongoing',
    })
    
    return id
  }

  async getGame(gameId: string) {
    const result = await this.db.select().from(games).where(eq(games.id, gameId))
    return result[0]
  }

  async deleteGame(gameId: string) {
    // Delete associated moves first
    await this.db.delete(moves).where(eq(moves.gameId, gameId))
    // Delete the game
    await this.db.delete(games).where(eq(games.id, gameId))
  }

  async clearHistory() {
    await this.db.delete(moves)
    await this.db.delete(games)
  }

  getPlayer(playerId: string) {
    return this.gm.getPlayer(playerId)
  }

  async makeMove(gameId: string, move: string, thinking?: { opening?: string, candidates?: string, reasoning?: string }) {
    const game = await this.getGame(gameId)
    if (!game) throw new Error('Game not found')
    if (game.status !== 'ongoing') throw new Error('Game is already finished')

    if (!this.gm.isValidMove(game.fen, move)) {
      throw new Error('Invalid move')
    }

    const nextFen = this.gm.getNextState(game.fen, move)
    const isGameOver = this.gm.isGameOver(nextFen)
    const winner = this.gm.getWinner(nextFen)

    // Get current move count
    const lastMoves = await this.db.select()
      .from(moves)
      .where(eq(moves.gameId, gameId))
      .orderBy(desc(moves.moveNumber))
      .limit(1)
    
    const moveNumber = lastMoves.length > 0 ? lastMoves[0].moveNumber + 1 : 1
    const playerColor = game.fen.split(' ')[1] === 'w' ? 'white' : 'black'

    // Use a transaction if possible, but for simplicity now just sequential
    await this.db.insert(moves).values({
      gameId,
      moveNumber,
      playerColor,
      move,
      fen: nextFen,
      opening: thinking?.opening,
      candidates: thinking?.candidates,
      reasoning: thinking?.reasoning,
    })

    let status = 'ongoing'
    let winnerId = null

    if (isGameOver) {
      if (winner === 'white') {
        status = 'completed'
        winnerId = game.whitePlayerId
      } else if (winner === 'black') {
        status = 'completed'
        winnerId = game.blackPlayerId
      } else {
        status = 'draw'
      }
    }

    await this.db.update(games)
      .set({ 
        fen: nextFen, 
        status: status as any, 
        winnerId,
        updatedAt: new Date()
      })
      .where(eq(games.id, gameId))

    return { fen: nextFen, status, winnerId }
  }
}
