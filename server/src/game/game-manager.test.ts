import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameManager } from './game-manager'
import { Chess } from 'chess.js'

describe('GameManager', () => {
  let gm: GameManager

  beforeEach(() => {
    gm = new GameManager()
  })

  it('should create a new game state', () => {
    const game = gm.createNewGame('p1', 'p2')
    expect(game.fen).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    expect(game.whitePlayerId).toBe('p1')
    expect(game.blackPlayerId).toBe('p2')
    expect(game.status).toBe('ongoing')
  })

  it('should validate a legal move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(gm.isValidMove(fen, 'e4')).toBe(true)
  })

  it('should invalidate an illegal move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    expect(gm.isValidMove(fen, 'e5')).toBe(false)
  })

  it('should update FEN after a move', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const nextFen = gm.getNextState(fen, 'e4')
    const chess = new Chess(fen)
    chess.move('e4')
    expect(nextFen).toBe(chess.fen())
  })

  it('should detect game over (checkmate)', () => {
    // Fool's mate: 1. f3 e5 2. g4 Qh4#
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2'
    const checkmateFen = gm.getNextState(fen, 'Qh4#')
    const chess = new Chess(checkmateFen)
    expect(chess.isCheckmate()).toBe(true)
    expect(gm.isGameOver(checkmateFen)).toBe(true)
  })
})
