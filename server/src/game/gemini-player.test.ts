import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiPlayer } from './gemini-player'
import { logger } from './logger'
import { LlmService } from './base-llm-player'

// Subclass for testing protected method
class TestGeminiPlayer extends GeminiPlayer {
  public testConstructPrompt(
    fen: string,
    history: string[],
    legalMoves: string[],
    variant: string = 'standard',
  ): string {
    return this.constructPrompt(fen, history, legalMoves, variant)
  }
}

describe('GeminiPlayer', () => {
  let mockLlmService: LlmService
  let player: TestGeminiPlayer

  beforeEach(() => {
    mockLlmService = {
      generateMove: vi.fn(),
    }
    player = new TestGeminiPlayer(mockLlmService)
  })

  it('should format a prompt with FEN and no history', () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const legalMoves = ['e4', 'd4']
    const prompt = player.testConstructPrompt(startFen, [], legalMoves)
    expect(prompt).toContain(
      'Current FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    )
    expect(prompt).toContain('No moves have been made yet.')
    expect(prompt).toContain('LEGAL MOVES for White: e4, d4')
    expect(prompt).toContain('You are playing as White')
    expect(prompt).toContain('a  b  c  d  e  f  g  h') // Part of ASCII board
  })

  it('should format a prompt with FEN and move history', () => {
    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    const history = ['e4', 'e5']
    const legalMoves = ['Nf3', 'Nc3']
    const prompt = player.testConstructPrompt(fen, history, legalMoves)
    expect(prompt).toContain(
      'Current FEN: rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    )
    expect(prompt).toContain('Move history (PGN): e4 e5')
    expect(prompt).toContain('LEGAL MOVES for White: Nf3, Nc3')
    expect(prompt).toContain('You are playing as White')
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
    const move = await player.makeMove(startFen, ['history'])
    expect(mockLlmService.generateMove).toHaveBeenCalled()
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

  it('should return null and log error if LlmService fails', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})
    vi.mocked(mockLlmService.generateMove).mockRejectedValue(new Error('API Error'))
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])
    expect(move).toBeNull()
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('should retry if the model returns an invalid SAN move', async () => {
    // 1st call: invalid move, 2nd call: valid move
    vi.mocked(mockLlmService.generateMove)
      .mockResolvedValueOnce(
        JSON.stringify({ move: 'not-a-move', opening: '?', reasoning: 'test', candidates: [] }),
      )
      .mockResolvedValueOnce(
        JSON.stringify({
          move: 'e4',
          opening: "King's Pawn",
          reasoning: 'test',
          candidates: ['e4'],
        }),
      )

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])

    expect(mockLlmService.generateMove).toHaveBeenCalledTimes(2)
    expect(move).toBe('e4')
  })

  it('should stop retrying after 3 attempts and return null', async () => {
    vi.mocked(mockLlmService.generateMove).mockResolvedValue(
      JSON.stringify({ move: 'invalid', opening: '?', reasoning: 'test', candidates: [] }),
    )

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])

    expect(mockLlmService.generateMove).toHaveBeenCalledTimes(4) // Initial + 3 retries
    expect(move).toBeNull()
  })

  it('should retry if Gemini returns an empty response', async () => {
    vi.mocked(mockLlmService.generateMove)
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce(
        JSON.stringify({
          move: 'e4',
          opening: "King's Pawn",
          reasoning: 'test',
          candidates: ['e4'],
        }),
      )

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await player.makeMove(startFen, [])

    expect(mockLlmService.generateMove).toHaveBeenCalledTimes(2)
    expect(move).toBe('e4')
  })

  it('should timeout if LlmService takes too long', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {})

    // Create player with very short timeout (1ms) for testing
    const timeoutPlayer = new TestGeminiPlayer(mockLlmService, 'model', 1)

    // Mock generateMove to resolve slowly (100ms)
    vi.mocked(mockLlmService.generateMove).mockReturnValue(
      new Promise((resolve) => setTimeout(() => resolve('e4'), 100)),
    )

    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const move = await timeoutPlayer.makeMove(startFen, [])

    expect(move).toBeNull()
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error generating move (attempt 1):'),
      expect.anything(),
    )

    errorSpy.mockRestore()
  })
})
