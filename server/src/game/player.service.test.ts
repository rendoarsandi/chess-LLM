import { describe, it, expect, beforeEach } from 'vitest'
import { PlayerService } from './player.service'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { players, ratingHistory, games } from '../db/schema'
import { eq } from 'drizzle-orm'

describe('PlayerService', () => {
  let service: PlayerService
  let db: any

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    
    sqlite.exec(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        rating INTEGER NOT NULL DEFAULT 1200,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        draws INTEGER NOT NULL DEFAULT 0,
        peak_rating INTEGER NOT NULL DEFAULT 1200,
        version TEXT,
        provider TEXT,
        bio TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ongoing',
        fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        winner_id TEXT,
        game_over_reason TEXT,
        pgn TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(white_player_id) REFERENCES players(id),
        FOREIGN KEY(black_player_id) REFERENCES players(id)
      );
      CREATE TABLE rating_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        game_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(player_id) REFERENCES players(id),
        FOREIGN KEY(game_id) REFERENCES games(id)
      );
    `)

    service = new PlayerService(db)
  })

  it('should get player profile correctly', async () => {
    const now = new Date()
    await db.insert(players).values({
      id: 'p1',
      name: 'Gemini Flash',
      type: 'llm',
      version: '1.5',
      provider: 'Google',
      bio: 'A fast model.',
      rating: 1500,
      peakRating: 1550,
      wins: 10,
      losses: 5,
      draws: 2,
      createdAt: now
    })

    const profile = await service.getPlayerProfile('p1')
    expect(profile).toBeDefined()
    expect(profile!.name).toBe('Gemini Flash')
    expect(profile!.version).toBe('1.5')
    expect(profile!.rating).toBe(1500)
    expect(profile!.peakRating).toBe(1550)
  })

  it('should get ELO history correctly', async () => {
    await db.insert(players).values({ id: 'p1', name: 'P1', type: 'llm', createdAt: new Date() })
    
    const baseDate = new Date('2025-12-01T12:00:00Z')
    await db.insert(ratingHistory).values([
      { playerId: 'p1', rating: 1200, createdAt: new Date(baseDate.getTime()) },
      { playerId: 'p1', rating: 1215, createdAt: new Date(baseDate.getTime() + 86400000) }, // +1 day
      { playerId: 'p1', rating: 1210, createdAt: new Date(baseDate.getTime() + 86400000 * 2) }, // +2 days
    ])

    const history = await service.getEloHistory('p1', 'all')
    expect(history).toHaveLength(3)
    expect(history[0]!.rating).toBe(1200)
    expect(history[2]!.rating).toBe(1210)
  })

  it('should get head-to-head records correctly', async () => {
    await db.insert(players).values([
      { id: 'p1', name: 'Player 1', type: 'llm', createdAt: new Date() },
      { id: 'p2', name: 'Player 2', type: 'llm', createdAt: new Date() },
      { id: 'p3', name: 'Player 3', type: 'llm', createdAt: new Date() },
    ])

    // p1 vs p2
    await db.insert(games).values([
      { id: 'g1', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'completed', winnerId: 'p1', createdAt: new Date(), updatedAt: new Date(), fen: '' },
      { id: 'g2', whitePlayerId: 'p2', blackPlayerId: 'p1', status: 'completed', winnerId: 'p1', createdAt: new Date(), updatedAt: new Date(), fen: '' },
      { id: 'g3', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'draw', winnerId: null, createdAt: new Date(), updatedAt: new Date(), fen: '' },
    ])

    // p1 vs p3
    await db.insert(games).values([
      { id: 'g4', whitePlayerId: 'p1', blackPlayerId: 'p3', status: 'completed', winnerId: 'p3', createdAt: new Date(), updatedAt: new Date(), fen: '' },
    ])

    const h2h = await service.getHeadToHead('p1')
    expect(h2h).toHaveLength(2)
    
    const p2Record = h2h.find((r: any) => r.opponentId === 'p2')
    expect(p2Record!.wins).toBe(2)
    expect(p2Record!.losses).toBe(0)
    expect(p2Record!.draws).toBe(1)

    const p3Record = h2h.find((r: any) => r.opponentId === 'p3')
    expect(p3Record!.wins).toBe(0)
    expect(p3Record!.losses).toBe(1)
    expect(p3Record!.draws).toBe(0)
  })
})
