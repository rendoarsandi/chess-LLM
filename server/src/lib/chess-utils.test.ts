import { describe, it, expect } from 'vitest'
import { generate960Fen } from './chess-utils'
import { Chess } from 'chess.js'

describe('Chess 960 Utils', () => {
  describe('generate960Fen', () => {
    it('should throw error for invalid SP-ID', () => {
      expect(() => generate960Fen(-1)).toThrow()
      expect(() => generate960Fen(960)).toThrow()
    })

    it('should generate the standard starting position for SP-ID 518', () => {
      const fen = generate960Fen(518)
      // Standard: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
      expect(fen.startsWith('rnbqkbnr/')).toBe(true)
    })

    it('should generate valid and unique FENs for all 960 positions', () => {
      const fens = new Set<string>()
      
      for (let i = 0; i < 960; i++) {
        const fen = generate960Fen(i)
        
        // 1. Check uniqueness
        expect(fens.has(fen), `ID ${i} generated a duplicate FEN`).toBe(false)
        fens.add(fen)

        // 2. Check structural validity with chess.js
        const chess = new Chess(fen)
        expect(chess.fen(), `ID ${i} produced an invalid FEN for chess.js`).toBeDefined()
        
        // 3. Verify piece count (8 pieces in first rank)
        const firstRank = fen.split('/')[0]
        expect(firstRank.length).toBe(8)
        
        // 4. Verify R-K-R order (King must be between Rooks for castling)
        const kingIdx = firstRank.indexOf('k')
        const firstRookIdx = firstRank.indexOf('r')
        const lastRookIdx = firstRank.lastIndexOf('r')
        expect(firstRookIdx).toBeLessThan(kingIdx)
        expect(kingIdx).toBeLessThan(lastRookIdx)
      }
      
      expect(fens.size).toBe(960)
    })
  })
})