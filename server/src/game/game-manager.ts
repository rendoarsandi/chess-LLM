import { Player } from './player.interface'
import { generate960Fen, safeNewChess } from '../lib/chess-utils'

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

  createNewGame(
    whitePlayerId: string,
    blackPlayerId: string,
    options?: { variant?: string; startPosId?: number },
  ): GameState {
    let fen = ''
    if (
      (options?.variant === '960' || options?.variant === 'chess960') &&
      options.startPosId !== undefined
    ) {
      fen = generate960Fen(options.startPosId)
    } else {
      const chess = safeNewChess()
      fen = chess.fen()
    }

    return {
      whitePlayerId,
      blackPlayerId,
      fen,
      status: 'ongoing',
    }
  }

  isValidMove(fen: string, move: string): boolean {
    try {
      const chess = safeNewChess(fen)
      const result = chess.move(move)
      return !!result
    } catch {
      return false
    }
  }

  getNextState(fen: string, move: string): string {
    const chess = safeNewChess(fen)
    chess.move(move)
    return chess.fen()
  }

  isGameOver(fen: string): boolean {
    const chess = safeNewChess(fen)
    return chess.isGameOver()
  }

  getWinner(fen: string): 'white' | 'black' | 'draw' | null {
    const chess = safeNewChess(fen)
    if (!chess.isGameOver()) return null
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? 'black' : 'white'
    }
    return 'draw'
  }
}
