import { Player } from './player.interface'
import { GeminiService } from './gemini.service'
import { Chess } from 'chess.js'

export class GeminiPlayer implements Player {
  private lastThinking: { opening?: string, candidates?: string, reasoning?: string } | null = null

  constructor(
    private geminiService: GeminiService,
    private modelName: string = 'gemini-3-flash-preview',
    private timeoutMs: number = 30000 // Default 30s timeout
  ) {}

  getLastThinking() {
    return this.lastThinking
  }

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

        const responsePromise = this.geminiService.generateMove(this.modelName, currentPrompt)
        
        const responseText = await Promise.race([
          responsePromise.then(res => {
            clearTimeout(timeoutId)
            return res
          }),
          timeoutPromise
        ])
        
        if (!responseText) {
          attempts++
          continue
        }

        // Parse JSON response
        let parsed: any
        try {
          // LLMs sometimes wrap JSON in code blocks
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          const cleanJson = jsonMatch ? jsonMatch[0] : responseText
          parsed = JSON.parse(cleanJson)
        } catch (e) {
          console.warn(`[GeminiPlayer] Failed to parse JSON response: ${responseText}`)
          currentPrompt = `Your previous response was not valid JSON. 
Please provide your response in the EXACT JSON format requested:
{
  "opening": "Opening Name",
  "candidates": ["move1", "move2", "move3"],
  "reasoning": "Brief explanation",
  "move": "final_move"
}`
          attempts++
          continue
        }

        const move = parsed.move

        // Validate move
        try {
          const validMove = chess.move(move)
          if (validMove) {
            this.lastThinking = {
              opening: parsed.opening,
              candidates: JSON.stringify(parsed.candidates),
              reasoning: parsed.reasoning
            }
            return move
          }
        } catch (e) {
          // Invalid move, prepare feedback prompt
          const legalMoves = chess.moves().join(', ')
          currentPrompt = `The move "${move}" was illegal. 
Please choose a move from the following legal moves: ${legalMoves}
Return your response in the EXACT JSON format requested.`
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

Analyze the position and provide your next move.
You MUST identify the current opening or variation based on the history and state.
You MUST evaluate at least 3 candidate moves.

Return your response in the following JSON format:
{
  "opening": "Full name of the opening/variation",
  "candidates": ["move1", "move2", "move3"],
  "reasoning": "Strategic reasoning for the chosen move",
  "move": "The final chosen move in Standard Algebraic Notation (SAN)"
}`
  }
}
