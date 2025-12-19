import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiPlayer } from './gemini-player'
import { GeminiService } from './gemini.service'

// Mock GeminiService
vi.mock('./gemini.service', () => {
  return {
    GeminiService: class {
      constructor(apiKey: string) {}
      generateMove = vi.fn()
    }
  }
})

// Subclass for testing protected method
class TestGeminiPlayer extends GeminiPlayer {
  public testConstructPrompt(fen: string, history: string[]): string {
    return this.constructPrompt(fen, history)
  }
}

describe('GeminiPlayer', () => {
  let mockGeminiService: any
  let player: TestGeminiPlayer

  beforeEach(() => {
    mockGeminiService = new GeminiService('key')
    player = new TestGeminiPlayer(mockGeminiService)
  })

  it('should format a prompt with FEN and no history', () => {
    const fen = 'start-fen'
    const prompt = player.testConstructPrompt(fen, [])
    expect(prompt).toContain('Current board state (FEN): start-fen')
    expect(prompt).toContain('No moves have been made yet.')
  })

  it('should format a prompt with FEN and move history', () => {
    const fen = 'current-fen'
    const history = ['e4', 'e5', 'Nf3']
    const prompt = player.testConstructPrompt(fen, history)
    expect(prompt).toContain('Current board state (FEN): current-fen')
    expect(prompt).toContain('Move history (PGN): e4 e5 Nf3')
  })

  it('should call GeminiService and return a move from JSON', async () => {
    const jsonRes = JSON.stringify({
      move: 'e4',
      opening: 'King\'s Pawn Game',
      candidates: ['e4', 'd4', 'Nf3'],
      reasoning: 'Control center.'
    })
    mockGeminiService.generateMove.mockResolvedValue(jsonRes)
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, ['history'])
    expect(mockGeminiService.generateMove).toHaveBeenCalled()
    expect(move).toBe('e4')
  })

  it('should store thinking data after making a move', async () => {
    const thinkingRes = {
      move: 'e4',
      opening: 'King\'s Pawn Game',
      candidates: ['e4', 'd4', 'Nf3'],
      reasoning: 'Control center.'
    }
    mockGeminiService.generateMove.mockResolvedValue(JSON.stringify(thinkingRes))
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    await player.makeMove(startFen, [])
    
    expect(player.getLastThinking()).toEqual({
      opening: thinkingRes.opening,
      candidates: JSON.stringify(thinkingRes.candidates),
      reasoning: thinkingRes.reasoning
    })
  })

  it('should return null and log error if GeminiService fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGeminiService.generateMove.mockRejectedValue(new Error('API Error'))
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])
    expect(move).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('should retry if the model returns an invalid SAN move', async () => {
    // 1st call: invalid move, 2nd call: valid move
    mockGeminiService.generateMove
      .mockResolvedValueOnce(JSON.stringify({ move: 'not-a-move', opening: '?', reasoning: 'test', candidates: [] }))
      .mockResolvedValueOnce(JSON.stringify({ move: 'e4', opening: 'King\'s Pawn', reasoning: 'test', candidates: ['e4'] }))
    
    // We need a real board to validate moves
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])
    
    expect(mockGeminiService.generateMove).toHaveBeenCalledTimes(2)
    expect(move).toBe('e4')
  })

  it('should stop retrying after 3 attempts and return null', async () => {
    mockGeminiService.generateMove.mockResolvedValue(JSON.stringify({ move: 'invalid', opening: '?', reasoning: 'test', candidates: [] }))
    
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])
    
    expect(mockGeminiService.generateMove).toHaveBeenCalledTimes(4) // Initial + 3 retries
    expect(move).toBeNull()
  })

  it('should retry if Gemini returns an empty response', async () => {
    mockGeminiService.generateMove
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(JSON.stringify({ move: 'e4', opening: 'King\'s Pawn', reasoning: 'test', candidates: ['e4'] }))
    
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])
    
    expect(mockGeminiService.generateMove).toHaveBeenCalledTimes(2)
    expect(move).toBe('e4')
  })

  it('should timeout if GeminiService takes too long', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Create player with very short timeout (1ms) for testing
    const timeoutPlayer = new TestGeminiPlayer(mockGeminiService, 'model', 1)
    
    // Mock generateMove to resolve slowly (100ms)
    mockGeminiService.generateMove.mockReturnValue(new Promise(resolve => setTimeout(() => resolve('e4'), 100)))
    
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await timeoutPlayer.makeMove(startFen, [])
    
    expect(move).toBeNull()
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error generating move (attempt 1):'), expect.any(Error))
    
    consoleSpy.mockRestore()
  })
})
