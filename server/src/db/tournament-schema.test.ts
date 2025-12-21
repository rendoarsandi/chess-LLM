import { describe, it, expect } from 'vitest'
import * as schema from './schema'

describe('Tournament Database Schema', () => {
  it('should have tournaments table defined with expected columns', () => {
    expect(schema.tournaments).toBeDefined()
    expect(schema.tournaments.id).toBeDefined()
    expect(schema.tournaments.name).toBeDefined()
    expect(schema.tournaments.status).toBeDefined()
    expect(schema.tournaments.startTime).toBeDefined()
    expect(schema.tournaments.timeControlSettings).toBeDefined()
    expect(schema.tournaments.currentRound).toBeDefined()
    expect(schema.tournaments.totalRounds).toBeDefined()
    expect(schema.tournaments.createdAt).toBeDefined()
  })

  it('should have tournamentParticipants table defined with expected columns', () => {
    expect(schema.tournamentParticipants).toBeDefined()
    expect(schema.tournamentParticipants.tournamentId).toBeDefined()
    expect(schema.tournamentParticipants.playerId).toBeDefined()
    expect(schema.tournamentParticipants.score).toBeDefined()
    expect(schema.tournamentParticipants.buchholz).toBeDefined()
    expect(schema.tournamentParticipants.joinedAt).toBeDefined()
  })

  it('should have games table updated with tournament columns', () => {
    expect(schema.games).toBeDefined()
    expect(schema.games.tournamentId).toBeDefined()
    expect(schema.games.roundNumber).toBeDefined()
  })
})
