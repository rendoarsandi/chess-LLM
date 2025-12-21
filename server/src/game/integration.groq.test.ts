import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameLoopService } from './game-loop.service'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { RandomPlayer } from './random-player'
import { GroqPlayer } from './groq-player'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { eq } from 'drizzle-orm'
import Database from 'better-sqlite3'
import { players, moves } from '../db/schema'
import { Chess } from 'chess.js'

describe('End-to-End Integration: Groq (Mocked) vs RandomPlayer', () => {
  let db: any
  let gameManager: GameManager
  let gameService: GameService
  let gameLoopService: GameLoopService
  let groqPlayer: GroqPlayer
  let randomPlayer: RandomPlayer
  let mockGroqService: any

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite)
    
    // Setup tables
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
      CREATE TABLE llm_configurations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_id TEXT,
        provider TEXT NOT NULL,
        model_id TEXT NOT NULL,
        api_key TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_hardcoded INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (player_id) REFERENCES players(id)
      );
    `)

    gameManager = new GameManager()
    gameService = new GameService(db, gameManager)
    
    // Mock GroqService
    mockGroqService = {
      generateMove: vi.fn().mockImplementation(async (model, prompt) => {
        const fenMatch = prompt.match(/Current FEN: (.*)/)
        const fen = fenMatch ? fenMatch[1] : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        const chess = new Chess(fen)
        const moves = chess.moves()
        if (moves.length === 0) return null
        const randomIndex = Math.floor(Math.random() * moves.length)
        const move = moves[randomIndex]
        
        // GroqPlayer expects the same format as GeminiPlayer because of BaseLlmPlayer
        return JSON.stringify({
          opening: 'Groq Opening',
          candidates: moves.slice(0, 3),
          reasoning: 'Groq thinking',
          move: move
        })
      })
    }
    
    groqPlayer = new GroqPlayer(mockGroqService as any, 'moonshotai/kimi-k2-instruct-0905')
    randomPlayer = new RandomPlayer()
    
    gameLoopService = new GameLoopService(db, gameService, randomPlayer)
  })

  it('should complete a game between Groq and RandomPlayer', async () => {
    const groqId = 'groq-kimi-id'
    const randomId = 'random-bot-id'
    
    await db.insert(players).values([
      { id: groqId, name: 'Kimi k2', type: 'llm', createdAt: new Date() },
      { id: randomId, name: 'Random Bot', type: 'llm', createdAt: new Date() }
    ])

    gameManager.setPlayer(groqId, groqPlayer)
    gameManager.setPlayer(randomId, randomPlayer)

    const gameId = await gameService.createGame(groqId, randomId)

    let attempts = 0
    const maxIterations = 1000
    
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
    
    // Verify Groq moves have thinking data
    const groqMoves = gameMoves.filter((m: any) => m.playerColor === 'white')
    expect(groqMoves.length).toBeGreaterThan(0)
    
    const sampleGroqMove = groqMoves[0]
    expect(sampleGroqMove.opening).toBe('Groq Opening')
    expect(sampleGroqMove.reasoning).toBe('Groq thinking')
  }, 60000)
})
