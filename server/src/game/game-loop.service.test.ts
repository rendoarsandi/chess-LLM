import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameLoopService } from './game-loop.service'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { games, players } from '../db/schema'
import { logger } from './logger'
import { AlarmService } from './alarm.service'

describe('GameLoopService', () => {
  let loopService: GameLoopService
  let gameService: any
  let player: any
  let db: any
  let alarmService: AlarmService

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
        tournament_id TEXT,
        round_number INTEGER,
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
        thinking_ms INTEGER,
        created_at INTEGER NOT NULL,
        FOREIGN KEY(game_id) REFERENCES games(id)
      );
    `)

    gameService = {
      makeMove: vi.fn().mockResolvedValue({}),
      getPlayer: vi.fn().mockReturnValue(null),
    }
    player = {
      makeMove: vi.fn().mockResolvedValue('e4'),
    }
    
    alarmService = new AlarmService()
    vi.spyOn(alarmService, 'setAlarm')
    
    loopService = new GameLoopService(db, gameService, player, undefined, alarmService)
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
    
    // With Alarms, it should have called setAlarm, but not makeMove yet
    expect(alarmService.setAlarm).toHaveBeenCalledWith('game:game1', expect.any(Number), expect.any(Function))
    
    // Now manually trigger the alarm
    await alarmService.executeAlarm('game:game1')

    expect(gameService.makeMove).toHaveBeenCalledWith('game1', 'e4', expect.objectContaining({ thinkingMs: expect.any(Number) }))
  })

  it('should log a warning if player fails to provide a move', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})
    player.makeMove.mockResolvedValue(null)

    await db.insert(players).values([
      { id: 'p1', name: 'Bot1', type: 'llm', createdAt: new Date() },
      { id: 'p2', name: 'Bot2', type: 'llm', createdAt: new Date() }
    ])

    await db.insert(games).values({
      id: 'game_fail',
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'ongoing',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await loopService.runIteration()
    await alarmService.executeAlarm('game:game_fail')
    
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Player failed to provide a move'))
    warnSpy.mockRestore()
  })

  it('should log an error if applying move fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    gameService.makeMove.mockRejectedValue(new Error('DB Error'))

    await db.insert(players).values([
      { id: 'p1', name: 'Bot1', type: 'llm', createdAt: new Date() },
      { id: 'p2', name: 'Bot2', type: 'llm', createdAt: new Date() }
    ])

    await db.insert(games).values({
      id: 'game_err',
      whitePlayerId: 'p1',
      blackPlayerId: 'p2',
      status: 'ongoing',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await loopService.runIteration()
    await alarmService.executeAlarm('game:game_err')
    
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Error applying move'), expect.any(Error))
    errorSpy.mockRestore()
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
    // First call is immediate
    expect(runSpy).toHaveBeenCalledTimes(1)
    
    await vi.advanceTimersByTimeAsync(1000)
    expect(runSpy).toHaveBeenCalledTimes(2)
    
    await vi.advanceTimersByTimeAsync(1000)
    expect(runSpy).toHaveBeenCalledTimes(3)
    
    vi.useRealTimers()
  })
})