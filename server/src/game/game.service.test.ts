import { describe, it, expect, beforeEach } from 'vitest'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { games, moves, players, ratingHistory } from '../db/schema'
import { eq } from 'drizzle-orm'
import { AppDatabase } from '../db/types'
import * as schema from '../db/schema'

describe('GameService', () => {
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

  it('should make a move with thinking data and update DB', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    const thinking = {
      opening: 'King\'s Pawn Game',
      candidates: JSON.stringify(['e4', 'd4', 'Nf3']),
      reasoning: 'Control the center.'
    }

    await service.makeMove(gameId, 'e4', thinking)
    
    const dbMoves = await db.select().from(moves).where(eq(moves.gameId, gameId))
    expect(dbMoves).toHaveLength(1)
    expect(dbMoves[0].move).toBe('e4')
    expect(dbMoves[0].opening).toBe(thinking.opening)
    expect(dbMoves[0].candidates).toBe(thinking.candidates)
    expect(dbMoves[0].reasoning).toBe(thinking.reasoning)
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

  it('should update player ratings and stats on game completion', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', rating: 1200, createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', rating: 1200, createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    // Fool's mate (p2 wins)
    await service.makeMove(gameId, 'f3')
    await service.makeMove(gameId, 'e5')
    await service.makeMove(gameId, 'g4')
    await service.makeMove(gameId, 'Qh4#')

    const player1 = (await db.select().from(players).where(eq(players.id, 'p1')))[0]
    const player2 = (await db.select().from(players).where(eq(players.id, 'p2')))[0]

    // Equal ratings (1200), p2 wins.
    // Expected change for p2: 32 * (1 - 0.5) = +16
    // Expected change for p1: 32 * (0 - 0.5) = -16
    expect(player1.rating).toBe(1184)
    expect(player1.losses).toBe(1)
    expect(player2.rating).toBe(1216)
    expect(player2.wins).toBe(1)
    expect(player2.peakRating).toBe(1216)

    // Check rating history
    const history1 = await db.select().from(ratingHistory).where(eq(ratingHistory.playerId, 'p1'))
    const history2 = await db.select().from(ratingHistory).where(eq(ratingHistory.playerId, 'p2'))
    expect(history1).toHaveLength(1)
    expect(history1[0].rating).toBe(1184)
    expect(history2).toHaveLength(1)
    expect(history2[0].rating).toBe(1216)
  })

  it('should maintain the same moveNumber for White and Black moves in a turn', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })
    const gameId = await service.createGame('p1', 'p2')

    await service.makeMove(gameId, 'e4') // White move 1
    await service.makeMove(gameId, 'e5') // Black move 1
    await service.makeMove(gameId, 'Nf3') // White move 2

    const dbMoves = await db.select().from(moves).where(eq(moves.gameId, gameId)).orderBy(moves.id)
    expect(dbMoves).toHaveLength(3)
    
    expect(dbMoves[0].move).toBe('e4')
    expect(dbMoves[0].moveNumber).toBe(1)
    
    expect(dbMoves[1].move).toBe('e5')
    expect(dbMoves[1].moveNumber).toBe(1)
    
    expect(dbMoves[2].move).toBe('Nf3')
    expect(dbMoves[2].moveNumber).toBe(2)
  })

  it('should calculate player stats correctly', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', rating: 1200, createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', rating: 1200, createdAt: new Date() })
    
    // Game 1: p1 white, Ruy Lopez
    const g1 = await service.createGame('p1', 'p2')
    await service.makeMove(g1, 'e4', { opening: 'Ruy Lopez' })
    await service.makeMove(g1, 'e5')
    await service.makeMove(g1, 'Nf3')
    await service.makeMove(g1, 'Nc6')
    await service.makeMove(g1, 'Bb5') // Ruy Lopez
    await db.update(games).set({ status: 'completed' }).where(eq(games.id, g1))
    
    // Game 2: p1 white, Ruy Lopez again
    const g2 = await service.createGame('p1', 'p2')
    await service.makeMove(g2, 'e4', { opening: 'Ruy Lopez' })
    await db.update(games).set({ status: 'completed' }).where(eq(games.id, g2))
    
    // Game 3: p1 white, Sicilian
    const g3 = await service.createGame('p1', 'p2')
    await service.makeMove(g3, 'e4', { opening: 'Sicilian Defense' })
    await db.update(games).set({ status: 'completed' }).where(eq(games.id, g3))

    const stats = await service.getPlayerStats('p1')
    expect(stats.favoriteOpenings).toHaveLength(2)
    expect(stats.favoriteOpenings[0].opening).toBe('Ruy Lopez')
    expect(stats.favoriteOpenings[0].count).toBe(2)
    expect(stats.favoriteOpenings[1].opening).toBe('Sicilian Defense')
    expect(stats.favoriteOpenings[1].count).toBe(1)
  })

  it('should not allow creating a new game if one is already ongoing', async () => {
    await db.insert(players).values({ id: 'p1', name: 'White', type: 'human', createdAt: new Date() })
    await db.insert(players).values({ id: 'p2', name: 'Black', type: 'human', createdAt: new Date() })

    await service.createGame('p1', 'p2')
    
    await expect(service.createGame('p1', 'p2')).rejects.toThrow('A game is already in progress. Please complete or delete it first.')
  })
})