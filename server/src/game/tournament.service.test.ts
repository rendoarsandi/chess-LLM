import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TournamentService } from './tournament.service'
import { tournaments, tournamentParticipants, players } from '../db/schema'

describe('TournamentService', () => {
  let db: any
  let tournamentService: TournamentService

  beforeEach(() => {
    db = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
    }
    tournamentService = new TournamentService(db)
  })

  it('should create a tournament', async () => {
    db.insert.mockReturnThis()
    db.values.mockResolvedValue(undefined)

    const tournament = await tournamentService.createTournament({
      name: 'Tilted Tuesday Mock',
      startTime: new Date(),
      totalRounds: 5,
      timeControlSettings: '3+2'
    })

    expect(tournament.id).toBeDefined()
    expect(db.insert).toHaveBeenCalledWith(tournaments)
  })

  it('should register a participant', async () => {
    db.insert.mockReturnThis()
    db.values.mockResolvedValue(undefined)

    await tournamentService.registerParticipant('t-id', 'p-id')

    expect(db.insert).toHaveBeenCalledWith(tournamentParticipants)
    expect(db.values).toHaveBeenCalledWith(expect.objectContaining({
      tournamentId: 't-id',
      playerId: 'p-id'
    }))
  })

  it('should start a tournament', async () => {
    db.update.mockReturnThis()
    db.set.mockReturnThis()
    db.where.mockResolvedValue(undefined)

    await tournamentService.startTournament('t-id')

    expect(db.update).toHaveBeenCalledWith(tournaments)
    expect(db.set).toHaveBeenCalledWith(expect.objectContaining({
      status: 'active'
    }))
  })

  it('should get a tournament', async () => {
    db.select.mockReturnThis()
    db.from.mockReturnThis()
    db.where.mockResolvedValue([{ id: 't-id', name: 'Test' }])

    const tournament = await tournamentService.getTournament('t-id')

    expect(tournament.id).toBe('t-id')
    expect(db.select).toHaveBeenCalled()
  })

  it('should get participants', async () => {
    db.select.mockReturnThis()
    db.from.mockReturnThis()
    db.where.mockResolvedValue([{ playerId: 'p-1' }, { playerId: 'p-2' }])

    const participants = await tournamentService.getParticipants('t-id')

    expect(participants).toHaveLength(2)
    expect(db.select).toHaveBeenCalled()
  })
})
