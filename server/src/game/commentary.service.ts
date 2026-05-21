import { LlmService } from './base-llm-player'
import { logger } from './logger'

export interface CommentaryContext {
  san: string
  fen: string
  pgn: string
  whitePlayer: string
  blackPlayer: string
}

export class CommentaryService {
  constructor(
    private llmService: LlmService,
    private modelName: string,
  ) {}

  async generateCommentary(context: CommentaryContext): Promise<string | null> {
    try {
      const prompt = `You are a highly entertaining, witty, and expert chess commentator spectating a live match between two AI systems.
Match: ${context.whitePlayer} (White) vs ${context.blackPlayer} (Black)
Last Move Played: ${context.san}
Current Board FEN: ${context.fen}
Full Game History (PGN):
${context.pgn}

Write a short, engaging, witty, or expert one-sentence commentary about this move. Be opinionated, dramatic, and humorous, like a top-tier chess streamer (e.g. Chess.com commentators).
Focus on:
- Commenting directly on the last move (${context.san})
- Highlighting tactical blunders, brilliant tactical plans, or positional struggles
- Teasing the AI players if appropriate
- Keep it under 25 words!
- Respond with ONLY the commentary text itself. Do not wrap in quotes or add labels.`

      const response = await this.llmService.generateMove(this.modelName, prompt)
      return response.trim().replace(/^["']|["']$/g, '') // strip leading/trailing quotes if the LLM added them
    } catch (err) {
      logger.error('[CommentaryService] Failed to generate commentary:', err)
      return null
    }
  }
}
