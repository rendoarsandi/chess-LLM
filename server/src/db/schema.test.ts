import { describe, it, expect } from 'vitest'
import * as schema from './schema'
import { db } from './index'
import { eq } from 'drizzle-orm'

describe('Database Schema', () => {
  it('should be able to connect and query the database', async () => {
    expect(db).toBeDefined()
    // A simple query to verify the connection is active
    const result = await db.select().from(schema.players).limit(1)
    expect(Array.isArray(result)).toBe(true)
  })

  it('should be able to insert and retrieve Chess 960 stats', async () => {
    const testId = 'test-960-stats'
    await db.delete(schema.players).where(eq(schema.players.id, testId))
    
    await db.insert(schema.players).values({
      id: testId,
      name: '960 Tester',
      type: 'llm',
      wins960: 10,
      rating960: 1500
    })

    const result = await db.select().from(schema.players).where(eq(schema.players.id, testId))
    expect(result[0].wins960).toBe(10)
    expect(result[0].rating960).toBe(1500)
    
    await db.delete(schema.players).where(eq(schema.players.id, testId))
  })

  describe('Core Tables', () => {
    it('should have players table defined with ELO, stats, and profile columns', () => {
      expect(schema.players).toBeDefined()
      expect(schema.players.rating).toBeDefined()
      expect(schema.players.rating960).toBeDefined()
      expect(schema.players.wins).toBeDefined()
      expect(schema.players.losses).toBeDefined()
      expect(schema.players.draws).toBeDefined()
      expect(schema.players.wins960).toBeDefined()
      expect(schema.players.losses960).toBeDefined()
      expect(schema.players.draws960).toBeDefined()
      expect(schema.players.peakRating).toBeDefined()
      expect(schema.players.peakRating960).toBeDefined()
      expect(schema.players.version).toBeDefined()
      expect(schema.players.provider).toBeDefined()
      expect(schema.players.bio).toBeDefined()
    })

    it('should have ratingHistory table defined', () => {
      expect(schema.ratingHistory).toBeDefined()
      expect(schema.ratingHistory.playerId).toBeDefined()
      expect(schema.ratingHistory.rating).toBeDefined()
    })

    it('should have games table defined', () => {
      expect(schema.games).toBeDefined()
    })

    it('should have moves table defined with thinking columns', () => {
      expect(schema.moves).toBeDefined()
      expect(schema.moves.opening).toBeDefined()
      expect(schema.moves.candidates).toBeDefined()
      expect(schema.moves.reasoning).toBeDefined()
    })
  })

  describe('Tournament Tables', () => {
    it('should have tournaments table defined with expected columns', () => {
      expect(schema.tournaments).toBeDefined()
      expect(schema.tournaments.id).toBeDefined()
      expect(schema.tournaments.name).toBeDefined()
      expect(schema.tournaments.status).toBeDefined()
      expect(schema.tournaments.startTime).toBeDefined()
      expect(schema.tournaments.timeControlSettings).toBeDefined()
      expect(schema.tournaments.currentRound).toBeDefined()
      expect(schema.tournaments.totalRounds).toBeDefined()
      expect(schema.tournaments.createdAt).toBeDefined()
    })

    it('should have tournamentParticipants table defined with expected columns', () => {
      expect(schema.tournamentParticipants).toBeDefined()
      expect(schema.tournamentParticipants.tournamentId).toBeDefined()
      expect(schema.tournamentParticipants.playerId).toBeDefined()
      expect(schema.tournamentParticipants.score).toBeDefined()
      expect(schema.tournamentParticipants.buchholz).toBeDefined()
      expect(schema.tournamentParticipants.joinedAt).toBeDefined()
    })

    it('should have games table updated with tournament columns', () => {
      expect(schema.games).toBeDefined()
      expect(schema.games.tournamentId).toBeDefined()
      expect(schema.games.roundNumber).toBeDefined()
    })
  })

  describe('Game Review Tables', () => {
    it('should have gameReviews table defined', () => {
      expect(schema.gameReviews).toBeDefined()
      expect(schema.gameReviews.gameId).toBeDefined()
      expect(schema.gameReviews.status).toBeDefined()
      expect(schema.gameReviews.startedAt).toBeDefined()
      expect(schema.gameReviews.workerId).toBeDefined()
      expect(schema.gameReviews.lastHeartbeat).toBeDefined()
      expect(schema.gameReviews.completedAt).toBeDefined()
    })

    it('should have moveAnalyses table defined', () => {
      expect(schema.moveAnalyses).toBeDefined()
      expect(schema.moveAnalyses.reviewId).toBeDefined()
      expect(schema.moveAnalyses.moveNumber).toBeDefined()
      expect(schema.moveAnalyses.classification).toBeDefined()
      expect(schema.moveAnalyses.evaluation).toBeDefined()
      expect(schema.moveAnalyses.bestLine).toBeDefined()
    })
  })

  describe('LLM Configurations Table', () => {
    it('should have llmConfigurations table defined with required columns', () => {
      expect(schema.llmConfigurations).toBeDefined()
      const table = schema.llmConfigurations
      expect(table.id).toBeDefined()
      expect(table.playerId).toBeDefined()
      expect(table.provider).toBeDefined()
      expect(table.modelId).toBeDefined()
      expect(table.apiKey).toBeDefined()
      expect(table.isActive).toBeDefined()
      expect(table.isHardcoded).toBeDefined()
      expect(table.createdAt).toBeDefined()
      expect(table.updatedAt).toBeDefined()
    })
  })
})