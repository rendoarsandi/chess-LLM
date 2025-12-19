import { Player } from './player.interface'
import { GeminiService } from './gemini.service'

export class GeminiPlayer implements Player {
  constructor(
    private geminiService: GeminiService,
    private modelName: string = 'gemini-2.0-flash'
  ) {}

  async makeMove(fen: string, history: string[] = []): Promise<string | null> {
    const prompt = this.constructPrompt(fen, history)
    try {
      const move = await this.geminiService.generateMove(this.modelName, prompt)
      return move || null
    } catch (e) {
      console.error(`[GeminiPlayer] Error generating move:`, e)
      return null
    }
  }

  protected constructPrompt(fen: string, history: string[]): string {
    const historyText = history.length > 0 
      ? `Move history (PGN): ${history.join(' ')}` 
      : 'No moves have been made yet.'
    
    return `You are a professional chess player.
Current board state (FEN): ${fen}
${historyText}

Please provide your next move in Standard Algebraic Notation (SAN). Return ONLY the move string (e.g., "e4", "Nf3", "O-O").`
  }
}
