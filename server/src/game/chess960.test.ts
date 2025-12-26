import { describe, it, expect, beforeEach } from 'vitest'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { players } from '../db/schema'
import { eq } from 'drizzle-orm'
import { AppDatabase } from '../db/types'
import { db } from '../db'

describe('Chess 960 Integration', () => {
  let gameService: GameService
  const testWhiteId = 'test-white'
  const testBlackId = 'test-black'

  beforeEach(async () => {
    gameService = new GameService(db as unknown as AppDatabase, new GameManager())
    
    // Clean up in correct order: child tables first
    const { moves, ratingHistory, games, players, moveAnalyses, gameReviews, llmConfigurations, tournamentParticipants } = await import('../db/schema');
    
    await db.delete(moveAnalyses);
    await db.delete(gameReviews);
    await db.delete(moves);
    await db.delete(ratingHistory);
    await db.delete(llmConfigurations);
    await db.delete(tournamentParticipants);
    await db.delete(games);
    await db.delete(players);

    // Setup players
    await db.insert(players).values([
      { id: testWhiteId, name: 'White', type: 'human', rating: 1200, rating960: 1200 },
      { id: testBlackId, name: 'Black', type: 'human', rating: 1200, rating960: 1200 }
    ])
  })

  it('should create a Chess 960 game with correct initial FEN', async () => {
    // SP-ID 518 is standard
    const gameId = await gameService.createGame(testWhiteId, testBlackId, { variant: 'chess960', startPosId: 518 })
    const game = await gameService.getGame(gameId)
    
    expect(game?.variant).toBe('chess960')
    expect(game?.startPosId).toBe(518)
    expect(game?.fen.startsWith('rnbqkbnr/')).toBe(true)
  })

  it('should create a non-standard 960 game', async () => {
    // SP-ID 0 is bbqnnrkr
    const gameId = await gameService.createGame(testWhiteId, testBlackId, { variant: 'chess960', startPosId: 0 })
    const game = await gameService.getGame(gameId)
    
    expect(game?.fen.startsWith('bbqnnrkr/')).toBe(true)
  })

  it('should update 960 ratings specifically', async () => {
    const gameId = await gameService.createGame(testWhiteId, testBlackId, { variant: 'chess960', startPosId: 518 })
    
    // Simulate white winning
    await gameService.finishGame(gameId, testWhiteId, 'checkmate')

    const white = (await db.select().from(players).where(eq(players.id, testWhiteId)))[0]
    const black = (await db.select().from(players).where(eq(players.id, testBlackId)))[0]

    // Standard ratings should remain 1200
    expect(white.rating).toBe(1200)
    expect(black.rating).toBe(1200)

    // 960 ratings should change
    expect(white.rating960).toBeGreaterThan(1200)
    expect(black.rating960).toBeLessThan(1200)
    expect(white.rating960).toBe(white.rating960)
  })

  it('should generate a random startPosId if none provided for chess960', async () => {
    const gameId = await gameService.createGame(testWhiteId, testBlackId, { variant: 'chess960' })
    const game = await gameService.getGame(gameId)
    
    expect(game?.variant).toBe('chess960')
    expect(game?.startPosId).toBeGreaterThanOrEqual(0)
    expect(game?.startPosId).toBeLessThan(960)
    expect(game?.fen).toBeDefined()
    expect(game?.fen).not.toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') // Unlikely to be standard
  })
})
