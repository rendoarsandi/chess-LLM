import { describe, it, expect, beforeEach } from 'vitest'
import { TournamentService } from './tournament.service'
import { players } from '../db/schema'
import { AppDatabase } from '../db/types'
import { createInMemoryDb } from '../db/test-utils'

describe('TournamentService', () => {
  let db: AppDatabase
  let tournamentService: TournamentService

  beforeEach(() => {
    const { db: testDb } = createInMemoryDb()
    db = testDb

    tournamentService = new TournamentService(db)
  })

  it('should create a tournament', async () => {
    const data = {
      name: 'Tilted Tuesday Mock',
      startTime: new Date(),
      totalRounds: 5,
      timeControlSettings: '3+2',
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
      totalRounds: 3,
    })

    const pId = 'p-1'
    await db
      .insert(players)
      .values({ id: pId, name: 'Player 1', type: 'human', createdAt: new Date() })

    await tournamentService.registerParticipant(tId, pId)

    const participants = await tournamentService.getParticipants(tId)
    expect(participants).toHaveLength(1)
    expect(participants[0].playerId).toBe(pId)
  })

  it('should start a tournament', async () => {
    const { id } = await tournamentService.createTournament({
      name: 'Tournament',
      startTime: new Date(),
      totalRounds: 3,
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
      totalRounds: 3,
    })

    const pId = 'p-1'
    await db
      .insert(players)
      .values({ id: pId, name: 'Player 1', type: 'human', createdAt: new Date() })
    await tournamentService.registerParticipant(tId, pId)

    await tournamentService.updateParticipantScore(tId, pId, 10) // Win

    const [participant] = await tournamentService.getParticipants(tId)
    expect(participant.score).toBe(10)

    await tournamentService.updateParticipantScore(tId, pId, 5) // Draw
    const [updatedParticipant] = await tournamentService.getParticipants(tId)
    expect(updatedParticipant.score).toBe(15)
  })
})
