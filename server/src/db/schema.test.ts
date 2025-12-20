import { describe, it, expect } from 'vitest'
import * as schema from './schema'

describe('Database Schema', () => {
  it('should have players table defined with ELO, stats, and profile columns', () => {
    expect(schema.players).toBeDefined()
    expect(schema.players.rating).toBeDefined()
    expect(schema.players.wins).toBeDefined()
    expect(schema.players.losses).toBeDefined()
    expect(schema.players.draws).toBeDefined()
    expect(schema.players.peakRating).toBeDefined()
    expect(schema.players.version).toBeDefined()
    expect(schema.players.provider).toBeDefined()
    expect(schema.players.bio).toBeDefined()
  })

  it('should have ratingHistory table defined', () => {
    expect(schema.ratingHistory).toBeDefined()
    expect(schema.ratingHistory.playerId).toBeDefined()
    expect(schema.ratingHistory.rating).toBeDefined()
  })

  it('should have games table defined', () => {
    expect(schema.games).toBeDefined()
  })

  it('should have moves table defined with thinking columns', () => {
    expect(schema.moves).toBeDefined()
    expect(schema.moves.opening).toBeDefined()
    expect(schema.moves.candidates).toBeDefined()
    expect(schema.moves.reasoning).toBeDefined()
  })
})
