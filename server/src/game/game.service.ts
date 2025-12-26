import { GameManager } from './game-manager'
import { gameReviews, games, moveAnalyses, moves, players, ratingHistory } from '../db/schema'
import { eq, sql } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import { calculateEloChange } from './elo'
import { Chess } from 'chess.js'
import { logger } from './logger'
import { TournamentService } from './tournament.service'
import { SocketService } from './socket.service'
import { AppDatabase } from '../db/types'

export class GameService {
  constructor(
    private db: AppDatabase, 
    private gm: GameManager, 
    private ts?: TournamentService,
    private socketService?: SocketService
  ) {}

  async createGame(whitePlayerId: string, blackPlayerId: string, metadata?: { tournamentId?: string, roundNumber?: number, variant?: string, startPosId?: number }) {
    // Check for existing ongoing games (unless it's a tournament game)
    if (!metadata?.tournamentId) {
      const ongoingGames = await this.db.select().from(games).where(eq(games.status, 'ongoing'))
      if (ongoingGames.length > 0) {
        throw new Error('A game is already in progress. Please complete or delete it first.')
      }
    }

    const id = randomUUID()
    const variant = (metadata?.variant === 'chess960' ? 'chess960' : 'standard') as "standard" | "chess960"
    
    let startPosId = metadata?.startPosId
    if (variant === 'chess960' && startPosId === undefined) {
      startPosId = Math.floor(Math.random() * 960)
    }

    const initialState = this.gm.createNewGame(whitePlayerId, blackPlayerId, { 
      variant: variant, 
      startPosId: startPosId 
    })
    
    await this.db.insert(games).values({
      id,
      whitePlayerId,
      blackPlayerId,
      fen: initialState.fen,
      variant: variant,
      startPosId: startPosId,
      status: 'ongoing',
      tournamentId: metadata?.tournamentId,
      roundNumber: metadata?.roundNumber,
    })

    if (this.socketService) {
      this.socketService.broadcast(id, { type: 'GAME_STARTED', gameId: id })
    }
    
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
    // Delete associated reviews and analyses first
    const reviews = await this.db.select().from(gameReviews).where(eq(gameReviews.gameId, gameId))
    for (const r of reviews) {
      await this.db.delete(moveAnalyses).where(eq(moveAnalyses.reviewId, r.id))
    }
    await this.db.delete(gameReviews).where(eq(gameReviews.gameId, gameId))

    // Delete associated moves first
    await this.db.delete(moves).where(eq(moves.gameId, gameId))
    // Delete associated rating history
    await this.db.delete(ratingHistory).where(eq(ratingHistory.gameId, gameId))
    // Delete the game
    await this.db.delete(games).where(eq(games.id, gameId))
  }

