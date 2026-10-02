import { Chess } from 'chess.js'
import type { GameAdapter } from '../core/game'

function restore(pgn: string) {
  const chess = new Chess()
  if (pgn) chess.loadPgn(pgn)
  return chess
}

export const chessAdapter: GameAdapter = {
  id: 'chess',
  name: 'Chess',
  protocolVersion: 'chess-san-v1',
  seatNames: ['White', 'Black'],
  initialState: () => '',
  observe(state) {
    const chess = restore(state)
    const legalActions = chess.moves()
    const turn = chess.turn() === 'w' ? 0 : 1
    return {
      turn,
      legalActions,
      view: { kind: 'chess', fen: chess.fen() },
      prompt: `Play standard chess as ${turn === 0 ? 'White' : 'Black'}.\n\n${chess.ascii()}\n\nFEN: ${chess.fen()}\nPGN: ${state || '(starting position)'}\nLegal actions (SAN): ${legalActions.join(', ')}\n\nChoose exactly one legal action. Return only a JSON object: {"action":"SAN move","explanation":"brief explanation"}.`,
    }
  },
  apply(state, action) {
    const chess = restore(state)
    if (!chess.moves().includes(action)) throw new Error('Action is not in the legal SAN list.')
    chess.move(action)
    let result = null
    if (chess.isCheckmate()) {
      result = {
        scores: (chess.turn() === 'w' ? [0, 1] : [1, 0]) as [number, number],
        reason: 'checkmate',
      }
    } else if (chess.isGameOver()) {
      const reason = chess.isStalemate()
        ? 'stalemate'
        : chess.isThreefoldRepetition()
          ? 'threefold_repetition'
          : chess.isInsufficientMaterial()
            ? 'insufficient_material'
            : 'fifty_move_rule'
      result = { scores: [0.5, 0.5] as [number, number], reason }
    }
    return { state: chess.pgn(), result }
  },
}

export const games: Record<string, GameAdapter> = { chess: chessAdapter }
