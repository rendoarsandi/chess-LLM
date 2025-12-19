import { Chess } from 'chess.js'
import { Player } from './player.interface'

export class RandomPlayer implements Player {
  makeMove(fen: string): string | null {
    const chess = new Chess(fen)
    const moves = chess.moves()
    
    if (moves.length === 0) {
      return null
    }
    
    const randomIndex = Math.floor(Math.random() * moves.length)
    return moves[randomIndex]
  }
}
