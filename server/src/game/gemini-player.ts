import { GeminiService } from './gemini.service'
import { BaseLlmPlayer } from './base-llm-player'

export class GeminiPlayer extends BaseLlmPlayer {
  constructor(
    geminiService: GeminiService,
    modelName: string = 'gemini-3-flash-preview',
    timeoutMs: number = 30000 // Default 30s timeout
  ) {
    super(geminiService, modelName, timeoutMs)
  }
}