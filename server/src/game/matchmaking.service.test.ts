import { beforeEach, describe, expect, it } from 'vitest'
import { createInMemoryDb } from '../db/test-utils'
import { AppDatabase } from '../db/types'
import { games, llmConfigurations, players } from '../db/schema'
import { GameManager } from './game-manager'
import { GameService } from './game.service'
import { MatchmakingService } from './matchmaking.service'

describe('MatchmakingService', () => {
  let db: AppDatabase
  let matchmakingService: MatchmakingService

  beforeEach(async () => {
    const { db: testDb } = createInMemoryDb()
    db = testDb

    await db.insert(players).values([
      {
        id: 'p1',
        name: 'Alpha',
        type: 'llm',
        provider: 'openrouter',
        version: 'openai/gpt-5',
        rating: 1800,
        rating960: 1700,
      },
      {
        id: 'p2',
        name: 'Beta',
        type: 'llm',
        provider: 'groq',
        version: 'qwen/qwen3-32b',
        rating: 1790,
        rating960: 1710,
      },
      {
        id: 'p3',
        name: 'Gamma',
        type: 'llm',
        provider: 'gemini',
        version: 'gemini-2.5-flash',
        rating: 1500,
        rating960: 1500,
      },
      {
        id: 'stockfish',
        name: 'Stockfish',
        type: 'llm',
        provider: 'system',
        rating: 3200,
        rating960: 3200,
      },
    ])

    await db.insert(llmConfigurations).values([
      { provider: 'openrouter', modelId: 'openai/gpt-5', playerId: 'p1', isActive: true },
      { provider: 'groq', modelId: 'qwen/qwen3-32b', playerId: 'p2', isActive: true },
      { provider: 'gemini', modelId: 'gemini-2.5-flash', playerId: 'p3', isActive: true },
      { provider: 'system', modelId: 'stockfish', playerId: 'stockfish', isActive: true },
    ])

    const gameService = new GameService(db, new GameManager())
    matchmakingService = new MatchmakingService(db, gameService)
  })

  it('previews the closest eligible active LLM pair and excludes system engines', async () => {
    const status = await matchmakingService.getStatus()

    expect(status.eligiblePlayers.map((player) => player.id)).toEqual(['p1', 'p2', 'p3'])
    expect(status.nextPair?.white.id).toBe('p1')
    expect(status.nextPair?.black.id).toBe('p2')
    expect(status.nextPair?.ratingGap).toBe(10)
  })

  it('avoids repeated pairings before unused pairings', async () => {
    await db.insert(games).values([
      {
        id: 'old-1',
        whitePlayerId: 'p1',
        blackPlayerId: 'p2',
        status: 'completed',
        variant: 'standard',
        fen: 'fen',
        createdAt: new Date(Date.now() - 86400000),
        updatedAt: new Date(Date.now() - 86400000),
      },
    ])

    const nextPair = await matchmakingService.getNextPair()

    expect([nextPair?.white.id, nextPair?.black.id].sort()).not.toEqual(['p1', 'p2'])
  })

  it('creates the next arena game when no arena game is ongoing', async () => {
    const result = await matchmakingService.createNextMatch()

    expect(result.created).toBe(true)
    if (!result.created) return

    const [createdGame] = await db.select().from(games)
    expect(createdGame.id).toBe(result.gameId)
    expect(createdGame.whitePlayerId).toBe('p1')
    expect(createdGame.blackPlayerId).toBe('p2')
  })

  it('waits while an arena game is ongoing', async () => {
    await db.insert(games).values({
      id: 'ongoing',
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'ongoing',
      variant: 'standard',
      fen: 'fen',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const result = await matchmakingService.createNextMatch()

    expect(result.created).toBe(false)
    if (result.created) return
    expect(result.reason).toContain('already ongoing')
  })
})
