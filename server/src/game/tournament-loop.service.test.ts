import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TournamentLoopService } from './tournament-loop.service'
import { tournaments, tournamentParticipants, players, games } from '../db/schema'
import { TournamentService } from './tournament.service'
import { GameService } from './game.service'
import { GameManager } from './game-manager'
import { eq, and } from 'drizzle-orm'

import { AppDatabase } from '../db/types'
import { createInMemoryDb } from '../db/test-utils'

describe('TournamentLoopService', () => {
  let loopService: TournamentLoopService
  let tournamentService: TournamentService
  let gameService: GameService
  let db: AppDatabase

  beforeEach(() => {
    const { db: testDb } = createInMemoryDb()
    db = testDb

    tournamentService = new TournamentService(db)
    const gameManager = {
      createNewGame: vi.fn().mockReturnValue({ fen: 'start' }),
      getPlayer: vi.fn().mockReturnValue(null),
    }
    gameService = new GameService(db, gameManager as unknown as GameManager)

    loopService = new TournamentLoopService(db, tournamentService, gameService)
  })

  it('should start a scheduled tournament when start_time is reached', async () => {
    // 1. Setup players
    await db.insert(players).values([
      { id: 'p1', name: 'P1', type: 'llm', createdAt: new Date() },
      { id: 'p2', name: 'P2', type: 'llm', createdAt: new Date() },
    ])

    // 2. Setup scheduled tournament
    const startTime = new Date(Date.now() - 1000) // 1s ago
    await db.insert(tournaments).values({
      id: 't1',
      name: 'Test Tourney',
      status: 'scheduled',
      startTime,
      totalRounds: 3,
      createdAt: new Date(),
    })

    await db.insert(tournamentParticipants).values([
      { tournamentId: 't1', playerId: 'p1', joinedAt: new Date() },
      { tournamentId: 't1', playerId: 'p2', joinedAt: new Date() },
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
      { id: 'p4', name: 'P4', type: 'llm', createdAt: new Date() },
    ])

    // 2. Setup active tournament at Round 1
    await db.insert(tournaments).values({
      id: 't2',
      name: 'Tourney 2',
      status: 'active',
      startTime: new Date(Date.now() - 10000),
      totalRounds: 3,
      currentRound: 1,
      createdAt: new Date(),
    })

    await db.insert(tournamentParticipants).values([
      { tournamentId: 't2', playerId: 'p1', score: 10, joinedAt: new Date() }, // 1.0
      { tournamentId: 't2', playerId: 'p2', score: 0, joinedAt: new Date() },
      { tournamentId: 't2', playerId: 'p3', score: 10, joinedAt: new Date() },
      { tournamentId: 't2', playerId: 'p4', score: 0, joinedAt: new Date() },
    ])

    // 3. Setup completed Round 1 games
    await db.insert(games).values([
      {
        id: 'g1',
        whitePlayerId: 'p1',
        blackPlayerId: 'p2',
        status: 'completed',
        tournamentId: 't2',
        roundNumber: 1,
        fen: 'end',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'g2',
        whitePlayerId: 'p3',
        blackPlayerId: 'p4',
        status: 'completed',
        tournamentId: 't2',
        roundNumber: 1,
        fen: 'end',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    await loopService.runIteration()

    // Verify tournament is now at Round 2
    const t = await tournamentService.getTournament('t2')
    expect(t.currentRound).toBe(2)

    // Verify Round 2 games were created (p1 vs p3, winners vs winners)
    const r2Games = await db
      .select()
      .from(games)
      .where(and(eq(games.tournamentId, 't2'), eq(games.roundNumber, 2)))
    expect(r2Games).toHaveLength(2)
    const match = r2Games.find(
      (g) =>
        (g.whitePlayerId === 'p1' && g.blackPlayerId === 'p3') ||
        (g.whitePlayerId === 'p3' && g.blackPlayerId === 'p1'),
    )
    expect(match).toBeDefined()
  })
})
