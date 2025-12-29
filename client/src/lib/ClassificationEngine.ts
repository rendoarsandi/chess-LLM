export type Classification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'miss'

export interface MoveContext {
  beforeEval: number
  bestMoveEval: number
  moveEval: number
  isBestMove: boolean
  isSacrifice?: boolean
  isBookMove?: boolean
}

export class ClassificationEngine {
  /**
   * Classifies a move based on Stockfish evaluations.
   * Logic is based on centipawn loss and win probability shifts.
   */
  static classify(context: MoveContext): Classification {
    if (context.isBookMove) return 'book'

    const { bestMoveEval, moveEval, isBestMove, isSacrifice } = context
    const cpLoss = Math.abs(bestMoveEval - moveEval)

    if (isBestMove) {
      if (isSacrifice && cpLoss <= 0.2) return 'brilliant'
      return 'best'
    }

    // Special handling for Mates (values > 90.0)
    const isBestMoveMate = Math.abs(bestMoveEval) > 90
    const isMoveMate = Math.abs(moveEval) > 90

    if (isBestMoveMate && !isMoveMate) {
      // You had a mate but lost it
      return 'blunder'
    }

    // Miss: When you had a winning advantage (>1.5) but played something that lost it (<0.6)
    if (bestMoveEval > 1.5 && moveEval < 0.6) {
      return 'miss'
    }
    if (bestMoveEval < -1.5 && moveEval > -0.6) {
      return 'miss'
    }

    if (cpLoss > 1.0) return 'blunder'
    if (cpLoss > 0.5) return 'mistake'
    if (cpLoss > 0.2) return 'inaccuracy'
    if (cpLoss < 0.05) return 'excellent'

    return 'good'
  }
}
