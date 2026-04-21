import { LlmService } from './base-llm-player'

type GroqChatCompletion = {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class GroqService implements LlmService {
  private apiKey: string
  private apiUrl = 'https://api.groq.com/openai/v1/chat/completions'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateMove(modelName: string, prompt: string): Promise<string> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
      }),
    })

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.statusText}`)
    }

    const data = (await response.json()) as GroqChatCompletion
    return data.choices[0].message.content.trim()
  }
}
