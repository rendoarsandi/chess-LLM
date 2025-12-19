import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameLoopService } from './game-loop.service'
import { GameService } from './game.service'
import { RandomPlayer } from './random-player'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { games, players } from '../db/schema'

describe('GameLoopService', () => {
  let loopService: GameLoopService
  let gameService: any
  let randomPlayer: any
  let db: any

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
    `)

    gameService = {
      makeMove: vi.fn().mockResolvedValue({}),
    }
    randomPlayer = {
      makeMove: vi.fn().mockReturnValue('e4'),
    }
    
    loopService = new GameLoopService(db, gameService, randomPlayer)
  })

  it('should advance an ongoing game if it is an LLM turn', async () => {
    // Setup players
    await db.insert(players).values([
      { id: 'p1', name: 'Bot1', type: 'llm', createdAt: new Date() },
      { id: 'p2', name: 'Bot2', type: 'llm', createdAt: new Date() }
    ])

    // Setup game
    await db.insert(games).values({
      id: 'game1',
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'ongoing',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await loopService.runIteration()
    
    expect(gameService.makeMove).toHaveBeenCalledWith('game1', 'e4')
  })

  it('should NOT advance if it is a human turn', async () => {
    // Setup players
    await db.insert(players).values([
      { id: 'p1', name: 'Human', type: 'human', createdAt: new Date() },
      { id: 'p2', name: 'Bot2', type: 'llm', createdAt: new Date() }
    ])

    // Setup game (White to move, White is human)
    await db.insert(games).values({
      id: 'game2',
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'ongoing',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await loopService.runIteration()
    
    expect(gameService.makeMove).not.toHaveBeenCalled()
  })

  it('should start the interval and run iterations', async () => {
    vi.useFakeTimers()
    const runSpy = vi.spyOn(loopService, 'runIteration').mockResolvedValue()
    
    loopService.start(1000)
    
    await vi.advanceTimersByTimeAsync(1000)
    expect(runSpy).toHaveBeenCalledTimes(1)
    
    await vi.advanceTimersByTimeAsync(1000)
    expect(runSpy).toHaveBeenCalledTimes(2)
    
    vi.useRealTimers()
  })
})