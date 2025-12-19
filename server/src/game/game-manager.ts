import { Chess } from 'chess.js'
import { Player } from './player.interface'

export interface GameState {
  whitePlayerId: string
  blackPlayerId: string
  fen: string
  status: 'ongoing' | 'completed' | 'draw'
}

export class GameManager {
  private players: Map<string, Player> = new Map()

  setPlayer(playerId: string, player: Player) {
    this.players.set(playerId, player)
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId)
  }

  createNewGame(whitePlayerId: string, blackPlayerId: string): GameState {
    const chess = new Chess()
    return {
      whitePlayerId,
      blackPlayerId,
      fen: chess.fen(),
      status: 'ongoing',
    }
  }

  isValidMove(fen: string, move: string): boolean {
    try {
      const chess = new Chess(fen)
      const result = chess.move(move)
      return !!result
    } catch (e) {
      return false
    }
  }

  getNextState(fen: string, move: string): string {
    const chess = new Chess(fen)
    chess.move(move)
    return chess.fen()
  }

  isGameOver(fen: string): boolean {
    const chess = new Chess(fen)
    return chess.isGameOver()
  }

  getWinner(fen: string): 'white' | 'black' | 'draw' | null {
    const chess = new Chess(fen)
    if (!chess.isGameOver()) return null
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? 'black' : 'white'
    }
    return 'draw'
  }
}
