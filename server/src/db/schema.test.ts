import { describe, it, expect } from 'vitest'
import * as schema from './schema'

describe('Database Schema', () => {
  it('should have players table defined', () => {
    expect(schema.players).toBeDefined()
  })

  it('should have games table defined', () => {
    expect(schema.games).toBeDefined()
  })

  it('should have moves table defined', () => {
    expect(schema.moves).toBeDefined()
  })
})
