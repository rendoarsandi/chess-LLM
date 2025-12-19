import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiService } from './gemini.service'

// Mock the Google Generative AI SDK
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor(apiKey: string) {}
      getGenerativeModel = vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'e4'
          }
        })
      })
    }
  }
})

describe('GeminiService', () => {
  let geminiService: GeminiService

  beforeEach(() => {
    vi.clearAllMocks()
    geminiService = new GeminiService('test-api-key')
  })

  it('should be initialized with an API key', () => {
    expect(geminiService).toBeDefined()
  })

  it('should generate a move using the model', async () => {
    const prompt = 'Play chess. Current state: FEN...'
    const move = await geminiService.generateMove('gemini-2.0-flash', prompt)
    expect(move).toBe('e4')
  })
})