  async clearHistory() {
    await this.db.delete(moveAnalyses)
    await this.db.delete(gameReviews)
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

    playerOpenings.forEach((m: { opening: string | null, thinkingMs: number | null }) => {
      if (m.opening) {
        openingCounts[m.opening] = (openingCounts[m.opening] || 0) + 1
      }
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
    
    if (game.status === 'paused') {
      throw new Error('Game is currently paused')
    }
    if (game.status !== 'ongoing') {
      throw new Error(`Game is already finished (status: ${game.status})`)
    }

    const chess = new Chess(game.fen)
    const moveResult = chess.move(move)
    if (!moveResult) {
      throw new Error('Invalid move')
    }

    const nextFen = chess.fen()
    const isGameOver = chess.isGameOver()
    const winner = this.gm.getWinner(nextFen)

    logger.info(`[GameService] Move applied: ${moveResult.san}. isGameOver: ${isGameOver}, winner: ${winner}`)

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

    let status: 'ongoing' | 'completed' | 'draw' = 'ongoing'
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
    let pgn = game.pgn || "";
    try {
      const pgnChess = new Chess();
      if (pgn) {
        pgnChess.loadPgn(pgn);
      } else {
        // Fallback to rebuilding if PGN is empty (should only happen for first move or legacy data)
        const allMoves = await this.db.select().from(moves).where(eq(moves.gameId, gameId)).orderBy(moves.moveNumber)
        for (const m of allMoves) {
          try { pgnChess.move(m.move); } catch { /* ignore */ }
        }
      }
      pgnChess.move(moveResult.san)
      pgn = pgnChess.pgn()
    } catch (e) {
      logger.debug(`[GameService] Error updating PGN for game ${gameId}:`, e);
      // Fallback: don't break the move if PGN fails
    }

    await this.db.update(games)
      .set({ 
        fen: nextFen, 
        status: status, 
        winnerId,
        gameOverReason,
        pgn,
        updatedAt: new Date()
      })
      .where(eq(games.id, gameId))

    if (isGameOver) {
      await this.updatePlayerRatings(game.whitePlayerId, game.blackPlayerId, status as 'completed' | 'draw', winnerId, gameId)
    }

    const result = { fen: nextFen, status, winnerId, gameOverReason, san: moveResult.san, pgn }

    if (this.socketService) {
      this.socketService.broadcast(gameId, { type: 'UPDATE', ...result })
    }

    return result
  }

  async finishGame(gameId: string, winnerId: string | null, reason: string) {
    const game = await this.getGame(gameId)
    if (!game || game.status !== 'ongoing') return

    const status = winnerId ? 'completed' : 'draw'
    
    await this.db.update(games)
      .set({ 
        status, 
        winnerId,
        gameOverReason: reason,
        updatedAt: new Date()
      })
      .where(eq(games.id, gameId))

    await this.updatePlayerRatings(game.whitePlayerId, game.blackPlayerId, status as 'completed' | 'draw', winnerId, gameId)

    if (this.socketService) {
      this.socketService.broadcast(gameId, { 
        type: 'UPDATE', 
        fen: game.fen,
        status,
        winnerId,
        gameOverReason: reason,
        san: '',
        pgn: game.pgn || ''
      })
    }
  }

  private async updatePlayerRatings(whiteId: string, blackId: string, status: 'completed' | 'draw', winnerId: string | null, gameId: string) {
    const whitePlayer = (await this.db.select().from(players).where(eq(players.id, whiteId)))[0]
    const blackPlayer = (await this.db.select().from(players).where(eq(players.id, blackId)))[0]
    const game = (await this.db.select().from(games).where(eq(games.id, gameId)))[0]

    if (!whitePlayer || !blackPlayer || !game) return

    const is960 = game.variant === 'chess960'
      // Calculate new ratings
      const whiteRating = await this.getRating(game.whitePlayerId, game.variant);
      const blackRating = await this.getRating(game.blackPlayerId, game.variant);

      let whiteScore = 0.5
    let blackScore = 0.5

    if (status === 'completed') {
      whiteScore = winnerId === whiteId ? 1 : 0
      blackScore = winnerId === blackId ? 1 : 0
    }

    const whiteChange = calculateEloChange(whiteRating, blackRating, whiteScore)
    const blackChange = calculateEloChange(blackRating, whiteRating, blackScore)

    const newWhiteRating = whiteRating + whiteChange
    const newBlackRating = blackRating + blackChange

    if (is960) {
      await this.db.update(players)
        .set({
          rating960: newWhiteRating,
          peakRating960: Math.max(whitePlayer.peakRating960, newWhiteRating),
          wins: whitePlayer.wins + (whiteScore === 1 ? 1 : 0),
          losses: whitePlayer.losses + (whiteScore === 0 ? 1 : 0),
          draws: whitePlayer.draws + (whiteScore === 0.5 ? 1 : 0),
        })
        .where(eq(players.id, whiteId))

      await this.db.update(players)
        .set({
          rating960: newBlackRating,
          peakRating960: Math.max(blackPlayer.peakRating960, newBlackRating),
          wins: blackPlayer.wins + (blackScore === 1 ? 1 : 0),
          losses: blackPlayer.losses + (blackScore === 0 ? 1 : 0),
          draws: blackPlayer.draws + (blackScore === 0.5 ? 1 : 0),
        })
        .where(eq(players.id, blackId))
    } else {
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
    }

    // Record history
    await this.db.insert(ratingHistory).values([
      { playerId: whiteId, rating: newWhiteRating, gameId },
      { playerId: blackId, rating: newBlackRating, gameId }
    ])

    // Update tournament scores if applicable
    if (this.ts && gameId) {
      if (status === 'draw') {
        await this.ts.updateParticipantScore(game.tournamentId!, whiteId, 5)
        await this.ts.updateParticipantScore(game.tournamentId!, blackId, 5)
      } else if (status === 'completed' && winnerId) {
        const loserId = winnerId === whiteId ? blackId : whiteId
        await this.ts.updateParticipantScore(game.tournamentId!, winnerId, 10)
        await this.ts.updateParticipantScore(game.tournamentId!, loserId, 0)
      }
    }
  }

  private async getRating(playerId: string, variant: string): Promise<number> {
    const player = (await this.db.select().from(players).where(eq(players.id, playerId)))[0]
    if (!player) return 1200
    return variant === 'chess960' ? player.rating960 : player.rating
  }
}
