import { BaseLlmPlayer, LlmService } from './base-llm-player'

export class GeminiPlayer extends BaseLlmPlayer {
  constructor(
    llmService: LlmService,
    modelName: string = 'gemini-3-flash-preview',
    timeoutMs: number = 30000 // Default 30s timeout
  ) {
    super(llmService, modelName, timeoutMs)
  }
}