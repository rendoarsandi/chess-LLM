import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameLoopService } from './game-loop.service'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { RandomPlayer } from './random-player'
import { GeminiPlayer } from './gemini-player'
import { GeminiService } from './gemini.service'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import Database from 'better-sqlite3'
import { games, players, moves } from '../db/schema'
import { Chess } from 'chess.js'

describe('End-to-End Integration: Gemini vs RandomPlayer', () => {
  let db: any
  let gameManager: GameManager
  let gameService: GameService
  let gameLoopService: GameLoopService
  let geminiPlayer: GeminiPlayer
  let randomPlayer: RandomPlayer
  let mockGeminiService: any

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    
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
        opening TEXT,
        candidates TEXT,
        reasoning TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(game_id) REFERENCES games(id)
      );
    `)

    gameManager = new GameManager()
    gameService = new GameService(db, gameManager)
    
    // Mock GeminiService to be a "smart" random player (always legal moves)
    mockGeminiService = {
      generateMove: vi.fn().mockImplementation(async (model, prompt) => {
        // Extract FEN from prompt
        const fenMatch = prompt.match(/Current board state \(FEN\): (.*)/)
        const fen = fenMatch ? fenMatch[1] : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        const chess = new Chess(fen)
        const moves = chess.moves()
        if (moves.length === 0) return null
        const randomIndex = Math.floor(Math.random() * moves.length)
        return moves[randomIndex]
      })
    }
    
    geminiPlayer = new GeminiPlayer(mockGeminiService as any)
    randomPlayer = new RandomPlayer()
    
    // Default loop player is RandomPlayer, but we will register Gemini specifically
    gameLoopService = new GameLoopService(db, gameService, randomPlayer)
  })

  it('should complete a full game between Gemini and RandomPlayer', async () => {
    // 1. Setup players
    const gId = 'gemini-id'
    const rId = 'random-id'
    
    await db.insert(players).values([
      { id: gId, name: 'Gemini', type: 'llm', createdAt: new Date() },
      { id: rId, name: 'Random', type: 'llm', createdAt: new Date() }
    ])

    // 2. Register GeminiPlayer for the specific ID in GameManager
    gameManager.setPlayer(gId, geminiPlayer)
    // RandomPlayer is already default in loopService, but we could also register it
    gameManager.setPlayer(rId, randomPlayer)

    // 3. Create game
    const gameId = await gameService.createGame(gId, rId)

    // 4. Run iterations until game is over
    let attempts = 0
    const maxIterations = 1000 // Increased significantly to ensure game conclusion
    
    let game = await gameService.getGame(gameId)
    while (game.status === 'ongoing' && attempts < maxIterations) {
      await gameLoopService.runIteration()
      game = await gameService.getGame(gameId)
      attempts++
    }

    expect(game.status).not.toBe('ongoing')
    expect(attempts).toBeLessThan(maxIterations)
    
    const gameMoves = await db.select().from(moves).where(eq(moves.gameId, gameId))
    expect(gameMoves.length).toBeGreaterThan(0)
    
    console.log(`[IntegrationTest] Game finished in ${attempts} iterations with status ${game.status}`)
  })
})
