import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroqPlayer } from './groq-player'
import { GroqService } from './groq.service'

// Mock GroqService
vi.mock('./groq.service', () => {
  return {
    GroqService: class {
      constructor() {}
      generateMove = vi.fn()
    }
  }
})

describe('GroqPlayer', () => {
  let mockGroqService: GroqService
  let player: GroqPlayer

  beforeEach(() => {
    mockGroqService = new GroqService('key')
    player = new GroqPlayer(mockGroqService, 'test-model')
  })

  it('should call GroqService and return a move from JSON', async () => {
    const jsonRes = JSON.stringify({
      move: 'e4',
      opening: 'King\'s Pawn Game',
      candidates: ['e4', 'd4', 'Nf3'],
      reasoning: 'Control center.'
    })
    mockGroqService.generateMove.mockResolvedValue(jsonRes)
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])
    expect(mockGroqService.generateMove).toHaveBeenCalledWith('test-model', expect.any(String))
    expect(move).toBe('e4')
  })

  it('should store thinking data after making a move', async () => {
    const thinkingRes = {
      move: 'e4',
      opening: 'King\'s Pawn Game',
      candidates: ['e4', 'd4', 'Nf3'],
      reasoning: 'Control center.'
    }
    mockGroqService.generateMove.mockResolvedValue(JSON.stringify(thinkingRes))
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    await player.makeMove(startFen, [])
    
    expect(player.getLastThinking()).toEqual({
      opening: thinkingRes.opening,
      candidates: JSON.stringify(thinkingRes.candidates),
      reasoning: thinkingRes.reasoning
    })
  })
})
