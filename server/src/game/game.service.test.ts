import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { games, moves, players } from '../db/schema'
import { eq } from 'drizzle-orm'

describe('GameService', () => {
  let service: GameService
  let gm: GameManager
  let db: any

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    
    // Create tables manually for the test
    sqlite.exec(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        status TEXT NOT NULL,
        fen TEXT NOT NULL,
        winner_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY(white_player_id) REFERENCES players(id),
        FOREIGN KEY(black_player_id) REFERENCES players(id)
      );
      CREATE TABLE moves (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        move_number INTEGER NOT NULL,
        player_color TEXT NOT NULL,
        move TEXT NOT NULL,
        fen TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(game_id) REFERENCES games(id)
      );
    `)

    gm = new GameManager()
    service = new GameService(db, gm)
  })

  it('should create a game and save it to DB', async () => {
    // Need players first due to FK
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })

    const gameId = await service.createGame('p1', 'p2')
    
    const game = await db.select().from(games).where(eq(games.id, gameId))
    expect(game[0].whitePlayerId).toBe('p1')
    expect(game[0].status).toBe('ongoing')
  })

  it('should make a move and update DB', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    const result = await service.makeMove(gameId, 'e4')
    expect(result.fen).toContain(' b ')
    
    const dbMoves = await db.select().from(moves).where(eq(moves.gameId, gameId))
    expect(dbMoves).toHaveLength(1)
    expect(dbMoves[0].move).toBe('e4')
    expect(dbMoves[0].moveNumber).toBe(1)
  })

  it('should throw error for invalid move', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    await expect(service.makeMove(gameId, 'e5')).rejects.toThrow('Invalid move')
  })

  it('should handle game over', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    // Fool's mate sequence
    await service.makeMove(gameId, 'f3')
    await service.makeMove(gameId, 'e5')
    await service.makeMove(gameId, 'g4')
    const result = await service.makeMove(gameId, 'Qh4#')

    expect(result.status).toBe('completed')
    expect(result.winnerId).toBe('p2')

    const game = await service.getGame(gameId)
    expect(game.status).toBe('completed')
    expect(game.winnerId).toBe('p2')
  })
})