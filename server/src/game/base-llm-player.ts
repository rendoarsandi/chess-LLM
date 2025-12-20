import { Player } from './player.interface'
import { Chess } from 'chess.js'

export interface LlmService {
  generateMove(modelName: string, prompt: string): Promise<string>
}

export abstract class BaseLlmPlayer implements Player {
  protected lastThinking: { opening?: string, candidates?: string, reasoning?: string } | null = null

  constructor(
    protected llmService: LlmService,
    protected modelName: string,
    protected timeoutMs: number = 30000
  ) {}

  getLastThinking() {
    return this.lastThinking
  }

  async makeMove(fen: string, history: string[] = []): Promise<string | null> {
    const chess = new Chess(fen)
    const legalMoves = chess.moves()
    let currentPrompt = this.constructPrompt(fen, history, legalMoves)
    let attempts = 0
    const maxRetries = 3

    while (attempts <= maxRetries) {
      try {
        let timeoutId: any
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
        })

        const responsePromise = this.llmService.generateMove(this.modelName, currentPrompt)
        
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
          console.warn(`[${this.constructor.name}] Failed to parse JSON response: ${responseText}`)
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
          throw new Error('Invalid move')
        } catch (e) {
          // Invalid move, prepare feedback prompt
          const currentLegalMoves = chess.moves().join(', ')
          currentPrompt = `The move "${move}" was illegal. 
Please choose a move ONLY from the following legal moves: ${currentLegalMoves}
Return your response in the EXACT JSON format requested.`
          attempts++
        }
      } catch (e) {
        console.error(`[${this.constructor.name}] Error generating move (attempt ${attempts + 1}):`, e)
        attempts++
      }
    }

    console.error(`[${this.constructor.name}] Failed to generate a valid move after ${maxRetries + 1} attempts.`)
    return null
  }

  protected constructPrompt(fen: string, history: string[], legalMoves: string[]): string {
    const chess = new Chess(fen)
    const turn = chess.turn() === 'w' ? 'White' : 'Black'
    const asciiBoard = chess.ascii()
    
    const historyText = history.length > 0 
      ? `Move history (PGN): ${history.join(' ')}` 
      : 'No moves have been made yet.'
    
    return `You are a professional chess player.
You are playing as ${turn}.

Current board state:
${asciiBoard}

Current FEN: ${fen}
${historyText}

LEGAL MOVES for ${turn}: ${legalMoves.join(', ')}

Analyze the position and provide your next move.
1. Identify the current opening, variation, or mid-game structure.
2. Evaluate at least 3 candidate moves from the LEGAL MOVES list.
3. You MUST choose a "move" that is EXACTLY as written in the LEGAL MOVES list.

Return your response in the following JSON format:
{
  "opening": "Opening name or mid-game description",
  "candidates": ["move1", "move2", "move3"],
  "reasoning": "Strategic reasoning for the chosen move",
  "move": "The chosen move (MUST be from the legal moves list)"
}`
  }
}
