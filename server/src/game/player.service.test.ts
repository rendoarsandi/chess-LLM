import { describe, it, expect, beforeEach } from 'vitest'
import { PlayerService } from './player.service'
import { GameManager } from './game-manager'
import { players, games, llmConfigurations } from '../db/schema'
import { AppDatabase } from '../db/types'
import { createInMemoryDb } from '../db/test-utils'

describe('PlayerService', () => {
  let service: PlayerService
  let db: AppDatabase
  let gameManager: GameManager

  beforeEach(() => {
    const { db: testDb } = createInMemoryDb()
    db = testDb
    gameManager = new GameManager()
    service = new PlayerService(db)
  })

  it('should generate deterministic IDs', () => {
    const id1 = (
      service as unknown as { generatePlayerId: (name: string) => string }
    ).generatePlayerId('test')
    const id2 = (
      service as unknown as { generatePlayerId: (name: string) => string }
    ).generatePlayerId('test')
    expect(id1).toBe(id2)
    expect(id1.length).toBe(36)
  })

  it('should sync hardcoded configs', async () => {
    const configs = [{ provider: 'gemini', modelId: 'gemini-1.5-pro', name: 'Gemini Pro' }]
    await service.syncHardcodedConfigs(configs)

    const playersInDb = await db.select().from(players)
    expect(playersInDb).toHaveLength(1)
    expect(playersInDb[0].name).toBe('Gemini Pro')
  })

  it('should initialize active players in GameManager', async () => {
    await service.syncHardcodedConfigs([{ provider: 'gemini', modelId: 'gemini-pro' }])
    process.env.GEMINI_API_KEY = 'test-key'

    await service.initializeActivePlayers(gameManager)

    const configs = await db.select().from(llmConfigurations)
    const playerId = configs[0].playerId
    expect(gameManager.getPlayer(playerId!)).toBeDefined()
  })

  it('should get player profile', async () => {
    const playerId = 'test-id'
    await db.insert(players).values({
      id: playerId,
      name: 'Test Player',
      type: 'llm',
      rating: 1500,
      peakRating: 1500,
    })

    const profile = await service.getPlayerProfile(playerId)
    expect(profile.name).toBe('Test Player')
  })

  it('should calculate head to head records', async () => {
    const playerId = 'p1'
    await db.insert(players).values([
      { id: 'p1', name: 'P1', type: 'llm', rating: 1500, peakRating: 1500 },
      { id: 'p2', name: 'P2', type: 'llm', rating: 1500, peakRating: 1500 },
      { id: 'p3', name: 'P3', type: 'llm', rating: 1500, peakRating: 1500 },
    ])

    await db.insert(games).values([
      {
        id: 'g1',
        whitePlayerId: 'p1',
        blackPlayerId: 'p2',
        status: 'completed',
        winnerId: 'p1',
        fen: '...',
      },
      {
        id: 'g2',
        whitePlayerId: 'p2',
        blackPlayerId: 'p1',
        status: 'completed',
        winnerId: 'p1',
        fen: '...',
      },
      { id: 'g3', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'draw', fen: '...' },
      {
        id: 'g4',
        whitePlayerId: 'p1',
        blackPlayerId: 'p3',
        status: 'completed',
        winnerId: 'p3',
        fen: '...',
      },
    ])

    const h2h = await service.getHeadToHead(playerId)
    expect(h2h).toHaveLength(2)

    const p2Record = h2h.find((r) => r.opponentId === 'p2')
    expect(p2Record!.wins).toBe(2)
    expect(p2Record!.losses).toBe(0)
    expect(p2Record!.draws).toBe(1)

    const p3Record = h2h.find((r) => r.opponentId === 'p3')
    expect(p3Record!.wins).toBe(0)
    expect(p3Record!.losses).toBe(1)
    expect(p3Record!.draws).toBe(0)
  })
})
