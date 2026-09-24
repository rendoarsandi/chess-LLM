import { describe, it, expect } from 'vitest'
import { generate960Fen, safeNewChess } from './chess-utils'

describe('Chess 960 Utils', () => {
  describe('generate960Fen', () => {
    it('should throw error for invalid SP-ID', () => {
      expect(() => generate960Fen(-1)).toThrow()
      expect(() => generate960Fen(960)).toThrow()
    })

    it('should generate the standard starting position for SP-ID 518', () => {
      const fen = generate960Fen(518)
      expect(fen.startsWith('rnbqkbnr/')).toBe(true)
      const chess = safeNewChess(fen)
      expect(chess.fen()).toBeDefined()
    })

    it('should generate valid boundary and sampled positions in chess engine', () => {
      const samples = [0, 100, 300, 518, 750, 959]
      for (const id of samples) {
        const fen = generate960Fen(id)
        const chess = safeNewChess(fen)
        expect(chess.fen(), `ID ${id} produced invalid FEN`).toBeDefined()
      }
    })

    it('should generate 960 unique and rule-compliant FENs', () => {
      const fens = new Set<string>()

      for (let i = 0; i < 960; i++) {
        const fen = generate960Fen(i)
        fens.add(fen)

        const firstRank = fen.split('/')[0]
        expect(firstRank.length).toBe(8)

        // Verify R-K-R order (King must be between Rooks for castling)
        const kingIdx = firstRank.indexOf('k')
        const firstRookIdx = firstRank.indexOf('r')
        const lastRookIdx = firstRank.lastIndexOf('r')
        expect(firstRookIdx).toBeLessThan(kingIdx)
        expect(kingIdx).toBeLessThan(lastRookIdx)

        // Verify opposite-colored bishops
        const b1 = firstRank.indexOf('b')
        const b2 = firstRank.lastIndexOf('b')
        expect((b1 % 2) !== (b2 % 2)).toBe(true)
      }

      expect(fens.size).toBe(960)
    })
  })
})
