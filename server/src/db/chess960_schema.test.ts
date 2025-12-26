import { describe, it, expect } from 'vitest'
import * as schema from './schema'

describe('Chess 960 Schema Updates', () => {
  describe('Players Table', () => {
    it('should have rating960 and peakRating960 columns', () => {
      expect(schema.players.rating960).toBeDefined()
      expect(schema.players.peakRating960).toBeDefined()
    })
  })

  describe('Games Table', () => {
    it('should have variant and startPosId columns', () => {
      expect(schema.games.variant).toBeDefined()
      expect(schema.games.startPosId).toBeDefined()
    })
  })
})
