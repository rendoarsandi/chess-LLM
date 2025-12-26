import { describe, it, expect, beforeEach } from 'vitest'
import { TournamentService } from './tournament.service'
import { players } from '../db/schema'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from '../db/schema'
import { AppDatabase } from '../db/types'

describe('TournamentService', () => {
  let db: AppDatabase
  let tournamentService: TournamentService

  beforeEach(() => {
    const sqlite = new Database(':memory:')
    db = drizzle(sqlite, { schema })
    
    // Create tables
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
        FOREIGN KEY(tournament_id) REFERENCES tournaments(id),
        FOREIGN KEY(player_id) REFERENCES players(id)
      );
    `)

    tournamentService = new TournamentService(db)
  })

  it('should create a tournament', async () => {
    const data = {
      name: 'Tilted Tuesday Mock',
      startTime: new Date(),
      totalRounds: 5,
      timeControlSettings: '3+2'
    }

    const { id } = await tournamentService.createTournament(data)
    expect(id).toBeDefined()

    const tournament = await tournamentService.getTournament(id)
    expect(tournament.name).toBe(data.name)
    expect(tournament.totalRounds).toBe(data.totalRounds)
  })

  it('should register a participant', async () => {
    const { id: tId } = await tournamentService.createTournament({
      name: 'Tournament',
      startTime: new Date(),
      totalRounds: 3
    })

    const pId = 'p-1'
    await db.insert(players).values({ id: pId, name: 'Player 1', type: 'human', createdAt: new Date() })

    await tournamentService.registerParticipant(tId, pId)

    const participants = await tournamentService.getParticipants(tId)
    expect(participants).toHaveLength(1)
    expect(participants[0].playerId).toBe(pId)
  })

  it('should start a tournament', async () => {
    const { id } = await tournamentService.createTournament({
      name: 'Tournament',
      startTime: new Date(),
      totalRounds: 3
    })

    await tournamentService.startTournament(id)

    const tournament = await tournamentService.getTournament(id)
    expect(tournament.status).toBe('active')
    expect(tournament.currentRound).toBe(1)
  })

  it('should update participant score', async () => {
    const { id: tId } = await tournamentService.createTournament({
      name: 'Tournament',
      startTime: new Date(),
      totalRounds: 3
    })

    const pId = 'p-1'
    await db.insert(players).values({ id: pId, name: 'Player 1', type: 'human', createdAt: new Date() })
    await tournamentService.registerParticipant(tId, pId)

    await tournamentService.updateParticipantScore(tId, pId, 10) // Win

    const [participant] = await tournamentService.getParticipants(tId)
    expect(participant.score).toBe(10)

    await tournamentService.updateParticipantScore(tId, pId, 5) // Draw
    const [updatedParticipant] = await tournamentService.getParticipants(tId)
    expect(updatedParticipant.score).toBe(15)
  })
})