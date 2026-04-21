import { describe, expect, it, vi } from 'vitest'
import { OpenRouterClient, OpenRouterService } from './openrouter.service'

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
