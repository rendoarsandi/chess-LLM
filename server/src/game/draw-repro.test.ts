import { describe, it, expect, beforeEach } from 'vitest'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { games, moves, players, ratingHistory } from '../db/schema'
import { eq } from 'drizzle-orm'
import { AppDatabase } from '../db/types'
import * as schema from '../db/schema'

describe('Game Draw Detection Repro', () => {
  let service: GameService
  let gm: GameManager
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

    await service.makeMove(gameId, 'Nf3') 
    await service.makeMove(gameId, 'Nf6') 
    await service.makeMove(gameId, 'Ng1') 
    await service.makeMove(gameId, 'Ng8') 
    await service.makeMove(gameId, 'Nf3') 
    await service.makeMove(gameId, 'Nf6') 
    await service.makeMove(gameId, 'Ng1') 
    const result = await service.makeMove(gameId, 'Ng8') 

    expect(result.status).toBe('draw')
    expect(result.gameOverReason).toBe('threefold repetition')
  })

  it('should detect stalemate', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    const stalemateMoves = ['e3', 'a5', 'Qh5', 'Ra6', 'Qxa5', 'h5', 'h4', 'Rah6', 'Qxc7', 'f6', 'Qxd7+', 'Kf7', 'Qxb7', 'Qd3', 'Qxb8', 'Qh7', 'Qxc8', 'Kg6']
    for (const move of stalemateMoves) {
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

    // Using a FEN that has 99 half-moves and is not insufficient material
    // '8/8/8/8/8/8/k7/7K w - - 99 50' is insufficient.
    // Let's add a pawn: '8/8/8/8/8/P7/k7/7K w - - 99 50'
    const near50Fen = '8/8/8/8/8/P7/8/k6K w - - 99 50' 
    await db.update(games).set({ fen: near50Fen, pgn: null as any }).where(eq(games.id, gameId))
    
    // In this FEN, white King is at h1. Move to g1.
    const result = await service.makeMove(gameId, 'Kh2')
    
    expect(result.status).toBe('draw')
    expect(result.gameOverReason).toBe('draw')
  })
})
