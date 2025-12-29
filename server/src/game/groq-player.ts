import { BaseLlmPlayer, LlmService } from './base-llm-player'

export class GroqPlayer extends BaseLlmPlayer {
  constructor(llmService: LlmService, modelName: string, timeoutMs: number = 30000) {
    super(llmService, modelName, timeoutMs)
  }
}
