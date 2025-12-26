import { Player } from './player.interface'
import { safeNewChess } from '../lib/chess-utils'
import { logger } from './logger'

export interface LlmService {
  generateMove(modelName: string, prompt: string): Promise<string>
}

interface LlmResponse {
  opening?: string;
  candidates?: string[];
  reasoning?: string;
  move: string;
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

  async makeMove(fen: string, history: string[] = [], variant: string = 'standard'): Promise<string | null> {
    const chess = safeNewChess(fen)
    const legalMoves = chess.moves()
    let currentPrompt = this.constructPrompt(fen, history, legalMoves, variant)
    let attempts = 0
    const maxRetries = 3

    while (attempts <= maxRetries) {
      try {
        let timeoutId: ReturnType<typeof setTimeout> | undefined
        const timeoutPromise = new Promise<null>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Timeout')), this.timeoutMs)
        })

        const responsePromise = this.llmService.generateMove(this.modelName, currentPrompt)
        
        const responseText = await Promise.race([
          responsePromise.then(res => {
            if (timeoutId) clearTimeout(timeoutId)
            return res
          }),
          timeoutPromise
        ])
        
        if (!responseText) {
          attempts++
          continue
        }

        // Parse JSON response
        let parsed: LlmResponse
        try {
          // LLMs sometimes wrap JSON in code blocks
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          const cleanJson = jsonMatch ? jsonMatch[0] : responseText
          parsed = JSON.parse(cleanJson)
        } catch {
          const sanitizedResponse = responseText.length > 500 
            ? responseText.substring(0, 500) + '... [TRUNCATED]' 
            : responseText
          logger.warn(`[${this.constructor.name}] Failed to parse JSON response: ${sanitizedResponse}`)
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
        } catch {
          // Invalid move, prepare feedback prompt
          const currentLegalMoves = chess.moves().join(', ')
          currentPrompt = `The move "${move}" was illegal. 
Please choose a move ONLY from the following legal moves: ${currentLegalMoves}
Return your response in the EXACT JSON format requested.`
          attempts++
        }
      } catch (e) {
        logger.error(`[${this.constructor.name}] Error generating move (attempt ${attempts + 1}):`, e)
        attempts++
      }
    }

    logger.error(`[${this.constructor.name}] Failed to generate a valid move after ${maxRetries + 1} attempts.`)
    return null
  }

  protected constructPrompt(fen: string, history: string[], legalMoves: string[], variant: string): string {
    const chess = safeNewChess(fen)
    const turn = chess.turn() === 'w' ? 'White' : 'Black'
    const asciiBoard = chess.ascii()
    
    const historyText = history.length > 0 
      ? `Move history (PGN): ${history.join(' ')}` 
      : 'No moves have been made yet.'
    
    const is960 = variant === 'chess960' || variant === '960';
    const variantNotice = is960 
      ? "\nNOTE: This is a Chess 960 (Fischer Random) game. The starting position is randomized. Standard opening theory may not apply. Focus on the current board state and piece coordination."
      : "";

    return `You are a professional chess player.${variantNotice}
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
