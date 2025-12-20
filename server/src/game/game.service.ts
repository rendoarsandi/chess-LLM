import { GameManager } from './game-manager'
import { games, moves, players, ratingHistory } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { calculateEloChange } from './elo'
import { Chess } from 'chess.js'

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

  async pauseGame(gameId: string) {
    await this.db.update(games)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(eq(games.id, gameId))
  }

  async resumeGame(gameId: string) {
    await this.db.update(games)
      .set({ status: 'ongoing', updatedAt: new Date() })
      .where(eq(games.id, gameId))
  }

  async deleteGame(gameId: string) {
    // Delete associated moves first
    await this.db.delete(moves).where(eq(moves.gameId, gameId))
    // Delete associated rating history
    await this.db.delete(ratingHistory).where(eq(ratingHistory.gameId, gameId))
    // Delete the game
    await this.db.delete(games).where(eq(games.id, gameId))
  }

  async clearHistory() {
    await this.db.delete(moves)
    await this.db.delete(ratingHistory)
    await this.db.delete(games)
  }

  getPlayer(playerId: string) {
    return this.gm.getPlayer(playerId)
  }

  async getPlayerStats(playerId: string) {
    // 1. Get favorite openings
    // We look for moves made by this player (or in games they participated in as White) 
    // where an opening was detected.
    const playerOpenings = await this.db
      .select({ 
        opening: moves.opening,
        thinkingMs: moves.thinkingMs,
      })
      .from(moves)
      .innerJoin(games, eq(moves.gameId, games.id))
      .where(sql`${moves.opening} IS NOT NULL AND ${games.whitePlayerId} = ${playerId}`)

    const openingCounts: Record<string, number> = {}
    let totalThinkingMs = 0
    let thinkingCount = 0

    playerOpenings.forEach((m: any) => {
      openingCounts[m.opening] = (openingCounts[m.opening] || 0) + 1
      if (m.thinkingMs) {
        totalThinkingMs += m.thinkingMs
        thinkingCount++
      }
    })

    const favoriteOpenings = Object.entries(openingCounts)
      .map(([opening, count]) => ({ opening, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const avgThinkingMs = thinkingCount > 0 ? Math.round(totalThinkingMs / thinkingCount) : null

    return {
      favoriteOpenings,
      avgThinkingMs,
    }
  }

  async makeMove(gameId: string, move: string, thinking?: { opening?: string, candidates?: string, reasoning?: string, thinkingMs?: number }) {
    const game = await this.getGame(gameId)
    if (!game) throw new Error('Game not found')
    if (game.status !== 'ongoing') throw new Error('Game is already finished')

    const chess = new Chess(game.fen)
    const moveResult = chess.move(move)
    if (!moveResult) {
      throw new Error('Invalid move')
    }

    const nextFen = chess.fen()
    const isGameOver = chess.isGameOver()
    const winner = this.gm.getWinner(nextFen)

    console.log(`[GameService] Move applied: ${move}. isGameOver: ${isGameOver}, winner: ${winner}`)

    const fenParts = game.fen.split(' ')
    const playerColor = fenParts[1] === 'w' ? 'white' : 'black'
    const moveNumber = parseInt(fenParts[5], 10)

    // Use a transaction if possible, but for simplicity now just sequential
    await this.db.insert(moves).values({
      gameId,
      moveNumber,
      playerColor,
      move: moveResult.san, // Use SAN instead of the raw move string
      fen: nextFen,
      opening: thinking?.opening,
      candidates: thinking?.candidates,
      reasoning: thinking?.reasoning,
      thinkingMs: thinking?.thinkingMs,
    })

    let status = 'ongoing'
    let winnerId = null
    let gameOverReason = null

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

      if (chess.isCheckmate()) gameOverReason = 'checkmate'
      else if (chess.isStalemate()) gameOverReason = 'stalemate'
      else if (chess.isThreefoldRepetition()) gameOverReason = 'threefold repetition'
      else if (chess.isInsufficientMaterial()) gameOverReason = 'insufficient material'
      else if (chess.isDraw()) gameOverReason = 'draw'
    }

    // Update PGN
    let pgn = "";
    try {
      const allMoves = await this.db.select().from(moves).where(eq(moves.gameId, gameId)).orderBy(moves.moveNumber)
      const pgnChess = new Chess()
      for (const m of allMoves) {
        try {
          pgnChess.move(m.move)
        } catch (inner_e) {
          console.warn(`[GameService] Skipping invalid move in PGN history for game ${gameId}: ${m.move}`);
        }
      }
      pgnChess.move(moveResult.san)
      pgn = pgnChess.pgn()
    } catch (e) {
      console.error(`[GameService] Error generating PGN for game ${gameId}:`, e);
    }

    await this.db.update(games)
      .set({ 
        fen: nextFen, 
        status: status as any, 
        winnerId,
        gameOverReason,
        pgn,
        updatedAt: new Date()
      })
      .where(eq(games.id, gameId))

    if (isGameOver) {
      await this.updatePlayerRatings(game.whitePlayerId, game.blackPlayerId, status as any, winnerId, gameId)
    }

    return { fen: nextFen, status, winnerId, gameOverReason }
  }

  private async updatePlayerRatings(whiteId: string, blackId: string, status: 'completed' | 'draw', winnerId: string | null, gameId: string) {
    const whitePlayer = (await this.db.select().from(players).where(eq(players.id, whiteId)))[0]
    const blackPlayer = (await this.db.select().from(players).where(eq(players.id, blackId)))[0]

    if (!whitePlayer || !blackPlayer) return

    let whiteScore = 0.5
    let blackScore = 0.5

    if (status === 'completed') {
      whiteScore = winnerId === whiteId ? 1 : 0
      blackScore = winnerId === blackId ? 1 : 0
    }

    const whiteChange = calculateEloChange(whitePlayer.rating, blackPlayer.rating, whiteScore)
    const blackChange = calculateEloChange(blackPlayer.rating, whitePlayer.rating, blackScore)

    const newWhiteRating = whitePlayer.rating + whiteChange
    const newBlackRating = blackPlayer.rating + blackChange

    await this.db.update(players)
      .set({
        rating: newWhiteRating,
        peakRating: Math.max(whitePlayer.peakRating, newWhiteRating),
        wins: whitePlayer.wins + (whiteScore === 1 ? 1 : 0),
        losses: whitePlayer.losses + (whiteScore === 0 ? 1 : 0),
        draws: whitePlayer.draws + (whiteScore === 0.5 ? 1 : 0),
      })
      .where(eq(players.id, whiteId))

    await this.db.update(players)
      .set({
        rating: newBlackRating,
        peakRating: Math.max(blackPlayer.peakRating, newBlackRating),
        wins: blackPlayer.wins + (blackScore === 1 ? 1 : 0),
        losses: blackPlayer.losses + (blackScore === 0 ? 1 : 0),
        draws: blackPlayer.draws + (blackScore === 0.5 ? 1 : 0),
      })
      .where(eq(players.id, blackId))

    // Record history
    await this.db.insert(ratingHistory).values([
      { playerId: whiteId, rating: newWhiteRating, gameId },
      { playerId: blackId, rating: newBlackRating, gameId }
    ])
  }
}
