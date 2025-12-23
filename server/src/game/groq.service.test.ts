import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GroqService } from './groq.service'

describe('GroqService', () => {
  let groqService: GroqService

  beforeEach(() => {
    vi.clearAllMocks()
    groqService = new GroqService('test-api-key')
    // Mock global fetch
    global.fetch = vi.fn()
  })

  it('should be initialized with an API key', () => {
    expect(groqService).toBeDefined()
  })

  it('should generate a move using the model', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'e4'
          }
        }
      ]
    }

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    } as Response)

    const prompt = 'Play chess. Current state: FEN...'
    const move = await groqService.generateMove('llama-3.1-70b-versatile', prompt)

    expect(move).toBe('e4')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Authorization': 'Bearer test-api-key',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.1
        })
      })
    )
  })

  it('should throw an error if the API request fails', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized'
    } as Response)

    await expect(groqService.generateMove('model', 'prompt')).rejects.toThrow('Groq API error: Unauthorized')
  })
})
