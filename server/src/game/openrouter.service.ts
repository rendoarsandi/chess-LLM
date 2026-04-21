import { OpenRouter } from '@openrouter/sdk'
import { LlmService } from './base-llm-player'

type OpenRouterContentPart = {
  type?: string
  text?: string
}

type OpenRouterChatResponse = {
  choices: Array<{
    message: {
      content?: string | OpenRouterContentPart[] | null
    }
  }>
}

type OpenRouterChatRequest = {
  httpReferer?: string
  appTitle?: string
  appCategories?: string
  chatRequest: {
    model: string
    messages: Array<{ role: 'user'; content: string }>
    temperature: number
    stream: false
  }
}

export type OpenRouterClient = {
  chat: {
    send(request: OpenRouterChatRequest): Promise<OpenRouterChatResponse>
  }
}

export type OpenRouterServiceOptions = {
  httpReferer?: string
  appTitle?: string
  appCategories?: string
  client?: OpenRouterClient
}

export class OpenRouterService implements LlmService {
  private client: OpenRouterClient
  private httpReferer?: string
  private appTitle?: string
  private appCategories?: string

  constructor(apiKey: string, options: OpenRouterServiceOptions = {}) {
    this.client =
      options.client ??
      (new OpenRouter({
        apiKey,
        httpReferer: options.httpReferer || process.env.OPENROUTER_HTTP_REFERER,
        appTitle: options.appTitle || process.env.OPENROUTER_APP_TITLE || 'ChessLLM Arena',
        appCategories: options.appCategories || 'benchmark,chess,arena',
      }) as unknown as OpenRouterClient)
    this.httpReferer = options.httpReferer || process.env.OPENROUTER_HTTP_REFERER
    this.appTitle = options.appTitle || process.env.OPENROUTER_APP_TITLE || 'ChessLLM Arena'
    this.appCategories = options.appCategories || 'benchmark,chess,arena'
  }

  async generateMove(modelName: string, prompt: string): Promise<string> {
    const response = await this.client.chat.send({
      httpReferer: this.httpReferer,
      appTitle: this.appTitle,
      appCategories: this.appCategories,
      chatRequest: {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        stream: false,
      },
    })

    const content = response.choices[0]?.message.content
    if (typeof content === 'string') return content.trim()

    if (Array.isArray(content)) {
      const text = content
        .map((part) => (part.type === 'text' || part.text ? part.text || '' : ''))
        .join('')
        .trim()
      if (text) return text
    }

    throw new Error('OpenRouter response did not include text content')
  }
}
