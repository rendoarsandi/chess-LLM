import { describe, it, expect } from 'vitest'
import { RandomPlayer } from './random-player'
import { Chess } from 'chess.js'

describe('RandomPlayer', () => {
  it('should return a legal move for a given FEN', () => {
    const player = new RandomPlayer()
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = player.makeMove(fen)
    
    const chess = new Chess(fen)
    const legalMoves = chess.moves()
    expect(legalMoves).toContain(move)
  })

  it('should return null if no legal moves are available (game over)', () => {
    const player = new RandomPlayer()
    const fen = '4k3/4P3/4K3/8/8/8/8/8 b - - 0 1' // Stalemate
    const move = player.makeMove(fen)
    expect(move).toBeNull()
  })
})
