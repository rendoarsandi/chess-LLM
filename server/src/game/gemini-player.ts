import { Player } from './player.interface'
import { GeminiService } from './gemini.service'
import { Chess } from 'chess.js'

export class GeminiPlayer implements Player {
  constructor(
    private geminiService: GeminiService,
    private modelName: string = 'gemini-2.0-flash',
    private timeoutMs: number = 30000 // Default 30s timeout
  ) {}

  async makeMove(fen: string, history: string[] = []): Promise<string | null> {
    const chess = new Chess(fen)
    let currentPrompt = this.constructPrompt(fen, history)
    let attempts = 0
    const maxRetries = 3

    while (attempts <= maxRetries) {
      try {
        let timeoutId: any
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
        })

        const movePromise = this.geminiService.generateMove(this.modelName, currentPrompt)
        
        const move = await Promise.race([
          movePromise.then(res => {
            clearTimeout(timeoutId)
            return res
          }),
          timeoutPromise
        ])
        
        if (!move) {
          attempts++
          continue
        }

        // Validate move
        try {
          const validMove = chess.move(move)
          if (validMove) {
            return move
          }
        } catch (e) {
          // Invalid move, prepare feedback prompt
          const legalMoves = chess.moves().join(', ')
          currentPrompt = `The previous move "${move}" was illegal. 
Please provide a valid move from the following legal moves: ${legalMoves}
Return ONLY the move string in Standard Algebraic Notation (SAN).`
          attempts++
        }
      } catch (e) {
        console.error(`[GeminiPlayer] Error generating move (attempt ${attempts + 1}):`, e)
        attempts++
      }
    }

    console.error(`[GeminiPlayer] Failed to generate a valid move after ${maxRetries + 1} attempts.`)
    return null
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
