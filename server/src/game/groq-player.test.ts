import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroqPlayer } from './groq-player'
import { LlmService } from './base-llm-player'

describe('GroqPlayer', () => {
  let mockLlmService: LlmService
  let player: GroqPlayer

  beforeEach(() => {
    mockLlmService = {
      generateMove: vi.fn(),
    }
    player = new GroqPlayer(mockLlmService, 'test-model')
  })

  it('should call LlmService and return a move from JSON', async () => {
    const jsonRes = JSON.stringify({
      move: 'e4',
      opening: "King's Pawn Game",
      candidates: ['e4', 'd4', 'Nf3'],
      reasoning: 'Control center.',
    })
    vi.mocked(mockLlmService.generateMove).mockResolvedValue(jsonRes)
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])
    expect(mockLlmService.generateMove).toHaveBeenCalledWith('test-model', expect.any(String))
    expect(move).toBe('e4')
  })

  it('should store thinking data after making a move', async () => {
    const thinkingRes = {
      move: 'e4',
      opening: "King's Pawn Game",
      candidates: ['e4', 'd4', 'Nf3'],
      reasoning: 'Control center.',
    }
    vi.mocked(mockLlmService.generateMove).mockResolvedValue(JSON.stringify(thinkingRes))
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    await player.makeMove(startFen, [])

    expect(player.getLastThinking()).toEqual({
      opening: thinkingRes.opening,
      candidates: JSON.stringify(thinkingRes.candidates),
      reasoning: thinkingRes.reasoning,
    })
  })
})
