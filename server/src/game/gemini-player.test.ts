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

  it('should call GeminiService and return a move', async () => {
    mockGeminiService.generateMove.mockResolvedValue('e4')
    const move = await player.makeMove('fen', ['history'])
    expect(mockGeminiService.generateMove).toHaveBeenCalled()
    expect(move).toBe('e4')
  })

  it('should return null and log error if GeminiService fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockGeminiService.generateMove.mockRejectedValue(new Error('API Error'))
    const move = await player.makeMove('fen', [])
    expect(move).toBeNull()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
