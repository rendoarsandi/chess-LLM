import { GroqService } from './groq.service'
import { BaseLlmPlayer } from './base-llm-player'

export class GroqPlayer extends BaseLlmPlayer {
  constructor(
    groqService: GroqService,
    modelName: string,
    timeoutMs: number = 30000
  ) {
    super(groqService, modelName, timeoutMs)
  }
}
