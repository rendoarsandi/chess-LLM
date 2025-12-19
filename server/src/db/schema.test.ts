import { describe, it, expect } from 'vitest'
import * as schema from './schema'

describe('Database Schema', () => {
  it('should have players table defined', () => {
    expect(schema.players).toBeDefined()
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
