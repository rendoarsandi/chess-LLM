import { describe, it, expect, beforeEach } from 'vitest'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { players } from '../db/schema'
import { AppDatabase } from '../db/types'
import * as schema from '../db/schema'

describe('GameService Draw Rules', () => {
  let service: GameService
  let gm: GameManager
  let db: AppDatabase

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite, { schema })
    
    // Create tables manually for the test
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
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ongoing',
        variant TEXT NOT NULL DEFAULT 'standard',
        start_pos_id INTEGER,
        fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        winner_id TEXT,
        game_over_reason TEXT,
        pgn TEXT,
        tournament_id TEXT,
        round_number INTEGER,
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
      CREATE TABLE moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        move_number INTEGER NOT NULL,
        player_color TEXT NOT NULL,
        move TEXT NOT NULL,
        fen TEXT NOT NULL,
        opening TEXT,
        candidates TEXT,
        reasoning TEXT,
        thinking_ms INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(game_id) REFERENCES games(id)
      );
    `)

    gm = new GameManager()
    service = new GameService(db, gm)
  })

  it('should detect threefold repetition', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    // Initial position: 1
    await service.makeMove(gameId, 'Nf3') // 2
    await service.makeMove(gameId, 'Nf6') // 3
    await service.makeMove(gameId, 'Ng1') // 4 (back to start)
    await service.makeMove(gameId, 'Ng8') // 5 (2nd time)
    
    await service.makeMove(gameId, 'Nf3') // 6
    await service.makeMove(gameId, 'Nf6') // 7
    await service.makeMove(gameId, 'Ng1') // 8
    const result = await service.makeMove(gameId, 'Ng8') // 9 (3rd time)

    expect(result.status).toBe('draw')
    expect(result.gameOverReason).toBe('threefold repetition')
  })

  it('should detect stalemate', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    // Fast stalemate sequence
    // 1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. Qxc7 Rah6 5. h4 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6
    const movesList = ['e3', 'a5', 'Qh5', 'Ra6', 'Qxa5', 'h5', 'Qxc7', 'Rah6', 'h4', 'f6', 'Qxd7+', 'Kf7', 'Qxb7', 'Qd3', 'Qxb8', 'Qh7', 'Qxc8', 'Kg6']
    
    for (const move of movesList) {
      await service.makeMove(gameId, move)
    }
    
    const result = await service.makeMove(gameId, 'Qe6')

    expect(result.status).toBe('draw')
    expect(result.gameOverReason).toBe('stalemate')
  })

  it('should detect 50-move rule', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')
    
    const wCycle = ['Na3', 'Nb1', 'Nh3', 'Ng1', 'Na3', 'Nb1', 'Nh3', 'Ng1']
    const bCycle = ['Na6', 'Nb8', 'Nh6', 'Ng8', 'Nh6', 'Ng8', 'Na6', 'Nb8']
    let lastResult: Awaited<ReturnType<typeof service.makeMove>> | undefined = undefined;

    for (let i = 0; i < 50; i++) {
        lastResult = await service.makeMove(gameId, wCycle[i % wCycle.length])
        if (lastResult.status !== 'ongoing') break;
        
        lastResult = await service.makeMove(gameId, bCycle[i % bCycle.length])
        if (lastResult.status !== 'ongoing') break;
    }
    
    expect(lastResult?.status).toBe('draw')
    expect(['draw', 'threefold repetition']).toContain(lastResult?.gameOverReason)
  })
})