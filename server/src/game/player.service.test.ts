import { describe, it, expect, beforeEach } from 'vitest'
import { PlayerService } from './player.service'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { players, games } from '../db/schema'
import { AppDatabase } from '../db/types'
import * as schema from '../db/schema'

describe('PlayerService', () => {
  let service: PlayerService
  let db: AppDatabase

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite, { schema })
    
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
        peak_rating INTEGER NOT NULL DEFAULT 1200,
        peak_rating960 INTEGER NOT NULL DEFAULT 1200,
        version TEXT,
        provider TEXT,
        bio TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE llm_configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        model_id TEXT NOT NULL,
        api_key TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_hardcoded INTEGER NOT NULL DEFAULT 0,
        player_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE rating_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        rating REAL NOT NULL,
        game_id TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        fen TEXT NOT NULL,
        pgn TEXT,
        status TEXT NOT NULL,
        variant TEXT NOT NULL DEFAULT 'standard',
        start_pos_id INTEGER,
        winner_id TEXT,
        game_over_reason TEXT,
        tournament_id TEXT,
        round_number INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    service = new PlayerService(db)
  })

  it('should generate deterministic IDs', () => {
    const id1 = (service as unknown as { generatePlayerId: (name: string) => string }).generatePlayerId('test')
    const id2 = (service as unknown as { generatePlayerId: (name: string) => string }).generatePlayerId('test')
    expect(id1).toBe(id2)
    expect(id1.length).toBe(36)
  })

  it('should sync hardcoded configs', async () => {
    const configs = [
      { provider: 'gemini', modelId: 'gemini-1.5-pro', name: 'Gemini Pro' }
    ]
    await service.syncHardcodedConfigs(configs)

    const playersInDb = await db.select().from(players)
    expect(playersInDb).toHaveLength(1)
    expect(playersInDb[0].name).toBe('Gemini Pro')
  })

  it('should get player profile', async () => {
    const playerId = 'test-id'
    await db.insert(players).values({
      id: playerId,
      name: 'Test Player',
      type: 'llm',
      rating: 1500,
      peakRating: 1500
    })

    const profile = await service.getPlayerProfile(playerId)
    expect(profile.name).toBe('Test Player')
  })

  it('should calculate head to head records', async () => {
    const playerId = 'p1'
    await db.insert(players).values([
      { id: 'p1', name: 'P1', type: 'llm', rating: 1500, peakRating: 1500 },
      { id: 'p2', name: 'P2', type: 'llm', rating: 1500, peakRating: 1500 },
      { id: 'p3', name: 'P3', type: 'llm', rating: 1500, peakRating: 1500 }
    ])

    await db.insert(games).values([
      { id: 'g1', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'completed', winnerId: 'p1', fen: '...' },
      { id: 'g2', whitePlayerId: 'p2', blackPlayerId: 'p1', status: 'completed', winnerId: 'p1', fen: '...' },
      { id: 'g3', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'draw', fen: '...' },
      { id: 'g4', whitePlayerId: 'p1', blackPlayerId: 'p3', status: 'completed', winnerId: 'p3', fen: '...' }
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