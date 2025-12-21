import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TournamentLoopService } from './tournament-loop.service'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { tournaments, tournamentParticipants, players, games } from '../db/schema'
import { TournamentService } from './tournament.service'
import { GameService } from './game.service'
import { eq, and } from 'drizzle-orm'

describe('TournamentLoopService', () => {
  let loopService: TournamentLoopService
  let tournamentService: TournamentService
  let gameService: any
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
      CREATE TABLE tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'scheduled',
        start_time INTEGER NOT NULL,
        time_control_settings TEXT,
        current_round INTEGER NOT NULL DEFAULT 0,
        total_rounds INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE tournament_participants (
        tournament_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        buchholz INTEGER NOT NULL DEFAULT 0,
        joined_at INTEGER NOT NULL,
        PRIMARY KEY(tournament_id, player_id),
        FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
      CREATE TABLE games (
        id TEXT PRIMARY KEY,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ongoing',
        fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKB NR w KQkq - 0 1',
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
    `)

    tournamentService = new TournamentService(db)
    const gameManager = {
      createNewGame: vi.fn().mockReturnValue({ fen: 'start' }),
      getPlayer: vi.fn().mockReturnValue(null)
    }
    gameService = new GameService(db, gameManager as any)
    
    loopService = new TournamentLoopService(db, tournamentService, gameService)
  })

  it('should start a scheduled tournament when start_time is reached', async () => {
    // 1. Setup players
    await db.insert(players).values([
      { id: 'p1', name: 'P1', type: 'llm', createdAt: new Date() },
      { id: 'p2', name: 'P2', type: 'llm', createdAt: new Date() }
    ])

    // 2. Setup scheduled tournament
    const startTime = new Date(Date.now() - 1000) // 1s ago
    await db.insert(tournaments).values({
      id: 't1',
      name: 'Test Tourney',
      status: 'scheduled',
      startTime,
      totalRounds: 3,
      createdAt: new Date()
    })

    await db.insert(tournamentParticipants).values([
      { tournamentId: 't1', playerId: 'p1', joinedAt: new Date() },
      { tournamentId: 't1', playerId: 'p2', joinedAt: new Date() }
    ])

    await loopService.runIteration()

    // Verify tournament is now active
    const t = await tournamentService.getTournament('t1')
    expect(t.status).toBe('active')
    expect(t.currentRound).toBe(1)

    // Verify games were created
    const tGames = await db.select().from(games).where(eq(games.tournamentId, 't1'))
    expect(tGames).toHaveLength(1)
    expect(tGames[0].roundNumber).toBe(1)
  })

  it('should transition to Round 2 when all Round 1 games are completed', async () => {
    // 1. Setup players
    await db.insert(players).values([
      { id: 'p1', name: 'P1', type: 'llm', createdAt: new Date() },
      { id: 'p2', name: 'P2', type: 'llm', createdAt: new Date() },
      { id: 'p3', name: 'P3', type: 'llm', createdAt: new Date() },
      { id: 'p4', name: 'P4', type: 'llm', createdAt: new Date() }
    ])

    // 2. Setup active tournament at Round 1
    await db.insert(tournaments).values({
      id: 't2',
      name: 'Tourney 2',
      status: 'active',
      startTime: new Date(Date.now() - 10000),
      totalRounds: 3,
      currentRound: 1,
      createdAt: new Date()
    })

    await db.insert(tournamentParticipants).values([
      { tournamentId: 't2', playerId: 'p1', score: 10, joinedAt: new Date() }, // 1.0
      { tournamentId: 't2', playerId: 'p2', score: 0, joinedAt: new Date() },
      { tournamentId: 't2', playerId: 'p3', score: 10, joinedAt: new Date() },
      { tournamentId: 't2', playerId: 'p4', score: 0, joinedAt: new Date() }
    ])

    // 3. Setup completed Round 1 games
    await db.insert(games).values([
      { id: 'g1', whitePlayerId: 'p1', blackPlayerId: 'p2', status: 'completed', tournamentId: 't2', roundNumber: 1, fen: 'end', createdAt: new Date(), updatedAt: new Date() },
      { id: 'g2', whitePlayerId: 'p3', blackPlayerId: 'p4', status: 'completed', tournamentId: 't2', roundNumber: 1, fen: 'end', createdAt: new Date(), updatedAt: new Date() }
    ])

    await loopService.runIteration()

    // Verify tournament is now at Round 2
    const t = await tournamentService.getTournament('t2')
    expect(t.currentRound).toBe(2)

    // Verify Round 2 games were created (p1 vs p3, winners vs winners)
    const r2Games = await db.select().from(games).where(and(eq(games.tournamentId, 't2'), eq(games.roundNumber, 2)))
    expect(r2Games).toHaveLength(2)
    const match = r2Games.find((g: any) => (g.whitePlayerId === 'p1' && g.blackPlayerId === 'p3') || (g.whitePlayerId === 'p3' && g.blackPlayerId === 'p1'))
    expect(match).toBeDefined()
  })
})
