import { GoogleGenerativeAI } from '@google/generative-ai'
import { LlmService } from './base-llm-player'

export class GeminiService implements LlmService {
  private genAI: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async generateMove(modelName: string, prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: modelName })
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  }
}
