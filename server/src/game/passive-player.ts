import { Player } from './player.interface'

/**
 * A player that never makes a move on the server.
 * Used for players that are controlled by the client (e.g., Client-side Stockfish).
 */
export class PassivePlayer implements Player {
  async makeMove(): Promise<string | null> {
    return null
  }
}
