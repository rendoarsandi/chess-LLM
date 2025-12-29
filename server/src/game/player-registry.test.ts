import { describe, it, expect, beforeEach } from 'vitest'
import { PlayerService } from './player.service'
import { GameManager } from './game-manager'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { AppDatabase } from '../db/types'
import * as schema from '../db/schema'

describe('PlayerService - Registry & Sync', () => {
  let db: AppDatabase
  let gameManager: GameManager
  let playerService: PlayerService

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite, { schema })

    // Initialize schema
    sqlite.exec(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 1200,
        rating960 INTEGER NOT NULL DEFAULT 1200,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        wins960 INTEGER NOT NULL DEFAULT 0,
        losses960 INTEGER NOT NULL DEFAULT 0,
        draws960 INTEGER NOT NULL DEFAULT 0,
        peak_rating INTEGER NOT NULL DEFAULT 1200,
        peak_rating960 INTEGER NOT NULL DEFAULT 1200,
        version TEXT,
        provider TEXT,
        bio TEXT,
        created_at INTEGER NOT NULL
      );

            CREATE TABLE llm_configurations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_id TEXT,
                provider TEXT NOT NULL,
                model_id TEXT NOT NULL,
                api_key TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                is_hardcoded INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
                FOREIGN KEY (player_id) REFERENCES players(id)
            );
        `)

    gameManager = new GameManager()
    playerService = new PlayerService(db)
  })

  it('should sync hardcoded configurations', async () => {
    const hardcoded = [
      { provider: 'gemini', modelId: 'gemini-test', name: 'Test Gemini', rating: 2000 },
    ]

    await playerService.syncHardcodedConfigs(hardcoded)

    const configs = await db.select().from(schema.llmConfigurations)
    expect(configs).toHaveLength(1)
    expect(configs[0].modelId).toBe('gemini-test')
    expect(configs[0].isHardcoded).toBe(true)
    expect(configs[0].playerId).toBeDefined()

    const players = await db.select().from(schema.players)
    expect(players).toHaveLength(1)
    expect(players[0].name).toBe('Test Gemini')
    expect(players[0].id).toBe(configs[0].playerId)
  })

  it('should initialize active players in GameManager', async () => {
    // First sync to create entries

    await playerService.syncHardcodedConfigs([{ provider: 'gemini', modelId: 'gemini-pro' }])

    // Mock process.env for API key

    process.env.GEMINI_API_KEY = 'test-key'

    await playerService.initializeActivePlayers(gameManager)

    const configs = await db.select().from(schema.llmConfigurations)

    const playerId = configs[0].playerId

    expect(gameManager.getPlayer(playerId!)).toBeDefined()
  })

  it('should correctly handle a new dynamic model being added', async () => {
    const dynamicModelId = 'new-gemini-model'

    const dynamicPlayerId = 'dynamic-uuid-123'

    // 1. Simulate admin adding model via API

    await db.insert(schema.players).values({
      id: dynamicPlayerId,

      name: 'Dynamic Gemini',

      type: 'llm',

      rating: 1500,

      peakRating: 1500,

      createdAt: new Date(),
    })

    await db.insert(schema.llmConfigurations).values({
      provider: 'gemini',

      modelId: dynamicModelId,

      isActive: true,

      isHardcoded: false,

      playerId: dynamicPlayerId,

      apiKey: 'dynamic-key',
    })

    // 2. Initialize

    await playerService.initializeActivePlayers(gameManager)

    // 3. Verify it's in GameManager

    expect(gameManager.getPlayer(dynamicPlayerId)).toBeDefined()
  })
})
