import { BaseLlmPlayer, LlmService } from './base-llm-player'

export class OpenRouterPlayer extends BaseLlmPlayer {
  constructor(llmService: LlmService, modelName: string, timeoutMs: number = 30000) {
    super(llmService, modelName, timeoutMs)
  }
}
