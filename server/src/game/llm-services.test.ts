import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiService } from './gemini.service'
import { GroqService } from './groq.service'
import { OpenRouterClient, OpenRouterService } from './openrouter.service'

// Mock the Google Generative AI SDK
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'e4',
          },
        }),
      })
    },
  }
})

describe('LLM Provider Services', () => {
  describe('GeminiService', () => {
    let geminiService: GeminiService

    beforeEach(() => {
      vi.clearAllMocks()
      geminiService = new GeminiService('test-api-key')
    })

    it('should generate a move using the model', async () => {
      const prompt = 'Play chess. Current state: FEN...'
      const move = await geminiService.generateMove('gemini-2.0-flash', prompt)
      expect(move).toBe('e4')
    })
  })

  describe('GroqService', () => {
    let groqService: GroqService

    beforeEach(() => {
      vi.clearAllMocks()
      groqService = new GroqService('test-api-key')
      global.fetch = vi.fn()
    })

    it('should generate a move using the model', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'e4' } }],
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response)

      const prompt = 'Play chess. Current state: FEN...'
      const move = await groqService.generateMove('llama-3.1-70b-versatile', prompt)

      expect(move).toBe('e4')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        }),
      )
    })

    it('should throw an error if the API request fails', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        statusText: 'Unauthorized',
      } as Response)

      await expect(groqService.generateMove('model', 'prompt')).rejects.toThrow(
        'Groq API error: Unauthorized',
      )
    })
  })

  describe('OpenRouterService', () => {
    it('generates a move with the official chat SDK shape', async () => {
      const send = vi.fn().mockResolvedValue({
        choices: [{ message: { content: ' {"move":"e4"} ' } }],
      })
      const client: OpenRouterClient = { chat: { send } }
      const service = new OpenRouterService('test-key', { client })

      const result = await service.generateMove('openai/gpt-5', 'play chess')

      expect(result).toBe('{"move":"e4"}')
      expect(send).toHaveBeenCalledWith({
        httpReferer: undefined,
        appTitle: 'ChessLLM Arena',
        appCategories: 'benchmark,chess,arena',
        chatRequest: {
          model: 'openai/gpt-5',
          messages: [{ role: 'user', content: 'play chess' }],
          temperature: 0.1,
          stream: false,
        },
      })
    })

    it('extracts text from content parts', async () => {
      const client: OpenRouterClient = {
        chat: {
          send: vi.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: [
                    { type: 'text', text: '{"move":' },
                    { type: 'text', text: '"Nf3"}' },
                  ],
                },
              },
            ],
          }),
        },
      }
      const service = new OpenRouterService('test-key', { client })

      await expect(service.generateMove('anthropic/claude-sonnet-4.5', 'play')).resolves.toBe(
        '{"move":"Nf3"}',
      )
    })

    it('throws when no text content is returned', async () => {
      const client: OpenRouterClient = {
        chat: { send: vi.fn().mockResolvedValue({ choices: [{ message: { content: null } }] }) },
      }
      const service = new OpenRouterService('test-key', { client })

      await expect(service.generateMove('openai/gpt-5', 'play')).rejects.toThrow(
        'OpenRouter response did not include text content',
      )
    })
  })
})
