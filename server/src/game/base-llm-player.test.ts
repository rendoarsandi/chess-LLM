import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BaseLlmPlayer, LlmService } from './base-llm-player'

// Mock implementation for testing
class MockLlmService implements LlmService {
  generateMove = vi.fn()
}

class TestLlmPlayer extends BaseLlmPlayer {
  constructor(service: LlmService, model: string = 'test-model', timeout: number = 30000) {
    super(service, model, timeout)
  }

  // Expose protected method for testing
  public testConstructPrompt(fen: string, history: string[], legalMoves: string[], variant: string = 'standard'): string {
    return this.constructPrompt(fen, history, legalMoves, variant)
  }
}

describe('BaseLlmPlayer', () => {
  let mockService: MockLlmService
  let player: TestLlmPlayer

  beforeEach(() => {
    mockService = new MockLlmService()
    player = new TestLlmPlayer(mockService)
  })

  it('should format a prompt correctly', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const prompt = player.testConstructPrompt(fen, [], ['e4', 'd4'])
    expect(prompt).toContain('Current FEN: ' + fen)
    expect(prompt).toContain('LEGAL MOVES for White: e4, d4')
  })

  it('should include a notice for Chess 960 variant', () => {
    const fen = 'bbqnnrkr/pppppppp/8/8/8/8/PPPPPPPP/BBQNNRKR w KQkq - 0 1'
    const prompt = player.testConstructPrompt(fen, [], ['Na3', 'Nc3'], 'chess960')
    expect(prompt).toContain('NOTE: This is a Chess 960 (Fischer Random) game')
    expect(prompt).toContain('Standard opening theory may not apply')
  })

  it('should handle successful JSON response', async () => {
    const response = {
      move: 'e4',
      opening: 'King\'s Pawn',
      candidates: ['e4', 'd4'],
      reasoning: 'Control center'
    }
    mockService.generateMove.mockResolvedValue(JSON.stringify(response))
    
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(fen)
    
    expect(move).toBe('e4')
    expect(player.getLastThinking()).toEqual({
      opening: response.opening,
      candidates: JSON.stringify(response.candidates),
      reasoning: response.reasoning
    })
  })

  it('should retry on invalid JSON', async () => {
    mockService.generateMove
      .mockResolvedValueOnce('Invalid JSON')
      .mockResolvedValueOnce(JSON.stringify({ move: 'e4', opening: 'test', candidates: [], reasoning: 'test' }))
    
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(fen)
    
    expect(move).toBe('e4')
    expect(mockService.generateMove).toHaveBeenCalledTimes(2)
    // Second call should have feedback in prompt
    expect(mockService.generateMove.mock.calls[1][1]).toContain('Your previous response was not valid JSON')
  })

  it('should retry on illegal move', async () => {
    mockService.generateMove
      .mockResolvedValueOnce(JSON.stringify({ move: 'e5', opening: 'illegal', candidates: [], reasoning: 'test' }))
      .mockResolvedValueOnce(JSON.stringify({ move: 'e4', opening: 'legal', candidates: [], reasoning: 'test' }))
    
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(fen)
    
    expect(move).toBe('e4')
    expect(mockService.generateMove).toHaveBeenCalledTimes(2)
    // Second call should have feedback about illegal move
    expect(mockService.generateMove.mock.calls[1][1]).toContain('The move "e5" was illegal')
  })

  it('should handle timeout', async () => {
    const slowPlayer = new TestLlmPlayer(mockService, 'test', 1)
    mockService.generateMove.mockReturnValue(new Promise(resolve => setTimeout(() => resolve('e4'), 50)))
    
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await slowPlayer.makeMove(fen)
    
    expect(move).toBeNull()
  })
})
